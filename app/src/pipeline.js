import { aiJSON, mapLimit } from './agents.js';
import { assemble } from './assemble.js';
import { validateDeck } from './validate.js';
import { CATALOG_PROMPT, validateSpec, renderSlide } from './slidekit/index.js';
import { ROTEIRISTA_SYSTEM, specFillSystem, OUTLINE_SCHEMA, SPEC_FILL_SCHEMA } from './prompts.js';

const MAX_DOC_CHARS = 150_000;
// sequencial (1): cada slide é construído por vez e aparece no visualizador
// antes do próximo — geração "ao vivo, slide a slide". Roteável por env se um
// dia quisermos velocidade em vez do espetáculo.
const BUILD_CONCURRENCY = Number(process.env.BUILD_CONCURRENCY) || 1;
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

/** Resumo de 1 linha da composição de um spec (para o spec-fill variar layout). */
function specSummary(i, spec) {
  const types = (spec.components || []).map((c) => c.type);
  const demo = spec.demo && spec.demo.type ? ` +demo:${spec.demo.type}` : '';
  return `slide ${i + 1} (${spec.theme}): ${types.join(', ') || '—'}${demo}`;
}

/** Clampa uma área [col,row,colSpan,rowSpan] para dentro da grade 12×12. */
function clampArea(area) {
  const a = Array.isArray(area) ? area : [1, 1, 1, 1];
  let [c, r, cs, rs] = a.map((n) => Math.round(Number(n)) || 1);
  c = Math.min(12, Math.max(1, c));
  r = Math.min(12, Math.max(1, r));
  cs = Math.min(12 - c + 1, Math.max(1, cs));
  rs = Math.min(12 - r + 1, Math.max(1, rs));
  return [c, r, cs, rs];
}

/**
 * Fallback determinístico quando o spec-fill não converge: clampa áreas para
 * dentro da grade e, se ainda houver issues (ex.: sobreposição, tipo inválido),
 * remove componentes do fim até o spec validar. Última cartada: remove a demo.
 */
function deterministicFix(spec, i, emit) {
  const before = (spec.components || []).length;
  const fixed = {
    ...spec,
    components: (spec.components || []).map((c) => ({ ...c, area: clampArea(c.area) })),
  };
  let issues = validateSpec(fixed);
  while (issues.length && fixed.components.length) {
    fixed.components.pop();
    issues = validateSpec(fixed);
  }
  if (issues.length && fixed.demo) {
    fixed.demo = null;
    issues = validateSpec(fixed);
  }
  const dropped = before - fixed.components.length;
  emit('construcao', `Slide ${i + 1}: ajuste determinístico aplicado${dropped ? ` (${dropped} componente(s) removido(s))` : ''}`,
    { issues: validateSpec(spec) });
  return fixed;
}

/**
 * Gera um deck completo. Não persiste nada: devolve { title, brand, outline, slides, html }
 * onde slides = [{ spec, html, js }].
 * input: { topic, audience, instructions, docs, slideCount, onOutline, onSlide }
 * brandKit: kit de identidade da organização (tema + nome + tom).
 */
