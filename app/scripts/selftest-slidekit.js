/**
 * Selftest do SlideKit — não usa a API de IA.
 * Monta um deck de amostra a partir de SPECS JSON (>=10 componentes distintos,
 * incluindo interativos, bar-chart, kpi-row, timeline, flow e ícones variados),
 * exercita validateSpec (casos válidos e inválidos), renderiza, valida o deck
 * montado (validateDeck), monta com assemble() e grava output/selftest-slidekit.html.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assemble } from '../src/assemble.js';
import { validateSlide, validateDeck } from '../src/validate.js';
import { renderSlide, validateSpec, CATALOG, CATALOG_PROMPT, ICON_NAMES } from '../src/slidekit/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;
const bad = (msg) => { failed = true; console.error('✗ ' + msg); };
const ok = (msg) => console.log('✓ ' + msg);

/* ------------------------------------------------------------ specs válidos */
const specs = [
  {
    title: 'Capa', theme: 'dark',
    components: [
      { type: 'logo', area: [1, 1, 3, 2], props: { name: 'SLIDEKIT', tagline: 'demo' } },
      { type: 'badge', area: [1, 3, 5, 1], props: { items: ['SELFTEST', 'v1'], tone: 'ok' } },
      { type: 'heading', area: [1, 5, 10, 3], props: { kicker: 'APRESENTAÇÃO DETERMINÍSTICA', title: 'Componentes prontos, deck instantâneo', sub: 'Cada slide é um JSON — o HTML sai por código, sem revisor de IA.' } },
      { type: 'divider', area: [1, 8, 10, 1], props: { label: 'DESTAQUES' } },
      { type: 'big-number', area: [1, 9, 3, 3], props: { value: 310, label: 'ícones Lucide', sub: 'inline SVG' } },
      { type: 'big-number', area: [4, 9, 3, 3], props: { value: 25, label: 'componentes' } },
      { type: 'kpi', area: [7, 9, 4, 3], props: { label: 'Custo/deck', value: 0.04, prefix: 'US$ ', decimals: 2, trend: '-80%', icon: 'dollar-sign' } },
    ],
    demo: null,
  },
  {
    title: 'Dados', theme: 'light',
    components: [
      { type: 'heading', area: [1, 1, 8, 3], props: { kicker: 'DADOS · Q3', title: 'Crescimento por trimestre', sub: 'Barras que crescem ao entrar e indicadores animados.' } },
      { type: 'kpi-row', area: [1, 4, 11, 3], props: { items: [
        { label: 'Receita', value: 1.2, prefix: 'R$ ', suffix: ' M', decimals: 1, trend: '+22%', icon: 'trending-up' },
        { label: 'Clientes', value: 3400, trend: '+18%', icon: 'users' },
        { label: 'Churn', value: 2.1, suffix: '%', trend: '-0.4pp', icon: 'trending-down' },
      ] } },
      { type: 'bar-chart', area: [1, 7, 7, 6], props: { suffix: 'k', data: [
        { label: 'Jan', value: 30 }, { label: 'Fev', value: 44 }, { label: 'Mar', value: 52 },
        { label: 'Abr', value: 61 }, { label: 'Mai', value: 78, highlight: true },
      ] } },
      { type: 'counter-sim', area: [8, 7, 4, 6], props: { label: 'API de pedidos', metric: 'CPU', button: 'ESTRESSAR' } },
    ],
    demo: null,
  },
  {
    title: 'Processo', theme: 'light',
    components: [
      { type: 'heading', area: [1, 1, 10, 2], props: { kicker: 'COMO FUNCIONA', title: 'Do commit ao usuário, sem intervenção' } },
      { type: 'timeline', area: [1, 3, 4, 9], props: { orientation: 'v', items: [
        { time: '00:00', title: 'Commit', text: 'Dev abre o PR' },
        { time: '00:02', title: 'Build', text: 'Pipeline compila' },
        { time: '00:05', title: 'Deploy', text: 'Sobe em produção' },
      ] } },
      { type: 'flow', area: [5, 3, 7, 3], props: { nodes: [
        { icon: 'file-code', title: 'Commit' }, { icon: 'cog', title: 'Build' },
        { icon: 'container', title: 'Empacota' }, { icon: 'rocket', title: 'Deploy' },
      ] } },
      { type: 'feature-grid', area: [5, 6, 7, 3], props: { cols: 3, items: [
        { icon: 'shield-check', title: 'Seguro', text: 'Assinatura em cada etapa' },
        { icon: 'history', title: 'Reversível', text: 'Rollback em 1 clique' },
        { icon: 'gauge', title: 'Rápido', text: '~5 min ponta a ponta' },
      ] } },
      { type: 'progress', area: [5, 9, 7, 3], props: { items: [
        { label: 'Cobertura de testes', value: 84, suffix: '%' },
        { label: 'Deploys bem-sucedidos', value: 97, suffix: '%' },
      ] } },
    ],
    demo: null,
  },
  {
    title: 'Fechamento', theme: 'dark',
    components: [
      { type: 'heading', area: [1, 1, 8, 2], props: { kicker: 'ANTES → DEPOIS', title: 'O mesmo time, outro ritmo' } },
      { type: 'comparison', area: [1, 3, 7, 5], props: {
        before: { title: 'Manual', tone: 'bad', items: ['6h por publicação', 'Só fora do horário', 'Erros humanos'] },
        after: { title: 'Automatizado', tone: 'ok', items: ['3 min', 'A qualquer hora', 'Auditoria automática'] },
      } },
      { type: 'quote', area: [8, 3, 4, 5], props: { text: 'A gente parou de escalar pessoas e passou a escalar processos.', author: 'CTO', role: 'Plataforma' } },
      { type: 'live-feed', area: [1, 8, 4, 4], props: { title: 'DEPLOYS', items: [
        { icon: 'rocket', text: 'v2.4.1 em produção' }, { icon: 'check', text: 'health check ok' },
        { icon: 'users', text: '1.2k sessões ativas' }, { icon: 'git-branch', text: 'PR #481 mergeado' },
      ] } },
      { type: 'terminal', area: [5, 8, 7, 4], props: { title: 'deploy.log', lines: [
        { text: '$ slidenator deploy', tone: 'cmd' },
        { text: '→ montando 4 slides…', tone: 'mut' },
        { text: '✓ validateSpec: 0 problemas', tone: 'ok' },
        { text: '✓ deck no ar em 2.3s', tone: 'ok' },
      ] } },
    ],
    demo: null,
  },
];

