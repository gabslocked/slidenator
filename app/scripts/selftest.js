/**
 * Selftest do DeckForge — não usa a API.
 * Monta um deck de amostra com um slide interativo real, roda a validação
 * e grava output/selftest.html para inspeção visual no navegador.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assemble } from '../src/assemble.js';
import { validateSlide, validateDeck } from '../src/validate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const capa = {
  html: `<section class="slide bg-ink text-white" data-theme="dark">
  <div class="absolute left-14 top-11">
    <span class="rv inline-flex items-center rounded-full bg-lime text-ink text-[11px] font-bold tracking-[.18em] px-4 py-1.5">DECKFORGE · SELFTEST</span>
  </div>
  <div class="absolute left-14 top-40">
    <h1 class="text-[64px] font-extrabold leading-[1.03] tracking-tight">
      <span class="rv block" data-d="0">DECK DE</span>
      <span class="rv block text-lime" data-d="70">AMOSTRA</span>
    </h1>
    <p class="rv mt-7 max-w-[560px] text-mut text-[17px] font-light" data-d="200">Se você está vendo este slide com animação de entrada e o contador do próximo slide funciona, o template está íntegro.</p>
  </div>
</section>`,
  js: '',
};

const demoSlide = {
  html: `<section class="slide bg-paper text-ink" data-theme="light" data-demo="teste">
  <div class="absolute left-14 top-9 max-w-[880px]">
    <p class="rv text-olive text-[11px] font-bold tracking-[.3em]">SELFTEST · DEMO</p>
    <h2 class="rv mt-1.5 text-[30px] font-bold" data-d="60">Demo interativa mínima</h2>
    <p class="rv mt-1 text-mutl text-[14px] font-light" data-d="120">Aperte o botão e veja a barra, o contador e o badge reagirem:</p>
  </div>
  <button id="tt-btn" class="rv btn absolute right-14 top-[96px] rounded-xl bg-lime text-ink font-bold px-5 py-3 text-[13px]" data-d="150">GERAR CARGA</button>
  <div class="rv absolute left-14 top-[200px] w-[560px] rounded-2xl bg-white border border-neutral-200 p-5" data-d="180">
    <div class="flex items-center gap-3">
      <span class="icon w-8 h-8" data-icon="server_d"></span>
      <p class="font-bold text-[14px]">Servidor de teste</p>
      <span id="tt-state" class="ml-auto rounded-full bg-limetint border border-lime2 text-olive text-[10px] font-bold px-2.5 py-1">SAUDÁVEL</span>
    </div>
    <div class="mt-4 flex justify-between text-[11px]"><span class="font-bold tracking-wider text-mutl">CPU</span><b id="tt-cpu">12%</b></div>
    <div class="mt-1 h-3 rounded-full bg-neutral-100"><div id="tt-bar" class="bar-fill h-3 rounded-full bg-lime2" style="width:12%"></div></div>
    <p class="mt-4 text-[12px] text-mutl font-light">requisições atendidas: <b id="tt-count" class="text-ink" data-countup data-target="0">0</b></p>
  </div>
</section>`,
  js: `/* -- selftest: demo mínima -- */
demos.teste = { start() {
  const btn = document.getElementById('tt-btn');
  const cpu = document.getElementById('tt-cpu'), bar = document.getElementById('tt-bar');
  const state = document.getElementById('tt-state'), count = document.getElementById('tt-count');
  let load = false, c = 12, n = 0;
  btn.textContent = 'GERAR CARGA';
  btn.onclick = () => { load = !load; btn.textContent = load ? 'ALIVIAR' : 'GERAR CARGA'; };
  every(300, () => {
    c = Math.max(8, Math.min(97, c + (load ? 9 : -7) + (Math.random() * 4 - 2)));
    n += load ? 3 : 1;
    cpu.textContent = Math.round(c) + '%';
    bar.style.width = c + '%';
    bar.style.backgroundColor = c > 85 ? '#E06060' : c > 60 ? '#D8A022' : '#9EC100';
    state.textContent = c > 85 ? 'SATURADO' : c > 60 ? 'SOB PRESSÃO' : 'SAUDÁVEL';
    state.className = 'ml-auto rounded-full text-[10px] font-bold px-2.5 py-1 ' + (c > 85 ? 'bg-red-50 border border-red-300 text-red-500' : c > 60 ? 'bg-amber-50 border border-amber-300 text-amber-600' : 'bg-limetint border border-lime2 text-olive');
    count.textContent = n.toLocaleString('pt-BR');
  });
}};`,
};

const slides = [capa, demoSlide];
let failed = false;

slides.forEach((s, i) => {
  const issues = validateSlide(s);
  if (issues.length) { failed = true; console.error(`✗ slide ${i + 1}:`, issues); }
  else console.log(`✓ slide ${i + 1} válido`);
});
const deckIssues = validateDeck(slides);
if (deckIssues.length) { failed = true; console.error('✗ deck:', deckIssues); }
else console.log('✓ deck sem conflitos de id/demo');

const TEST_LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const html = assemble({
  title: 'DeckForge · Selftest',
  brand: 'DECKFORGE',
  slides,
  theme: { colors: { accent: '#1D4ED8', ink: '#0B1220', paper: '#F2F4F7' }, radius: 'reto', logo: TEST_LOGO },
});
for (const marker of ['{{TITLE}}', '{{BRAND}}', '{{SLIDES}}', '{{DEMOS}}']) {
  if (html.includes(marker)) { failed = true; console.error(`✗ placeholder não substituído: ${marker}`); }
}
if (!html.includes('demos.teste')) { failed = true; console.error('✗ demo não injetada'); }
if (!html.includes('const ICONS')) { failed = true; console.error('✗ ícones ausentes do skeleton'); }
// tema aplicado
if (!html.includes("lime:'#1D4ED8'")) { failed = true; console.error('✗ accent do tema não aplicada no tailwind.config'); }
if (!html.includes('.rounded-2xl{border-radius:5px!important}')) { failed = true; console.error('✗ raio "reto" não aplicado'); }
if (!html.includes('.bg-lime,.bg-lime *{color:#ffffff!important}')) { failed = true; console.error('✗ contraste automático (accent escura) não aplicado'); }
if (!html.includes(TEST_LOGO)) { failed = true; console.error('✗ logo não injetado'); }
if (!/\.slide \{[^}]*overflow:hidden/.test(html)) { failed = true; console.error('✗ clip anti-estouro ausente'); }

const out = path.join(ROOT, 'output', 'selftest.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`${failed ? '✗ SELFTEST FALHOU' : '✓ selftest ok'} — deck de amostra em output/selftest.html (${(html.length / 1024).toFixed(0)} KB)`);
process.exit(failed ? 1 : 0);