export async function runPipeline(input, brandKit, emit) {
  const { topic, audience, instructions, docs, slideCount, onOutline, onSlide } = input;
  const kit = brandKit || {};

  /* ---------- 1 · Roteirista (role outline) ---------- */
  emit('roteiro', 'Roteirista pensando no arco narrativo…');
  const brandLines = [
    kit.name ? `Nome da marca/empresa: ${kit.name} (use no badge da capa e no campo brand)` : '',
    kit.tone ? `Tom de voz da marca: ${kit.tone}` : '',
  ].filter(Boolean).join('\n');
  const outline = await aiJSON({ role: 'outline',
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
  if (onOutline) onOutline(outline);

  /* ---------- 2 · Spec-fill por slide (paralelo, role pipeline) ---------- */
  emit('design', 'Montando os slides componente a componente…');
  const total = outline.slides.length;
  const catalogSystem = specFillSystem(CATALOG_PROMPT);
  const deckMap = outline.slides.map((s, i) => `${i + 1}. ${s.title}`).join('\n');
  const summaries = []; // resumo dos specs já concluídos (best-effort, alimenta a variedade)

  const ctxBase = { brand: { name: kit.name, logoDataUri: kit.logo }, theme: kit };

  /* um slide que falha na IA (JSON inválido, rede) NUNCA derruba o deck:
     retry e, persistindo, slide básico montado do próprio roteiro */
  const safeAiJSON = async (params, label) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try { return await aiJSON(params); }
      catch (e) {
        emit('construcao', `${label}: resposta inválida do modelo (tentativa ${attempt + 1}) — ${e.message}`);
      }
    }
    return null;
  };

  const fallbackSpec = (slide, i) => ({
    title: slide.title,
    theme: i === 0 ? 'dark' : 'light',
    components: [
      { type: 'heading', area: [1, 2, 12, 3], props: { kicker: kit.name || outline.brand || '', title: slide.title, sub: slide.objetivo || '' } },
      { type: 'bullet-list', area: [1, 6, 9, 6], props: { items: (slide.bullets || []).slice(0, 5) } },
    ],
    demo: null,
  });

  const slides = await mapLimit(outline.slides, BUILD_CONCURRENCY, async (slide, i) => {
    if (onSlide) onSlide(null, i, total, 'building');
    const alreadyDone = summaries.slice(); // snapshot para não repetir composição
    const baseUser = [
      `## Slide ${i + 1} de ${total}`,
      `## Deck: ${outline.title}\n${outline.arco}`,
      `## Roteiro deste slide\n${JSON.stringify(slide, null, 2)}`,
      `## Todos os slides do deck\n${deckMap}`,
      alreadyDone.length ? `## Specs já gerados (varie a composição em relação a estes)\n${alreadyDone.join('\n')}` : '',
      kit.name ? `## Marca\n${kit.name}` : '',
    ].filter(Boolean).join('\n\n');

    let spec = await safeAiJSON({ role: 'pipeline',
      system: catalogSystem,
      user: baseUser,
      schema: SPEC_FILL_SCHEMA,
      maxTokens: 12000,
    }, `Slide ${i + 1} ("${slide.title}")`);

    /* validação determinística + re-chamada com as issues (máx 2) */
    for (let attempt = 0; spec && attempt < FIX_ATTEMPTS; attempt++) {
      const issues = validateSpec(spec);
      if (!issues.length) break;
      emit('construcao', `Slide ${i + 1} ("${slide.title}"): corrigindo ${issues.length} problema(s)…`, { issues });
      if (onSlide) onSlide(null, i, total, 'fixing');
      const fixed = await safeAiJSON({ role: 'pipeline',
        system: catalogSystem,
        user: [
          baseUser,
          `## Spec atual (tem problemas)\n${JSON.stringify(spec)}`,
          `## Problemas detectados pela validação — corrija TODOS mantendo o conteúdo\n- ${issues.join('\n- ')}`,
        ].join('\n\n'),
        schema: SPEC_FILL_SCHEMA,
        maxTokens: 12000,
      }, `Slide ${i + 1} (correção)`);
      if (fixed) spec = fixed; else break;   // correção falhou: segue com o spec atual p/ deterministicFix
    }

    if (!spec) {
      emit('construcao', `Slide ${i + 1} ("${slide.title}"): usando composição básica do roteiro`);
      spec = fallbackSpec(slide, i);
    }
    /* fallback determinístico se ainda houver issues */
    if (validateSpec(spec).length) spec = deterministicFix(spec, i, emit);

    const { html, js } = renderSlide(spec, { ...ctxBase, index: i });
    const built = { spec, html, js };
    summaries[i] = specSummary(i, spec);
    emit('construcao', `Slide ${i + 1}/${total} pronto: "${slide.title}"`);
    if (onSlide) onSlide(built, i, total, 'done');
    return built;
  });

  /* ---------- 3 · Montagem ---------- */
  emit('montagem', 'Montando o deck no template…');
  const deckIssues = validateDeck(slides);
  if (deckIssues.length) emit('montagem', `Avisos do deck: ${deckIssues.join('; ')}`);

  const nDemos = slides.filter((s) => s.spec && s.spec.demo).length;
  const html = assemble({
    title: outline.title,
    brand: kit.name || outline.brand,
    slides,
    theme: kit,
  });
  emit('montagem', `Deck pronto: ${slides.length} slides, ${nDemos} demos interativas`);
  return { title: outline.title, brand: outline.brand, outline, slides, html };
}
