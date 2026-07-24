import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DESIGN_SYSTEM = fs.readFileSync(path.join(ROOT, 'template', 'design-system.md'), 'utf-8');

/* ============================================================
 * Exemplo real (few-shot) — slide interativo no padrão da casa
 * ============================================================ */
const EXAMPLE_SLIDE = `
### HTML (data-demo="manual")
<section class="slide bg-paper text-ink" data-theme="light" data-demo="manual">
  <div class="absolute left-14 top-9 max-w-[880px]">
    <p class="rv text-olive text-[11px] font-bold tracking-[.3em]">ONDE ESTAMOS</p>
    <h2 class="rv mt-1.5 text-[30px] font-bold" data-d="60">Como uma publicação acontece hoje</h2>
    <p class="rv mt-1 text-mutl text-[14px] font-light" data-d="120">O fluxo atual funciona há anos — e é todo feito à mão. Aperte publicar e acompanhe cada etapa e o relógio:</p>
  </div>
  <button id="s2-run" class="rv btn absolute right-14 top-[96px] rounded-xl bg-lime text-ink font-bold px-5 py-3 text-[13px]" data-d="150">PUBLICAR UMA VERSÃO</button>
  <div class="absolute left-14 right-14 top-[172px]">
    <div id="s2-flow" class="relative grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-stretch gap-3">
      <div id="s2-c1" class="rv rounded-2xl bg-white border border-neutral-200 p-4 text-center" data-d="0">
        <span class="icon w-9 h-9 mx-auto" data-icon="filecode_d"></span>
        <p class="mt-2 font-bold text-[13.5px]">Dev compila a DLL</p>
        <p id="s2-t1" class="mt-1 text-[11px] text-mutl font-light h-8">aguardando</p>
        <div class="mx-auto mt-1 h-1.5 w-[80%] rounded-full bg-neutral-100 overflow-hidden"><div id="s2-b1" class="h-1.5 rounded-full bg-lime2" style="width:0%"></div></div>
      </div>
      <svg class="rv self-center" data-d="40" width="26" height="14" viewBox="0 0 26 14"><path d="M0 7h19M14 2l6 5-6 5" stroke="#9AA1A4" stroke-width="2.2" fill="none"/></svg>
      <div id="s2-c2" class="rv rounded-2xl bg-white border border-neutral-200 p-4 text-center" data-d="70">
        <span class="icon w-9 h-9 mx-auto" data-icon="desktop_d"></span>
        <p class="mt-2 font-bold text-[13.5px]">Terminal Server</p>
        <p id="s2-t2" class="mt-1 text-[11px] text-mutl font-light h-8">ninguém conectado</p>
        <div class="mx-auto mt-1 h-1.5 w-[80%]"></div>
      </div>
      <svg class="rv self-center" data-d="110" width="26" height="14" viewBox="0 0 26 14"><path d="M0 7h19M14 2l6 5-6 5" stroke="#9AA1A4" stroke-width="2.2" fill="none"/></svg>
      <div id="s2-c3" class="rv rounded-2xl bg-white border border-neutral-200 p-4 text-center" data-d="140">
        <span class="icon w-9 h-9 mx-auto" data-icon="server_d"></span>
        <p class="mt-2 font-bold text-[13.5px]">Publica no IIS</p>
        <p id="s2-t3" class="mt-1 text-[11px] text-mutl font-light h-8">versão atual no ar</p>
        <div class="mx-auto mt-1 h-1.5 w-[80%] rounded-full bg-neutral-100 overflow-hidden"><div id="s2-b3" class="h-1.5 rounded-full bg-lime2" style="width:0%"></div></div>
      </div>
      <svg class="rv self-center" data-d="180" width="26" height="14" viewBox="0 0 26 14"><path d="M0 7h19M14 2l6 5-6 5" stroke="#9AA1A4" stroke-width="2.2" fill="none"/></svg>
      <div id="s2-c4" class="rv rounded-2xl bg-white border border-neutral-200 p-4 text-center" data-d="210">
        <span class="icon w-9 h-9 mx-auto" data-icon="users_d"></span>
        <p class="mt-2 font-bold text-[13.5px]">Usuários</p>
        <p id="s2-t4" class="mt-1 text-[11px] text-mutl font-light h-8">usando o sistema</p>
        <div class="mx-auto mt-1 h-1.5 w-[80%]"></div>
      </div>
      <span id="s2-dll" class="absolute w-9 h-7 rounded-lg bg-lime shadow-md flex items-center justify-center text-[9px] font-extrabold text-ink" style="left:0; top:-16px; transition:left .9s var(--ease);">DLL</span>
    </div>
  </div>
  <div class="rv absolute left-14 right-14 top-[352px] rounded-2xl bg-white border border-neutral-200 px-5 py-3 flex items-center gap-10" data-d="240">
    <span class="text-[10px] text-mutl font-bold tracking-wider">DA DLL PRONTA ATÉ O USUÁRIO<b id="s2-clock" class="block text-[24px] text-ink font-extrabold leading-tight tracking-normal">0 min</b></span>
    <span class="text-[10px] text-mutl font-bold tracking-wider">SISTEMA<span class="block mt-1.5"><span id="s2-site" class="rounded-full bg-limetint border border-lime2 text-olive text-[10px] font-bold px-2.5 py-1">NO AR</span></span></span>
    <p id="s2-cap" class="flex-1 text-[13.5px] font-semibold">aperte “PUBLICAR UMA VERSÃO” e veja a viagem completa de uma versão nova</p>
  </div>
</section>

### JS
/* -- slide 2: publicação manual, passo a passo com relógio -- */
demos.manual = { start() {
  const btn = document.getElementById('s2-run');
  const cards = [1, 2, 3, 4].map(i => document.getElementById('s2-c' + i));
  const stats = [1, 2, 3, 4].map(i => document.getElementById('s2-t' + i));
  const b1 = document.getElementById('s2-b1'), b3 = document.getElementById('s2-b3');
  const clock = document.getElementById('s2-clock'), site = document.getElementById('s2-site');
  const cap = document.getElementById('s2-cap'), token = document.getElementById('s2-dll');
  const IDLE = ['aguardando', 'ninguém conectado', 'versão atual no ar', 'usando o sistema'];
  let busy = false, mins = 0;
  const fmt = m => m < 60 ? Math.round(m) + ' min' : Math.floor(m / 60) + ' h ' + String(Math.round(m) % 60).padStart(2, '0') + ' min';
  function tickClock(to, ms) {
    const from = mins, t0 = performance.now();
    const id = every(60, () => {
      const t = Math.min((performance.now() - t0) / ms, 1);
      mins = from + (to - from) * t;
      clock.textContent = fmt(mins);
      if (t >= 1) clearInterval(id);
    });
  }
  function focus(i) { cards.forEach((c, j) => c.classList.toggle('ring-2', j === i)); }
  function hop(i) {
    const base = document.getElementById('s2-flow').getBoundingClientRect();
    const r = cards[i].getBoundingClientRect();
    const sc = base.width / 1168 || 1;
    token.style.left = ((r.left - base.left + r.width / 2) / sc - 18) + 'px';
  }
  function fill(b, ms) { b.style.transition = 'width ' + ms + 'ms linear'; b.style.width = '100%'; }
  function siteState(ok) {
    site.textContent = ok ? 'NO AR' : 'FORA DO AR';
    site.className = 'rounded-full text-[10px] font-bold px-2.5 py-1 ' + (ok ? 'bg-limetint border border-lime2 text-olive' : 'ledblink bg-red-50 border border-red-300 text-red-500');
  }
  function reset() {
    mins = 0; clock.textContent = '0 min';
    stats.forEach((s, i) => s.textContent = IDLE[i]);
    [b1, b3].forEach(b => { b.style.transition = 'none'; b.style.width = '0%'; });
    siteState(true); focus(-1); hop(0);
  }
  cards.forEach(c => c.classList.add('ring-lime2'));
  btn.textContent = 'PUBLICAR UMA VERSÃO';
  reset();
  btn.onclick = async () => {
    if (busy) return; busy = true; reset(); await sleep(80);
    focus(0); cap.textContent = '1 · O time termina a versão nova e compila a DLL.';
    stats[0].textContent = 'compilando…'; fill(b1, 1000);
    await sleep(1150); if (!demos.manual.on) return;
    stats[0].textContent = 'DLL pronta ✓';
    focus(1); hop(1); cap.textContent = '2 · A versão está pronta… mas espera a janela combinada, fora do horário de uso.';
    stats[1].textContent = 'esperando a janela…'; tickClock(372, 2400);
    await sleep(2600); if (!demos.manual.on) return;
    stats[1].textContent = 'conectado ao servidor ✓';
    focus(2); hop(2); cap.textContent = '3 · Arquivos trocados à mão no IIS — e, durante a troca, o sistema sai do ar.';
    stats[2].textContent = 'substituindo arquivos…'; stats[3].textContent = 'esperando voltar…';
    siteState(false); fill(b3, 1500); tickClock(384, 1700);
    await sleep(1800); if (!demos.manual.on) return;
    focus(3); hop(3); siteState(true);
    stats[2].textContent = 'versão nova no ar ✓'; stats[3].textContent = 'sistema de volta ✓';
    cap.textContent = 'Minutos de trabalho manual, horas esperando a janela. É exatamente essa viagem que dá para automatizar.';
    busy = false; btn.textContent = 'PUBLICAR DE NOVO';
  };
}};
`;

