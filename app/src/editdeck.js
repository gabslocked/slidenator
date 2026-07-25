import { aiJSON, mapLimit } from './agents.js';
import { assemble } from './assemble.js';
import { validateDeck } from './validate.js';
import { CATALOG_PROMPT, validateSpec, renderSlide } from './slidekit/index.js';
import { SPEC_FILL_SCHEMA } from './prompts.js';

const EDIT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'changes'],
  properties: {
    summary: { type: 'string', description: 'Resumo em pt-BR do que foi alterado' },
    changes: {
      type: 'array',
      description: 'APENAS os slides alterados ou adicionados',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['index', 'spec'],
        properties: {
          index: { type: 'integer', description: 'Índice do slide alterado (0-based). Para ADICIONAR um slide novo ao final, use o índice seguinte ao último.' },
          spec: SPEC_FILL_SCHEMA,
        },
      },
    },
  },
};

/** System do spec-edit: regras de edição + catálogo do slidekit injetado. */
function editorSystem(catalogPrompt) {
  return `Você é o EDITOR de decks já gerados. Recebe os SPECS atuais de todos os slides (JSON do contrato §2) e uma instrução de mudança do usuário. Devolve APENAS os slides que mudaram, cada um como um SPEC completo (não HTML).

Regras:
- Altere o MENOR número de slides possível. Slides não citados em \`changes\` ficam intocados.
- Cada item de \`changes\` tem o índice (0-based) e o SPEC completo e revisado daquele slide.
- Mantenha a composição, os componentes e o tema existentes ao editar — mexa só no que a instrução pede.
- Respeite a grade 12×12 (area = [col, row, colSpan, rowSpan] 1-based, sem sobreposição fora de layer "bg"), o máximo de ~6 componentes por slide, ícones da lista e textos curtos que cabem na área.
- Se a instrução pedir um slide NOVO, crie-o no padrão dos demais e use o índice seguinte ao último.
- Se a instrução for ambígua, aplique a interpretação mais provável e explique no \`summary\`.
- Nunca cite ferramentas ou modelos no conteúdo dos slides.

${catalogPrompt}`;
}

/**
 * Edita um deck existente conforme instruções do usuário (spec-edit).
 * deck: { title, outline, slides:[{spec}], brand }
 * Retorna { slides:[{spec,html,js}], html, summary }.
 */
export async function runEditPipeline({ deck, instructions, brandKit, onOutline, onSlide }, emit) {
  const kit = brandKit || {};
  const ctxBase = { brand: { name: kit.name, logoDataUri: kit.logo }, theme: kit };

  const specs = (deck.slides || []).map((s) => s && s.spec).filter(Boolean);
  if (!specs.length) {
    throw new Error('Este deck foi criado numa versão anterior e não pode ser editado pelo novo editor — gere uma nova apresentação.');
  }

  emit('edicao', 'Editor analisando o deck e aplicando as mudanças…');
  if (onOutline && deck.outline) onOutline(deck.outline);

  // baseline: re-renderiza todos os specs (determinístico, 0 tokens) p/ remontar
  const slides = specs.map((spec, i) => {
    const { html, js } = renderSlide(spec, { ...ctxBase, index: i });
    return { spec, html, js };
  });

  const specsDump = specs.map((spec, i) => `### SLIDE ${i}\n${JSON.stringify(spec)}`).join('\n\n');

  const result = await aiJSON({ role: 'pipeline',
    system: editorSystem(CATALOG_PROMPT),
    user: [
      `## Título do deck\n${deck.title}`,
      `## Instrução do usuário\n${instructions}`,
      `## Specs atuais (${specs.length} slides)\n${specsDump}`,
    ].join('\n\n'),
    schema: EDIT_SCHEMA,
    maxTokens: 16000,
  });

  const touched = [];
  for (const ch of result.changes || []) {
    const idx = Math.max(0, Math.min(slides.length, ch.index));
    slides[idx] = { spec: ch.spec, html: '', js: '' }; // renderizado abaixo, após validar
    touched.push(idx);
  }
  if (!touched.length) throw new Error('O editor não devolveu nenhuma mudança');
  emit('edicao', `${touched.length} slide(s) alterado(s): ${touched.map((i) => i + 1).join(', ')}`);
  const total = slides.length;
  for (const idx of touched) if (onSlide) onSlide(null, idx, total, 'building');

  /* valida/corrige/renderiza apenas os slides tocados */
  await mapLimit(touched, 3, async (idx) => {
    let spec = slides[idx].spec;
    for (let attempt = 0; attempt < 2; attempt++) {
      const issues = validateSpec(spec);
      if (!issues.length) break;
      emit('edicao', `Slide ${idx + 1}: corrigindo ${issues.length} problema(s)…`, { issues });
      if (onSlide) onSlide(null, idx, total, 'fixing');
      spec = await aiJSON({ role: 'pipeline',
        system: editorSystem(CATALOG_PROMPT),
        user: [
          `## Instrução original\n${instructions}`,
          `## Spec atual (tem problemas)\n${JSON.stringify(spec)}`,
          `## Problemas detectados — corrija TODOS mantendo o conteúdo\n- ${issues.join('\n- ')}`,
          `## Responda com o objeto {summary, changes:[{index:${idx}, spec}]} só deste slide`,
        ].join('\n\n'),
        schema: EDIT_SCHEMA,
        maxTokens: 12000,
      }).then((r) => (r.changes && r.changes[0] && r.changes[0].spec) || spec);
    }
    const { html, js } = renderSlide(spec, { ...ctxBase, index: idx });
    slides[idx] = { spec, html, js };
    if (onSlide) onSlide(slides[idx], idx, total, 'done');
  });

  const deckIssues = validateDeck(slides);
  if (deckIssues.length) emit('edicao', `Avisos do deck: ${deckIssues.join('; ')}`);

  const html = assemble({ title: deck.title, brand: kit.name || deck.brand || '', slides, theme: kit });
  emit('edicao', `Edição aplicada: ${result.summary}`);
  return { slides, html, summary: result.summary };
}
