import { aiJSON, mapLimit } from './agents.js';
import { assemble } from './assemble.js';
import { validateSlide, validateDeck } from './validate.js';
import {
  ROTEIRISTA_SYSTEM, DIRETOR_SYSTEM, INTERACAO_SYSTEM, CONSTRUTOR_SYSTEM, REVISOR_SYSTEM,
  OUTLINE_SCHEMA, VISUAL_SCHEMA, INTERACTION_SCHEMA, BUILD_SCHEMA,
} from './prompts.js';

const MAX_DOC_CHARS = 150_000;
const BUILD_CONCURRENCY = 4;
const FIX_ATTEMPTS = 2;

function docsBlock(docs) {
  if (!docs || !docs.length) return '(nenhum documento fornecido)';
  let total = 0;
  const parts = [];
  for (const d of docs) {
    const remaining = MAX_DOC_CHARS - total;
    if (remaining <= 0) { parts.push(`\n[documento "${d.name}" omitido por limite de tamanho]`); continue; }
    const text = String(d.text || '').slice(0, remaining);
    total += text.length;
    parts.push(`### Documento: ${d.name}\n${text}`);
  }
  return parts.join('\n\n');
}

/**
 * Gera um deck completo. Não persiste nada: devolve { title, brand, outline, slides, html }.
 * input: { topic, audience, instructions, docs, slideCount }
 * brandKit: kit de identidade da organização (tema + nome + tom).
 */
export async function runPipeline(input, brandKit, emit) {
  const { topic, audience, instructions, docs, slideCount } = input;
  const kit = brandKit || {};

  /* ---------- 1 · Roteirista ---------- */
  emit('roteiro', 'Roteirista pensando no arco narrativo…');
  const brandLines = [
    kit.name ? `Nome da marca/empresa: ${kit.name} (use no badge da capa e no campo brand)` : '',
    kit.tone ? `Tom de voz da marca: ${kit.tone}` : '',
  ].filter(Boolean).join('\n');
  const outline = await aiJSON({ role: 'pipeline',
    system: ROTEIRISTA_SYSTEM,
    user: [
      `## Tópico\n${topic}`,
      `## Público\n${audience || 'público misto — adapte ao tópico'}`,
      brandLines ? `## Marca\n${brandLines}` : '',
      instructions ? `## Instruções extras do usuário\n${instructions}` : '',
      slideCount ? `## Quantidade de slides desejada\n${slideCount}` : '',
      `## Documentos de referência\n${docsBlock(docs)}`,
    ].filter(Boolean).join('\n\n'),
    schema: OUTLINE_SCHEMA,
    maxTokens: 16000,
  });
  emit('roteiro', `Roteiro pronto: "${outline.title}" com ${outline.slides.length} slides`, {
    slides: outline.slides.map((s) => s.title),
  });

  /* ---------- 2+3 · Diretor visual ∥ Engenheiro de interação (paralelo) ---------- */
  emit('design', 'Diretor visual e engenheiro de interação trabalhando em paralelo…');
  const outlineJson = JSON.stringify(outline, null, 2);
  const [visual, interaction] = await Promise.all([
    aiJSON({ role: 'pipeline',
      system: DIRETOR_SYSTEM,
      user: `## Roteiro do deck\n${outlineJson}`,
      schema: VISUAL_SCHEMA,
      maxTokens: 20000,
    }),
    aiJSON({ role: 'pipeline',
      system: INTERACAO_SYSTEM,
      user: `## Roteiro do deck\n${outlineJson}\n\n(Defina as interações a partir do roteiro; o layout detalhado está sendo feito em paralelo — indique elementos e comportamento de forma auto-contida.)`,
      schema: INTERACTION_SCHEMA,
      maxTokens: 24000,
    }),
  ]);
  const nDemos = interaction.slides.filter((s) => s.pattern !== 'none').length;
  emit('design', `Especificações prontas: ${visual.slides.length} layouts, ${nDemos} demos`);

  /* ---------- 4 · Construtores (paralelo, com validação + revisão) ---------- */
  const visualById = new Map(visual.slides.map((s) => [s.id, s]));
  const interById = new Map(interaction.slides.map((s) => [s.id, s]));
  const deckContext = {
    title: outline.title,
    narrative: outline.narrative,
    audience: outline.audience,
    all_slides: outline.slides.map((s, i) => `${i + 1}. ${s.title}`),
  };

  const slides = await mapLimit(outline.slides, BUILD_CONCURRENCY, async (slide, i) => {
    const spec = {
      posicao: `slide ${i + 1} de ${outline.slides.length}`,
      contexto_do_deck: deckContext,
      roteiro: slide,
      visual: visualById.get(slide.id) || null,
      interacao: interById.get(slide.id) || { demo: '', pattern: 'none', behavior: '', elements: [] },
    };
    let built = await aiJSON({ role: 'pipeline',
      system: CONSTRUTOR_SYSTEM,
      user: `## Especificação do slide\n${JSON.stringify(spec, null, 2)}`,
      schema: BUILD_SCHEMA,
      maxTokens: 32000,
    });

    for (let attempt = 0; attempt < FIX_ATTEMPTS; attempt++) {
      const issues = validateSlide(built);
      if (!issues.length) break;
      emit('construcao', `Slide ${i + 1} ("${slide.title}"): corrigindo ${issues.length} problema(s)…`, { issues });
      built = await aiJSON({ role: 'pipeline',
        system: REVISOR_SYSTEM,
        user: [
          `## Especificação original do slide\n${JSON.stringify(spec, null, 2)}`,
          `## HTML atual\n${built.html}`,
          `## JS atual\n${built.js}`,
          `## Problemas detectados pela validação\n- ${issues.join('\n- ')}`,
        ].join('\n\n'),
        schema: BUILD_SCHEMA,
        maxTokens: 32000,
      });
    }

    const finalIssues = validateSlide(built);
    emit('construcao', `Slide ${i + 1}/${outline.slides.length} pronto: "${slide.title}"${finalIssues.length ? ` (com ${finalIssues.length} aviso(s))` : ''}`,
      finalIssues.length ? { issues: finalIssues } : undefined);
    return built;
  });

  /* ---------- 5 · Montagem ---------- */
  emit('montagem', 'Montando o deck no template…');
  const deckIssues = validateDeck(slides);
  if (deckIssues.length) emit('montagem', `Avisos do deck: ${deckIssues.join('; ')}`);

  const html = assemble({
    title: outline.title,
    brand: kit.name || outline.brand,
    slides,
    theme: kit,
  });
  emit('montagem', `Deck pronto: ${slides.length} slides, ${nDemos} demos interativas`);
  return { title: outline.title, brand: outline.brand, outline, slides, html };
}