/* ============================================================
 * Schemas (structured outputs)
 * ============================================================ */
export const OUTLINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'brand', 'audience', 'narrative', 'slides'],
  properties: {
    title: { type: 'string', description: 'Título do deck (usado no <title>)' },
    brand: { type: 'string', description: 'Marca curta em caixa alta para o canto do palco, ex.: "ACME · TECNOLOGIA · 2026"' },
    audience: { type: 'string' },
    narrative: { type: 'string', description: 'O arco narrativo do deck em 3-5 frases' },
    slides: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'kind', 'kicker', 'title', 'thesis', 'points', 'facts_from_docs'],
        properties: {
          id: { type: 'string', description: 'slug curto, ex.: "capa", "docker", "sql"' },
          kind: { type: 'string', enum: ['capa', 'contexto', 'conceito', 'comparacao', 'dados', 'ganhos', 'proposta', 'fechamento'] },
          kicker: { type: 'string', description: 'ex.: "CONCEITO 01 · DOCKER"' },
          title: { type: 'string' },
          thesis: { type: 'string', description: 'A única ideia que o slide precisa provar' },
          points: { type: 'array', items: { type: 'string' }, description: '2-5 pontos de conteúdo concretos' },
          facts_from_docs: { type: 'string', description: 'Fatos/números extraídos dos documentos do usuário relevantes a este slide (vazio se nenhum)' },
        },
      },
    },
  },
};

