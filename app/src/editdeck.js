import { aiJSON, mapLimit } from './agents.js';
import { assemble } from './assemble.js';
import { validateSlide, validateDeck } from './validate.js';
import { DESIGN_SYSTEM, REVISOR_SYSTEM, BUILD_SCHEMA } from './prompts.js';

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
        required: ['index', 'html', 'js'],
        properties: {
          index: { type: 'integer', description: 'Índice do slide alterado (0-based). Para ADICIONAR um slide novo ao final, use o índice seguinte ao último.' },
          html: { type: 'string', description: 'A <section> completa do slide, já revisada' },
          js: { type: 'string', description: 'O bloco demos.NOME = { start() {...} }; ou "" se estático' },
        },
      },
    },
  },
};

const EDITOR_SYSTEM = `Você é o EDITOR de decks HTML interativos já gerados. Recebe todos os slides atuais (html + js) e uma instrução de mudança do usuário. Aplique a mudança alterando o MENOR número de slides possível.

${DESIGN_SYSTEM}

Regras:
- Devolva SOMENTE os slides que mudaram (campo changes), com a <section> completa e o js completo de cada um. Slides não citados permanecem intocados.
- Mantenha o estilo, os ids e as convenções existentes do slide ao editar (ids prefixados, every/later, checagem de demos.NOME.on).
- Se a instrução pedir um slide NOVO, crie-o no padrão dos demais e use o índice seguinte ao último.
- Se a instrução for ambígua, aplique a interpretação mais provável e explique no summary.
- Nunca cite ferramentas ou modelos no conteúdo dos slides.`;

/**
 * Edita um deck existente conforme instruções do usuário.
 * deck: { title, outline, slides:[{html,js}], brand }
 * Retorna { slides, html, summary }.
 */
export async function runEditPipeline({ deck, instructions, brandKit, onOutline, onSlide }, emit) {
  const kit = brandKit || {};

  emit('edicao', 'Editor analisando o deck e aplicando as mudanças…');
  if (onOutline && deck.outline) onOutline(deck.outline);
  const slidesDump = deck.slides
    .map((s, i) => `### SLIDE ${i} — html:\n${s.html}\n### SLIDE ${i} — js:\n${s.js || '(estático)'}`)
    .join('\n\n');

  const result = await aiJSON({ role: 'pipeline',
    system: EDITOR_SYSTEM,
    user: [
      `## Título do deck\n${deck.title}`,
      `## Instrução do usuário\n${instructions}`,
      `## Slides atuais (${deck.slides.length})\n${slidesDump}`,
    ].join('\n\n'),
    schema: EDIT_SCHEMA,
    maxTokens: 48000,
  });

  const slides = deck.slides.map((s) => ({ ...s }));
  const touched = [];
  for (const ch of result.changes || []) {
    const idx = Math.max(0, Math.min(slides.length, ch.index));
    slides[idx] = { html: ch.html, js: ch.js || '' };
    touched.push(idx);
  }
  if (!touched.length) throw new Error('O editor não devolveu nenhuma mudança');
  emit('edicao', `${touched.length} slide(s) alterado(s): ${touched.map((i) => i + 1).join(', ')}`);
  const total = slides.length;
  for (const idx of touched) if (onSlide) onSlide(null, idx, total, 'building');

  /* valida e corrige apenas os slides tocados */
  await mapLimit(touched, 3, async (idx) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const issues = validateSlide(slides[idx]);
      if (!issues.length) break;
      emit('edicao', `Slide ${idx + 1}: corrigindo ${issues.length} problema(s)…`, { issues });
      if (onSlide) onSlide(null, idx, total, 'fixing');
      slides[idx] = await aiJSON({ role: 'pipeline',
        system: REVISOR_SYSTEM,
        user: [
          `## HTML atual\n${slides[idx].html}`,
          `## JS atual\n${slides[idx].js}`,
          `## Problemas detectados pela validação\n- ${issues.join('\n- ')}`,
        ].join('\n\n'),
        schema: BUILD_SCHEMA,
        maxTokens: 32000,
      });
    }
    if (onSlide) onSlide(slides[idx], idx, total, 'done');
  });

  const deckIssues = validateDeck(slides);
  if (deckIssues.length) emit('edicao', `Avisos do deck: ${deckIssues.join('; ')}`);

  const html = assemble({ title: deck.title, brand: kit.name || deck.brand || '', slides, theme: kit });
  emit('edicao', `Edição aplicada: ${result.summary}`);
  return { slides, html, summary: result.summary };
}