/* ------------------------------------------------- validação dos specs (ok) */
const distinct = new Set();
specs.forEach((s, i) => {
  s.components.forEach((c) => distinct.add(c.type));
  const issues = validateSpec(s);
  if (issues.length) bad(`spec ${i + 1} deveria ser válido: ${JSON.stringify(issues)}`);
  else ok(`spec ${i + 1} (${s.title}) válido`);
});
if (distinct.size >= 10) ok(`${distinct.size} componentes distintos no deck`);
else bad(`apenas ${distinct.size} componentes distintos (< 10)`);

/* ------------------------------------------- validação dos specs (inválido) */
const invalids = [
  { name: 'área fora da grade', spec: { theme: 'light', components: [{ type: 'kpi', area: [10, 1, 5, 3], props: { label: 'x', value: 1 } }] }, expect: /fora da grade/ },
  { name: 'tipo desconhecido', spec: { theme: 'light', components: [{ type: 'pie-chart', area: [1, 1, 3, 3], props: {} }] }, expect: /tipo desconhecido/ },
  { name: 'ícone errado c/ sugestão', spec: { theme: 'light', components: [{ type: 'icon-feature', area: [1, 1, 3, 3], props: { icon: 'servr', title: 'x' } }] }, expect: /ícone inválido "servr".*server/ },
  { name: 'sobreposição', spec: { theme: 'light', components: [{ type: 'text', area: [1, 1, 4, 4], props: { text: 'a' } }, { type: 'text', area: [2, 2, 4, 4], props: { text: 'b' } }] }, expect: /sobreposição/ },
];
invalids.forEach((t) => {
  const issues = validateSpec(t.spec);
  if (issues.some((m) => t.expect.test(m))) ok(`inválido detectado: ${t.name} → "${issues.find((m) => t.expect.test(m))}"`);
  else bad(`caso inválido "${t.name}" NÃO foi detectado: ${JSON.stringify(issues)}`);
});

/* --------------------------------------------------------- render + assemble */
const slides = specs.map((s, i) => renderSlide(s, { index: i, brand: { name: 'SLIDENATOR · SELFTEST' } }));
slides.forEach((sl, i) => {
  const issues = validateSlide(sl);
  if (issues.length) bad(`slide renderizado ${i + 1} falhou no validateSlide: ${JSON.stringify(issues)}`);
  else ok(`slide renderizado ${i + 1} passou no validateSlide`);
});
const deckIssues = validateDeck(slides);
if (deckIssues.length) bad(`validateDeck: ${JSON.stringify(deckIssues)}`);
else ok('validateDeck sem conflitos de id/demo');

/* -------------------------------------------------------------- sanidade API */
if (Object.keys(CATALOG).length >= 22) ok(`CATALOG com ${Object.keys(CATALOG).length} componentes`);
else bad(`CATALOG com poucos componentes: ${Object.keys(CATALOG).length}`);
if (ICON_NAMES.length >= 290) ok(`${ICON_NAMES.length} ícones em ICON_NAMES`);
else bad(`poucos ícones: ${ICON_NAMES.length}`);
const promptTokens = Math.round(CATALOG_PROMPT.length / 4);
if (promptTokens <= 4000) ok(`CATALOG_PROMPT ~${promptTokens} tokens (cabe em 3-4k)`);
else bad(`CATALOG_PROMPT grande demais: ~${promptTokens} tokens`);

const html = assemble({
  title: 'SlideKit · Selftest',
  brand: 'SLIDENATOR',
  slides,
  theme: { colors: { accent: '#D8E022', ink: '#070808', paper: '#EBEBEB' }, radius: 'arredondado' },
});
for (const marker of ['{{TITLE}}', '{{BRAND}}', '{{SLIDES}}', '{{DEMOS}}']) {
  if (html.includes(marker)) bad(`placeholder não substituído: ${marker}`);
}
if (!/demos\.sk1\s*=/.test(html)) bad('demo do slide 2 (counter-sim) não injetada');
if (!/demos\.sk3\s*=/.test(html)) bad('demo do slide 4 (live-feed) não injetada');
if (!html.includes('const ICONS')) bad('ícones legados ausentes do skeleton');

const out = path.join(ROOT, 'output', 'selftest-slidekit.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);

console.log(`\n${failed ? '✗ SELFTEST-SLIDEKIT FALHOU' : '✓ selftest-slidekit ok'} — deck em output/selftest-slidekit.html (${(html.length / 1024).toFixed(0)} KB)`);
process.exit(failed ? 1 : 0);