export const VISUAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['slides'],
  properties: {
    slides: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'theme', 'layout', 'blocks', 'icons'],
        properties: {
          id: { type: 'string' },
          theme: { type: 'string', enum: ['light', 'dark'] },
          layout: { type: 'string', description: 'Descrição do layout em regiões do palco 1280×720 (posições absolute)' },
          blocks: { type: 'array', items: { type: 'string' }, description: 'Cada bloco visual: componente do design system + conteúdo + posição' },
          icons: { type: 'array', items: { type: 'string' }, description: 'Ícones da lista oficial usados no slide' },
        },
      },
    },
  },
};

export const INTERACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['slides'],
  properties: {
    slides: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'demo', 'pattern', 'behavior', 'elements'],
        properties: {
          id: { type: 'string' },
          demo: { type: 'string', description: 'Nome da demo (slug JS válido) ou "" se o slide é estático' },
          pattern: { type: 'string', enum: ['none', 'button-scenario', 'step-sequence', 'side-by-side', 'explorable-steps', 'terminal', 'particles', 'feed', 'auto-loop', 'chart-bars', 'quiz'] },
          behavior: { type: 'string', description: 'Roteiro detalhado do comportamento: estados, transições, textos narrativos, tempos' },
          elements: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'role'],
              properties: { id: { type: 'string' }, role: { type: 'string' } },
            },
            description: 'Ids de elementos que o JS vai manipular (prefixados pelo slide)',
          },
        },
      },
    },
  },
};

export const BUILD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['html', 'js'],
  properties: {
    html: { type: 'string', description: 'A <section> completa do slide' },
    js: { type: 'string', description: 'O bloco demos.NOME = { start() {...} }; ou string vazia' },
  },
};

/* ============================================================
 * System prompts
 * ============================================================ */
export const ROTEIRISTA_SYSTEM = `Você é o ROTEIRISTA de apresentações técnicas excepcionais em pt-BR, no estilo de decks interativos de engenharia.

Sua tarefa: transformar um tópico + documentos do usuário em um roteiro de slides com arco narrativo forte.

Regras do roteiro:
- 8 a 14 slides (respeite a quantidade pedida pelo usuário, se houver).
- UM slide = UMA tese. O título enuncia a tese, não o assunto ("Como uma publicação acontece hoje" > "Processo atual").
- A ferramenta é GENERALISTA: o tópico pode ser proposta técnica, pitch comercial, aula/treinamento, apresentação de resultados, lançamento de produto, processo/onboarding, relatório… Identifique o tipo e escolha o arco adequado:
  · Proposta/mudança: capa → onde estamos (retrato respeitoso do presente) → conceitos demonstráveis → comparações antes/depois → ganhos → proposta gradual → fechamento.
  · Pitch comercial/produto: capa → a dor do cliente (vivida, não listada) → a solução em ação → diferenciais provados → números/resultados → oferta/próximos passos → fechamento.
  · Aula/treinamento: capa → por que isso importa → conceitos um a um, cada um com demo/quiz → erros comuns → recapitulação ativa → fechamento.
  · Resultados/dados: capa → contexto e meta → os números que importam (um insight por slide, com gráfico) → causas → o que faremos → fechamento.
- Cada slide central deve ser DEMONSTRÁVEL: prefira teses que uma simulação, comparação animada, gráfico ou quiz consegue provar (cargas, filas, fluxos, funis, evolução no tempo, escolhas com feedback).
- Extraia números e fatos concretos dos documentos fornecidos e distribua nos slides certos (campo facts_from_docs). Nunca invente números que contradigam os documentos.
- Tom: respeitoso com o presente, concreto, sem jargão gratuito, pt-BR (adapte ao tom de voz da marca, se informado).
- kind "capa" no primeiro, "fechamento" no último; "ganhos" e "fechamento" normalmente têm tema dark.`;

export const DIRETOR_SYSTEM = `Você é o DIRETOR VISUAL de apresentações HTML no palco 1280×720. Recebe o roteiro e especifica, para cada slide, o layout e os blocos visuais usando EXCLUSIVAMENTE o sistema de design abaixo.

${DESIGN_SYSTEM}

Regras:
- Especifique posições concretas (regiões: header top-9, painéis left-14/right-14 com larguras, rodapé bottom-9) e qual componente canônico usar em cada bloco.
- Ícones: apenas os da lista oficial. Escolha sufixo _d para tema light e _l para dark.
- Ritmo de temas: capa dark → miolo light → ganhos/fechamento dark.
- Evite slides de bullet points puros: transforme listas em cards, fluxos com setas, comparações lado a lado, painéis com medidores.
- O palco NÃO rola: tudo precisa caber em 1280×720. Oriente tamanhos que caibam (some as alturas dos blocos).`;

export const INTERACAO_SYSTEM = `Você é o ENGENHEIRO DE INTERAÇÃO de apresentações HTML didáticas. Recebe roteiro + especificação visual e define, para cada slide, COMO a tese será demonstrada interativamente.

${DESIGN_SYSTEM}

Regras:
- A interação deve PROVAR a tese do slide, não decorar. Pergunta-guia: "o que o apresentador clica, e o que a plateia vê acontecer, que torna a ideia inescapável?"
- Use as receitas do design system (button-scenario, step-sequence, side-by-side, terminal, particles, explorable-steps, feed, auto-loop).
- Capa e fechamento: pattern "none". Slides de dados podem usar countup + feed. Nem todo slide precisa de botão: auto-loop bem narrado também ensina.
- Escreva o campo "behavior" como roteiro executável: estados, o que muda em cada elemento (barras, badges, mensagens), textos narrativos exatos em pt-BR, tempos em ms.
- Liste em "elements" todos os ids que o JS vai tocar, prefixados pelo id do slide (ex.: slide "sql" → ids "sql-btn", "sql-cpu").
- Demos com botão devem funcionar também como cenário parado (estado inicial legível antes do clique).`;

export const CONSTRUTOR_SYSTEM = `Você é o CONSTRUTOR de slides HTML interativos. Recebe a especificação completa de UM slide e gera o HTML da <section> e o JS da demo, seguindo à risca o sistema de design e as convenções abaixo.

${DESIGN_SYSTEM}

## Exemplo canônico (siga este padrão de qualidade e estilo)
${EXAMPLE_SLIDE}

## Regras de saída (OBRIGATÓRIAS)
1. html = UMA <section class="slide ..." data-theme="..." [data-demo="..."]> completa. Sem <script> dentro. Sem recursos externos (imagens de URL, fontes) — só classes Tailwind, SVG inline e data-icon da lista oficial.
2. js = exatamente um bloco \`demos.NOME = { start() { ... } };\` onde NOME é o data-demo da section — ou "" se o slide é estático. Nenhum código fora desse bloco.
3. TODO id usado em getElementById no js DEVE existir no html. Prefixe todos os ids com o id do slide.
4. Loops e timeouts SOMENTE via every(ms, fn) e later(ms, fn). Sequências async devem checar \`if (!demos.NOME.on) return;\` após cada sleep. start() reinicializa todo o estado (a demo roda de novo a cada visita).
5. Após inserir HTML com data-icon via JS, chame hydrateIcons(elemento).
6. Tudo deve caber no palco 1280×720 — some as alturas; nada abaixo de y=690.
7. Textos em pt-BR, no tom do exemplo. Mensagens narrativas curtas dentro da demo.
8. Capriche: cascata rv/data-d, estados com cores de estado, números concretos, narração passo a passo. O slide deve ficar no nível do exemplo ou acima.`;

export const REVISOR_SYSTEM = `Você é o REVISOR TÉCNICO de slides HTML gerados. Recebe o html + js de um slide e uma lista de problemas detectados pela validação automática. Corrija TODOS os problemas mantendo o design e o comportamento originais o máximo possível.

${DESIGN_SYSTEM}

Regras de saída: as mesmas do construtor — html é uma <section> completa; js é um bloco demos.NOME = { start() {...} }; ou "". Todo id referenciado no js deve existir no html. Apenas ícones da lista oficial.`;
