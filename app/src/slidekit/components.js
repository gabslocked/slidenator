/**
 * components.js — biblioteca de componentes do SlideKit.
 *
 * Cada entrada expõe metadados (doc/props/example) usados por CATALOG e
 * CATALOG_PROMPT (fonte única) e um `render(ctx)` puro que devolve
 * { html, js }. `ctx = { props, g, T, d0, sid, demo }`:
 *   g    geometria já calculada { left, top, width, height }
 *   T    tokens de classe do tema (grid.tokens)
 *   d0   atraso-base de reveal (ms) deste componente
 *   sid  índice do slide (prefixo de id: `s${sid}-…`)
 *   demo nome da demo do slide (`sk${sid}`) — só para interativos
 *
 * Componentes puros retornam js:''. Interativos retornam em `js` o CORPO
 * (statements) a ser embrulhado em `demos.${demo}={start(){…}}` pelo index.
 * Estética: mesmas classes/tokens do template atual (bg-paper/bg-ink, text-lime,
 * rounded-2xl, cards com border, tipografia utilitária).
 */
import { ICONS } from './icons.js';
import { esc, rvAttr, STATE } from './grid.js';

export const STEP = 60; // stagger padrão entre filhos de um componente

/** SVG inline de um ícone Lucide vendorizado (herda cor via currentColor). */
export function svgIcon(name, cls = 'w-6 h-6') {
  const inner = ICONS[name];
  if (!inner) return `<span class="${cls} inline-block align-middle"></span>`;
  return `<svg class="${cls} inline-block align-middle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

const clamp = (n) =>
  `overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${n}`;

const num = (v) =>
  typeof v === 'number' ? v.toLocaleString('pt-BR') : esc(v);

function countupSpan(value, { prefix = '', suffix = '', decimals = 0, cls = '' }) {
  return `<span class="${cls}" data-countup data-target="${Number(value) || 0}"` +
    (prefix ? ` data-prefix="${esc(prefix)}"` : '') +
    (suffix ? ` data-suffix="${esc(suffix)}"` : '') +
    (decimals ? ` data-decimals="${decimals}"` : '') +
    `>0</span>`;
}

/* barra que cresce sozinha 0→largura (CSS .sk-grow do skeleton) */
function growBar(pct, color, delayMs, h = 'h-2.5') {
  return `<div class="sk-grow bar-fill ${h} rounded-full" style="width:${Math.max(0, Math.min(100, pct))}%;background:${color};--skd:${(delayMs / 1000).toFixed(2)}s"></div>`;
}

export const COMPONENTS = {
  /* ---------------------------------------------------------------- conteúdo */
  heading: {
    doc: 'Cabeçalho do slide: kicker + título (a tese) + subtítulo.',
    props: { kicker: '?', title: '!', sub: '?' },
    example: { type: 'heading', area: [1, 1, 8, 3], props: { kicker: 'CONCEITO 01 · DOCKER', title: 'Como um container sobe em segundos', sub: 'Aperte e veja a imagem virar processo isolado.' } },
    render({ props, T, d0 }) {
      let h = '';
      if (props.kicker) h += `<p ${rvAttr(`${T.kicker} text-[11px] font-bold tracking-[.3em]`, d0)}>${esc(props.kicker)}</p>`;
      h += `<h2 ${rvAttr(`mt-1.5 text-[30px] font-bold leading-tight ${T.strong}`, d0 + STEP)} style="${clamp(2)}">${esc(props.title)}</h2>`;
      if (props.sub) h += `<p ${rvAttr(`mt-1.5 ${T.muted} text-[14px] font-light`, d0 + STEP * 2)} style="${clamp(3)}">${esc(props.sub)}</p>`;
      return { html: h, js: '' };
    },
  },

  text: {
    doc: 'Bloco de texto corrido (parágrafo). size: sm|md|lg.',
    props: { text: '!', size: '?(md)', strong: '?false' },
    example: { type: 'text', area: [1, 4, 6, 3], props: { text: 'O fluxo atual funciona há anos — e é todo manual.' } },
    render({ props, g, T, d0 }) {
      const size = { sm: 'text-[12.5px]', md: 'text-[14px]', lg: 'text-[17px]' }[props.size] || 'text-[14px]';
      const weight = props.strong ? 'font-semibold' : 'font-light';
      const lines = Math.max(2, Math.floor(g.height / 22));
      return { html: `<p ${rvAttr(`${size} ${weight} ${props.strong ? T.strong : T.muted} leading-relaxed`, d0)} style="${clamp(lines)}">${esc(props.text)}</p>`, js: '' };
    },
  },

  'bullet-list': {
    doc: 'Lista de pontos com reveal escalonado e marcador lime.',
    props: { items: '![string]', icon: '?(check)' },
    example: { type: 'bullet-list', area: [1, 4, 5, 6], props: { items: ['Zero downtime', 'Rollback em 1 clique', 'Auditoria automática'] } },
    render({ props, T, d0 }) {
      const items = props.items || [];
      const rows = items.map((it, i) => {
        const mark = props.icon
          ? `<span class="${T.kicker} shrink-0 mt-0.5">${svgIcon(props.icon, 'w-4 h-4')}</span>`
          : `<span class="shrink-0 mt-[7px] w-1.5 h-1.5 rounded-full bg-lime2"></span>`;
        return `<li ${rvAttr('flex items-start gap-2.5', d0 + i * STEP)}>${mark}<span class="text-[13.5px] ${T.strong} font-light" style="${clamp(2)}">${esc(it)}</span></li>`;
      }).join('');
      return { html: `<ul class="flex flex-col gap-2.5">${rows}</ul>`, js: '' };
    },
  },

  quote: {
    doc: 'Citação em destaque com autor opcional.',
    props: { text: '!', author: '?', role: '?' },
    example: { type: 'quote', area: [2, 3, 8, 5], props: { text: 'A gente não escala pessoas, escala processos.', author: 'CTO' } },
    render({ props, T, d0 }) {
      let h = `<div ${rvAttr('flex flex-col justify-center h-full', d0)}>`;
      h += `<div class="text-lime2 text-[40px] leading-none font-serif">“</div>`;
      h += `<p class="mt-1 text-[22px] font-semibold ${T.strong} leading-snug" style="${clamp(4)}">${esc(props.text)}</p>`;
      if (props.author) h += `<p class="mt-3 text-[12px] font-bold tracking-wider ${T.kicker}">${esc(props.author)}${props.role ? ` · <span class="${T.muted} font-medium">${esc(props.role)}</span>` : ''}</p>`;
      h += `</div>`;
      return { html: h, js: '' };
    },
  },

  badge: {
    doc: 'Pílula(s) de rótulo/estado. items para várias.',
    props: { text: '?', items: '?[string]', tone: '?(ok)ok|warn|bad' },
    example: { type: 'badge', area: [1, 1, 3, 1], props: { text: 'BETA', tone: 'ok' } },
    render({ props, T, d0 }) {
      const toneCls = { ok: T.badge, warn: 'bg-amber-50 border border-amber-300 text-amber-600', bad: 'bg-red-50 border border-red-300 text-red-500' }[props.tone] || T.badge;
      const list = props.items || (props.text ? [props.text] : []);
      const pills = list.map((t, i) => `<span ${rvAttr(`inline-flex items-center rounded-full ${toneCls} text-[10px] font-bold tracking-[.14em] px-3 py-1`, d0 + i * STEP)}>${esc(t)}</span>`).join('');
      return { html: `<div class="flex flex-wrap items-center gap-2">${pills}</div>`, js: '' };
    },
  },

  'big-number': {
    doc: 'Número gigante com countup + rótulo. Ideal para uma estatística-âncora.',
    props: { value: '!', prefix: '?', suffix: '?', decimals: '?0', label: '!', sub: '?' },
    example: { type: 'big-number', area: [1, 3, 4, 4], props: { value: 3, suffix: 'min', label: 'para publicar', sub: 'antes: 6h' } },
    render({ props, T, d0 }) {
      let h = `<div ${rvAttr('flex flex-col justify-center h-full', d0)}>`;
      h += `<div class="text-[54px] font-extrabold text-lime leading-none tracking-tight">${countupSpan(props.value, props)}</div>`;
      h += `<p class="mt-2 text-[14px] font-bold ${T.strong}">${esc(props.label)}</p>`;
      if (props.sub) h += `<p class="mt-0.5 text-[12px] ${T.muted} font-light">${esc(props.sub)}</p>`;
      h += `</div>`;
      return { html: h, js: '' };
    },
  },

  kpi: {
    doc: 'Cartão de indicador: ícone + valor (countup) + rótulo + tendência.',
    props: { label: '!', value: '!', prefix: '?', suffix: '?', decimals: '?0', trend: '?', icon: '?', tone: '?(ok)' },
    example: { type: 'kpi', area: [1, 2, 4, 3], props: { label: 'Pedidos/mês', value: 12400, trend: '+18%', icon: 'trending-up' } },
    render({ props, T, d0 }) {
      const trendCls = String(props.trend || '').trim().startsWith('-') ? 'text-red-500' : 'text-olive';
      let h = `<div ${rvAttr(`rounded-2xl ${T.card} border ${T.cardBorder} p-4 h-full flex flex-col justify-between`, d0)}>`;
      h += `<div class="flex items-center justify-between">`;
      h += `<span class="text-[10px] font-bold tracking-wider ${T.muted} uppercase" style="${clamp(1)}">${esc(props.label)}</span>`;
      if (props.icon) h += `<span class="${T.kicker}">${svgIcon(props.icon, 'w-4 h-4')}</span>`;
      h += `</div>`;
      h += `<div class="mt-2 text-[30px] font-extrabold ${T.strong} leading-none tracking-tight">${countupSpan(props.value, props)}</div>`;
      if (props.trend) h += `<div class="mt-1.5 text-[12px] font-bold ${trendCls}">${esc(props.trend)}</div>`;
      h += `</div>`;
      return { html: h, js: '' };
    },
  },

  'kpi-row': {
    doc: 'Fileira de KPIs (2-4). Cada item: {label,value,suffix?,trend?,icon?}.',
    props: { items: '![{label,value,…}]' },
    example: { type: 'kpi-row', area: [1, 8, 10, 3], props: { items: [{ label: 'Uptime', value: 99.9, suffix: '%' }, { label: 'Deploys/dia', value: 42, icon: 'rocket' }, { label: 'MTTR', value: 8, suffix: 'min', trend: '-40%' }] } },
    render({ props, T, d0 }) {
      const items = props.items || [];
      const cards = items.map((it, i) => {
        const trendCls = String(it.trend || '').trim().startsWith('-') ? 'text-red-500' : 'text-olive';
        let c = `<div ${rvAttr(`flex-1 rounded-2xl ${T.card} border ${T.cardBorder} p-4 flex flex-col justify-between`, d0 + i * STEP)}>`;
        c += `<div class="flex items-center justify-between"><span class="text-[10px] font-bold tracking-wider ${T.muted} uppercase" style="${clamp(1)}">${esc(it.label)}</span>${it.icon ? `<span class="${T.kicker}">${svgIcon(it.icon, 'w-4 h-4')}</span>` : ''}</div>`;
        c += `<div class="mt-2 text-[26px] font-extrabold ${T.strong} leading-none">${countupSpan(it.value, it)}</div>`;
        if (it.trend) c += `<div class="mt-1 text-[11px] font-bold ${trendCls}">${esc(it.trend)}</div>`;
        c += `</div>`;
        return c;
      }).join('');
      return { html: `<div class="flex items-stretch gap-3 h-full">${cards}</div>`, js: '' };
    },
  },

  table: {
    doc: 'Tabela compacta. columns:[string], rows:[[cell,…]]. highlightRow? índice.',
    props: { columns: '![string]', rows: '![[string]]', highlightRow: '?' },
    example: { type: 'table', area: [1, 4, 8, 6], props: { columns: ['Plano', 'Preço', 'Slots'], rows: [['Free', 'R$0', '3'], ['Pro', 'R$49', '∞']] } },
    render({ props, T, d0 }) {
      const cols = props.columns || [];
      const head = cols.map((c) => `<th class="text-left font-bold text-[10px] tracking-wider ${T.muted} uppercase pb-2 px-2">${esc(c)}</th>`).join('');
      const body = (props.rows || []).map((r, ri) => {
        const hl = ri === props.highlightRow;
        const cells = r.map((c, ci) => `<td class="py-2 px-2 text-[12.5px] ${ci === 0 ? `font-semibold ${T.strong}` : `${T.muted} font-light`}">${esc(c)}</td>`).join('');
        return `<tr ${rvAttr(`border-t ${T.hair} ${hl ? 'bg-limetint/40' : ''}`, d0 + ri * (STEP / 2))}>${cells}</tr>`;
      }).join('');
      return { html: `<div ${rvAttr(`rounded-2xl ${T.card} border ${T.cardBorder} p-3 h-full overflow-hidden`, d0)}><table class="w-full border-collapse"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`, js: '' };
    },
  },

  comparison: {
    doc: 'Duas colunas antes/depois. before/after: {title, items:[string], tone?}.',
    props: { before: '!{title,items}', after: '!{title,items}' },
    example: { type: 'comparison', area: [1, 4, 10, 6], props: { before: { title: 'Manual', items: ['6h por deploy', 'Erros humanos'] }, after: { title: 'Automatizado', items: ['3min', 'Zero erro'] } } },
    render({ props, T, d0 }) {
      const col = (side, tone, dOff) => {
        const badTone = tone === 'bad';
        const accent = badTone ? 'border-red-300' : 'border-lime2';
        const dot = badTone ? 'bg-red-400' : 'bg-lime2';
        const items = (side.items || []).map((it, i) => `<li ${rvAttr('flex items-start gap-2', d0 + dOff + i * STEP)}><span class="shrink-0 mt-[7px] w-1.5 h-1.5 rounded-full ${dot}"></span><span class="text-[13px] ${T.strong} font-light" style="${clamp(2)}">${esc(it)}</span></li>`).join('');
        return `<div ${rvAttr(`flex-1 rounded-2xl ${T.card} border-2 ${accent} p-4`, d0 + dOff)}><p class="text-[11px] font-bold tracking-wider ${badTone ? 'text-red-500' : T.kicker} uppercase">${esc(side.title)}</p><ul class="mt-3 flex flex-col gap-2">${items}</ul></div>`;
      };
      const arrow = `<div class="flex items-center px-1 ${T.muted}">${svgIcon('arrow-right', 'w-6 h-6')}</div>`;
      return { html: `<div class="flex items-stretch gap-2 h-full">${col(props.before, props.before.tone || 'bad', 0)}${arrow}${col(props.after, props.after.tone || 'ok', STEP * 2)}</div>`, js: '' };
    },
  },

  timeline: {
    doc: 'Linha do tempo. orientation h|v. items:[{time,title,text?}].',
    props: { items: '![{time,title,text}]', orientation: '?(v)h|v' },
    example: { type: 'timeline', area: [1, 4, 5, 7], props: { items: [{ time: '2019', title: 'Início', text: '1 servidor' }, { time: '2024', title: 'Escala', text: '40 nós' }] } },
    render({ props, T, d0 }) {
      const items = props.items || [];
      if (props.orientation === 'h') {
        const cells = items.map((it, i) => `<div ${rvAttr('flex-1 relative', d0 + i * STEP)}><div class="flex items-center"><span class="w-3 h-3 rounded-full bg-lime2 shrink-0"></span>${i < items.length - 1 ? `<span class="flex-1 h-0.5 bg-lime2/40"></span>` : ''}</div><p class="mt-2 text-[11px] font-bold ${T.kicker}">${esc(it.time)}</p><p class="text-[13px] font-bold ${T.strong}" style="${clamp(1)}">${esc(it.title)}</p>${it.text ? `<p class="text-[11px] ${T.muted} font-light" style="${clamp(2)}">${esc(it.text)}</p>` : ''}</div>`).join('');
        return { html: `<div class="flex items-start gap-2 h-full">${cells}</div>`, js: '' };
      }
      const rows = items.map((it, i) => `<div ${rvAttr('flex gap-3', d0 + i * STEP)}><div class="flex flex-col items-center shrink-0"><span class="w-3 h-3 rounded-full bg-lime2 mt-1"></span>${i < items.length - 1 ? `<span class="flex-1 w-0.5 bg-lime2/40 my-1"></span>` : ''}</div><div class="pb-3"><p class="text-[11px] font-bold ${T.kicker}">${esc(it.time)}</p><p class="text-[14px] font-bold ${T.strong}" style="${clamp(1)}">${esc(it.title)}</p>${it.text ? `<p class="text-[12px] ${T.muted} font-light" style="${clamp(2)}">${esc(it.text)}</p>` : ''}</div></div>`).join('');
      return { html: `<div class="flex flex-col h-full">${rows}</div>`, js: '' };
    },
  },

  flow: {
    doc: 'Fluxo de nós conectados por setas. nodes:[{icon?,title,text?}].',
    props: { nodes: '![{icon,title,text}]' },
    example: { type: 'flow', area: [1, 5, 10, 4], props: { nodes: [{ icon: 'file-code', title: 'Commit' }, { icon: 'cog', title: 'Build' }, { icon: 'rocket', title: 'Deploy' }] } },
    render({ props, T, d0 }) {
      const nodes = props.nodes || [];
      const arrow = `<svg class="self-center shrink-0" width="26" height="14" viewBox="0 0 26 14"><path d="M0 7h19M14 2l6 5-6 5" stroke="#9AA1A4" stroke-width="2.2" fill="none"/></svg>`;
      const parts = [];
      nodes.forEach((nd, i) => {
        parts.push(`<div ${rvAttr(`flex-1 rounded-2xl ${T.card} border ${T.cardBorder} p-3 text-center`, d0 + i * STEP)}>${nd.icon ? `<span class="${T.kicker} inline-flex justify-center w-full">${svgIcon(nd.icon, 'w-7 h-7')}</span>` : ''}<p class="mt-1.5 font-bold text-[13px] ${T.strong}" style="${clamp(1)}">${esc(nd.title)}</p>${nd.text ? `<p class="mt-0.5 text-[10.5px] ${T.muted} font-light" style="${clamp(2)}">${esc(nd.text)}</p>` : ''}</div>`);
        if (i < nodes.length - 1) parts.push(`<div ${rvAttr('flex', d0 + i * STEP + 30)}>${arrow}</div>`);
      });
      return { html: `<div class="flex items-stretch gap-2 h-full">${parts.join('')}</div>`, js: '' };
    },
  },

  'icon-feature': {
    doc: 'Cartão único: ícone + título + descrição.',
    props: { icon: '!', title: '!', text: '?' },
    example: { type: 'icon-feature', area: [1, 5, 4, 4], props: { icon: 'shield-check', title: 'Seguro', text: 'Criptografia ponta a ponta.' } },
    render({ props, T, d0 }) {
      return { html: `<div ${rvAttr(`rounded-2xl ${T.card} border ${T.cardBorder} p-4 h-full flex flex-col`, d0)}><span class="inline-flex w-10 h-10 items-center justify-center rounded-xl bg-limetint ${T.dark ? '' : ''} text-olive">${svgIcon(props.icon, 'w-5 h-5')}</span><p class="mt-3 font-bold text-[15px] ${T.strong}" style="${clamp(1)}">${esc(props.title)}</p>${props.text ? `<p class="mt-1 text-[12.5px] ${T.muted} font-light" style="${clamp(3)}">${esc(props.text)}</p>` : ''}</div>`, js: '' };
    },
  },

  'feature-grid': {
    doc: 'Grade de features (cols 2-4). items:[{icon,title,text}].',
    props: { items: '![{icon,title,text}]', cols: '?(3)' },
    example: { type: 'feature-grid', area: [1, 4, 10, 6], props: { cols: 3, items: [{ icon: 'zap', title: 'Rápido', text: '10x' }, { icon: 'lock', title: 'Seguro' }, { icon: 'globe', title: 'Global' }] } },
    render({ props, T, d0 }) {
      const cols = props.cols || 3;
      const cards = (props.items || []).map((it, i) => `<div ${rvAttr(`rounded-2xl ${T.card} border ${T.cardBorder} p-3.5`, d0 + i * STEP)}><span class="${T.kicker}">${svgIcon(it.icon, 'w-6 h-6')}</span><p class="mt-2 font-bold text-[13.5px] ${T.strong}" style="${clamp(1)}">${esc(it.title)}</p>${it.text ? `<p class="mt-0.5 text-[11.5px] ${T.muted} font-light" style="${clamp(2)}">${esc(it.text)}</p>` : ''}</div>`).join('');
      return { html: `<div class="grid gap-3 h-full" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${cards}</div>`, js: '' };
    },
  },

  progress: {
    doc: 'Barras de progresso horizontais que crescem ao entrar. items:[{label,value(0-100),suffix?,tone?}].',
    props: { items: '![{label,value,suffix?}]' },
    example: { type: 'progress', area: [1, 4, 6, 5], props: { items: [{ label: 'Cobertura', value: 84, suffix: '%' }, { label: 'Satisfação', value: 92, suffix: '%' }] } },
    render({ props, T, d0 }) {
      const rows = (props.items || []).map((it, i) => {
        const color = { warn: STATE.warn, bad: STATE.bad, ok: STATE.ok }[it.tone] || STATE.ok;
        return `<div ${rvAttr('', d0 + i * STEP)}><div class="flex justify-between items-baseline mb-1"><span class="text-[12px] font-semibold ${T.strong}" style="${clamp(1)}">${esc(it.label)}</span><b class="text-[12px] ${T.kicker}">${num(it.value)}${esc(it.suffix || '')}</b></div><div class="h-2.5 rounded-full ${T.track}">${growBar(it.value, color, d0 + i * STEP + 120)}</div></div>`;
      }).join('');
      return { html: `<div class="flex flex-col justify-center gap-3.5 h-full">${rows}</div>`, js: '' };
    },
  },

  'bar-chart': {
    doc: 'Gráfico de barras verticais animadas. data:[{label,value,highlight?}], max?.',
    props: { data: '![{label,value}]', max: '?', suffix: '?' },
    example: { type: 'bar-chart', area: [1, 4, 7, 7], props: { data: [{ label: 'Jan', value: 30 }, { label: 'Fev', value: 52 }, { label: 'Mar', value: 78, highlight: true }] } },
    render({ props, g, T, d0 }) {
      const data = props.data || [];
      const max = props.max || Math.max(1, ...data.map((d) => Number(d.value) || 0));
      const chartH = Math.max(40, g.height - 46);
      const bars = data.map((d, i) => {
        const pct = Math.round(((Number(d.value) || 0) / max) * 100);
        const px = Math.round((pct / 100) * chartH);
        const color = d.highlight ? '#D8E022' : STATE.ok;
        return `<div class="flex-1 flex flex-col items-center justify-end gap-1 h-full">` +
          `<b class="text-[11px] font-bold ${d.highlight ? 'text-lime2' : T.muted}">${num(d.value)}${esc(props.suffix || '')}</b>` +
          `<div class="sk-growh w-full max-w-[46px] rounded-t-lg" style="height:${px}px;background:${color};--skd:${((d0 + i * STEP + 100) / 1000).toFixed(2)}s"></div>` +
          `<span class="text-[10px] ${T.muted} font-medium truncate max-w-full">${esc(d.label)}</span></div>`;
      }).join('');
      return { html: `<div ${rvAttr('flex items-end gap-2 h-full', d0)}>${bars}</div>`, js: '' };
    },
  },

  'line-chart': {
    doc: 'Gráfico de linha (SVG) com traço que se desenha. data:[number], labels?.',
    props: { data: '![number]', labels: '?[string]' },
    example: { type: 'line-chart', area: [1, 4, 8, 6], props: { data: [12, 28, 22, 46, 62, 58, 80] } },
    render({ props, g, T, d0 }) {
      const data = (props.data || []).map(Number);
      const W = g.width - 24, H = g.height - 40;
      const max = Math.max(1, ...data), min = Math.min(0, ...data);
      const pts = data.map((v, i) => {
        const x = data.length > 1 ? (i / (data.length - 1)) * W : 0;
        const y = H - ((v - min) / (max - min || 1)) * H;
        return [x + 12, y + 8];
      });
      const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      const dots = pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="#9EC100"/>`).join('');
      const labels = (props.labels || []).map((l, i) => `<span class="text-[10px] ${T.muted}">${esc(l)}</span>`).join('');
      return {
        html: `<div ${rvAttr('h-full flex flex-col', d0)}><svg class="w-full" viewBox="0 0 ${g.width} ${H + 16}" preserveAspectRatio="none" style="height:${H + 16}px"><path d="${path}" fill="none" stroke="#9EC100" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" class="sk-draw" style="--sklen:1;--skd:${((d0 + 80) / 1000).toFixed(2)}s"/>${dots}</svg>${labels ? `<div class="flex justify-between mt-1 px-1">${labels}</div>` : ''}</div>`,
        js: '',
      };
    },
  },

  donut: {
    doc: 'Rosca de proporção (SVG) que se desenha. value 0-100 + rótulo central.',
    props: { value: '!', label: '?', suffix: '?(%)' },
    example: { type: 'donut', area: [1, 4, 4, 5], props: { value: 72, label: 'concluído' } },
    render({ props, T, d0 }) {
      const v = Math.max(0, Math.min(100, Number(props.value) || 0));
      const suffix = props.suffix != null ? props.suffix : '%';
      return {
        html: `<div ${rvAttr('h-full flex flex-col items-center justify-center', d0)}><div class="relative"><svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" stroke-width="14" class="${T.track}" opacity="0.35"/><circle cx="60" cy="60" r="50" fill="none" stroke="#9EC100" stroke-width="14" stroke-linecap="round" pathLength="100" stroke-dasharray="${v} 100" transform="rotate(-90 60 60)" class="sk-draw" style="--sklen:${v};--skd:${((d0 + 80) / 1000).toFixed(2)}s"/></svg><div class="absolute inset-0 flex flex-col items-center justify-center"><b class="text-[26px] font-extrabold ${T.strong} leading-none">${num(props.value)}${esc(suffix)}</b></div></div>${props.label ? `<p class="mt-2 text-[12px] ${T.muted} font-medium">${esc(props.label)}</p>` : ''}</div>`,
        js: '',
      };
    },
  },

  terminal: {
    doc: 'Janela de terminal/log fake. title?, lines:[{text,tone?}].',
    props: { title: '?', lines: '![{text,tone}]' },
    example: { type: 'terminal', area: [1, 4, 8, 5], props: { title: 'deploy.sh', lines: [{ text: '$ git push', tone: 'cmd' }, { text: '✓ build ok', tone: 'ok' }] } },
    render({ props, d0 }) {
      const toneCls = { cmd: 'text-white', ok: 'text-lime', warn: 'text-amber-400', bad: 'text-red-400', mut: 'text-mut' };
      const lines = (props.lines || []).map((l, i) => `<div ${rvAttr(`${toneCls[l.tone] || 'text-mut'} whitespace-pre`, d0 + 60 + i * 40)} style="${clamp(1)}">${esc(l.text)}</div>`).join('');
      return { html: `<div ${rvAttr('rounded-xl overflow-hidden border border-edge bg-ink font-mono text-[12px] h-full flex flex-col', d0)}><div class="flex items-center gap-1.5 px-3 py-2 border-b border-edge shrink-0"><span class="w-2.5 h-2.5 rounded-full bg-red-400"></span><span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span><span class="w-2.5 h-2.5 rounded-full bg-lime2"></span>${props.title ? `<span class="ml-2 text-[10.5px] text-mut">${esc(props.title)}</span>` : ''}</div><div class="p-3 flex flex-col gap-0.5 overflow-hidden leading-relaxed">${lines}</div></div>`, js: '' };
    },
  },

  logo: {
    doc: 'Marca em destaque (usa brand do contexto se name ausente).',
    props: { name: '?', tagline: '?' },
    example: { type: 'logo', area: [1, 1, 4, 2], props: { name: 'ACME' } },
    render({ props, T, d0, brand }) {
      const name = props.name || brand || 'MARCA';
      return { html: `<div ${rvAttr('flex flex-col justify-center h-full', d0)}><span class="inline-flex items-center gap-2 text-[22px] font-extrabold tracking-tight ${T.strong}"><span class="w-3 h-3 rounded-sm bg-lime"></span>${esc(name)}</span>${props.tagline ? `<span class="mt-1 text-[11px] tracking-widest ${T.muted} uppercase">${esc(props.tagline)}</span>` : ''}</div>`, js: '' };
    },
  },

  divider: {
    doc: 'Separador horizontal, com rótulo opcional.',
    props: { label: '?' },
    example: { type: 'divider', area: [1, 6, 10, 1], props: { label: 'RESULTADOS' } },
    render({ props, T, d0 }) {
      if (props.label) return { html: `<div ${rvAttr('flex items-center gap-3 h-full', d0)}><span class="text-[10px] font-bold tracking-[.3em] ${T.muted} uppercase shrink-0">${esc(props.label)}</span><span class="flex-1 h-px ${T.dark ? 'bg-edge' : 'bg-neutral-300'}"></span></div>`, js: '' };
      return { html: `<div ${rvAttr('flex items-center h-full', d0)}><span class="flex-1 h-px ${T.dark ? 'bg-edge' : 'bg-neutral-300'}"></span></div>`, js: '' };
    },
  },

  'image-placeholder': {
    doc: 'Moldura de imagem (sem recurso externo) com ícone + legenda.',
    props: { icon: '?(image)', caption: '?' },
    example: { type: 'image-placeholder', area: [7, 4, 4, 6], props: { caption: 'Dashboard' } },
    render({ props, T, d0 }) {
      return { html: `<div ${rvAttr(`rounded-2xl border-2 border-dashed ${T.dark ? 'border-edge' : 'border-neutral-300'} h-full flex flex-col items-center justify-center gap-2 ${T.card2}`, d0)}><span class="${T.muted}">${svgIcon(props.icon || 'image', 'w-8 h-8')}</span>${props.caption ? `<span class="text-[11px] ${T.muted} font-medium">${esc(props.caption)}</span>` : ''}</div>`, js: '' };
    },
  },

  /* ------------------------------------------------------------- interativos */
  'counter-sim': {
    interactive: true,
    doc: 'Gerador de carga: botão liga/desliga; métrica e barra sobem/descem ao vivo.',
    props: { label: '!', unit: '?(%)', button: '?(GERAR CARGA)', min: '?12', max: '?96', metric: '?carga' },
    example: { type: 'counter-sim', area: [1, 4, 6, 5], props: { label: 'API de pedidos', metric: 'CPU', button: 'ESTRESSAR' } },
    render({ props, T, d0, sid, demo }) {
      const p = `s${sid}`;
      const unit = props.unit != null ? props.unit : '%';
      const btn = props.button || 'GERAR CARGA';
      const html = `<div ${rvAttr(`rounded-2xl ${T.card} border ${T.cardBorder} p-5 h-full flex flex-col`, d0)}>` +
        `<div class="flex items-center gap-3"><span class="${T.kicker}">${svgIcon('activity', 'w-5 h-5')}</span><p class="font-bold text-[14px] ${T.strong}">${esc(props.label)}</p><span id="${p}-state" class="ml-auto rounded-full ${T.badge} text-[10px] font-bold px-2.5 py-1">SAUDÁVEL</span></div>` +
        `<div class="mt-4 flex justify-between items-baseline text-[11px]"><span class="font-bold tracking-wider ${T.muted} uppercase">${esc(props.metric || 'carga')}</span><b id="${p}-val" class="${T.strong} text-[15px]">${props.min || 12}${esc(unit)}</b></div>` +
        `<div class="mt-1.5 h-3 rounded-full ${T.track}"><div id="${p}-bar" class="bar-fill h-3 rounded-full" style="width:${props.min || 12}%;background:${STATE.ok}"></div></div>` +
        `<p class="mt-4 text-[12px] ${T.muted} font-light">requisições atendidas: <b id="${p}-n" class="${T.strong}">0</b></p>` +
        `<button id="${p}-btn" class="btn mt-auto self-start rounded-xl bg-lime text-ink font-bold px-5 py-2.5 text-[12px]">${esc(btn)}</button>` +
        `</div>`;
      const js = `/* counter-sim slide ${sid} */
{
  const btn = document.getElementById('${p}-btn');
  const val = document.getElementById('${p}-val'), bar = document.getElementById('${p}-bar');
  const state = document.getElementById('${p}-state'), nEl = document.getElementById('${p}-n');
  const LO = ${props.min || 12}, HI = ${props.max || 96};
  let load = false, c = LO, n = 0;
  btn.textContent = ${JSON.stringify(btn)};
  btn.onclick = () => { load = !load; btn.textContent = load ? 'ALIVIAR' : ${JSON.stringify(btn)}; };
  every(300, () => {
    if (!demos.${demo}.on) return;
    c = Math.max(LO, Math.min(HI, c + (load ? 9 : -8) + (Math.random() * 4 - 2)));
    n += load ? 3 : 1;
    val.textContent = Math.round(c) + ${JSON.stringify(unit)};
    bar.style.width = c + '%';
    bar.style.background = c > 85 ? '${STATE.bad}' : c > 62 ? '${STATE.warn}' : '${STATE.ok}';
    state.textContent = c > 85 ? 'SATURADO' : c > 62 ? 'SOB PRESSÃO' : 'SAUDÁVEL';
    state.className = 'ml-auto rounded-full text-[10px] font-bold px-2.5 py-1 ' + (c > 85 ? 'bg-red-50 border border-red-300 text-red-500' : c > 62 ? 'bg-amber-50 border border-amber-300 text-amber-600' : '${T.badge}');
    nEl.textContent = n.toLocaleString('pt-BR');
  });
}`;
      return { html, js };
    },
  },

  'toggle-sim': {
    interactive: true,
    doc: 'Comparação comutável antes/depois: um botão alterna os dois estados no mesmo painel.',
    props: { off: '!{title,value,note}', on: '!{title,value,note}', button: '?(ALTERNAR)' },
    example: { type: 'toggle-sim', area: [1, 4, 7, 5], props: { off: { title: 'Manual', value: '6h', note: 'espera a janela' }, on: { title: 'Automatizado', value: '3min', note: 'a qualquer hora' } } },
    render({ props, T, d0, sid, demo }) {
      const p = `s${sid}`;
      const btn = props.button || 'ALTERNAR';
      const html = `<div ${rvAttr(`rounded-2xl ${T.card} border ${T.cardBorder} p-5 h-full flex flex-col`, d0)}>` +
        `<div class="flex items-center gap-2"><span id="${p}-tag" class="rounded-full ${T.badge} text-[10px] font-bold px-2.5 py-1">ANTES</span><span id="${p}-title" class="font-bold text-[14px] ${T.strong}">${esc(props.off.title)}</span></div>` +
        `<div id="${p}-value" class="mt-4 text-[46px] font-extrabold text-lime leading-none">${esc(props.off.value)}</div>` +
        `<p id="${p}-note" class="mt-2 text-[13px] ${T.muted} font-light">${esc(props.off.note || '')}</p>` +
        `<button id="${p}-btn" class="btn mt-auto self-start rounded-xl bg-lime text-ink font-bold px-5 py-2.5 text-[12px]">${esc(btn)}</button>` +
        `</div>`;
      const OFF = { title: props.off.title, value: props.off.value, note: props.off.note || '' };
      const ON = { title: props.on.title, value: props.on.value, note: props.on.note || '' };
      const js = `/* toggle-sim slide ${sid} */
{
  const btn = document.getElementById('${p}-btn'), tag = document.getElementById('${p}-tag');
  const title = document.getElementById('${p}-title'), value = document.getElementById('${p}-value'), note = document.getElementById('${p}-note');
  const OFF = ${JSON.stringify(OFF)}, ON = ${JSON.stringify(ON)};
  let on = false;
  function apply() {
    const s = on ? ON : OFF;
    tag.textContent = on ? 'DEPOIS' : 'ANTES';
    title.textContent = s.title; value.textContent = s.value; note.textContent = s.note;
    value.classList.add('rv'); value.classList.remove('in'); requestAnimationFrame(() => value.classList.add('in'));
  }
  on = false; apply();
  btn.onclick = () => { on = !on; apply(); };
}`;
      return { html, js };
    },
  },

  'live-feed': {
    interactive: true,
    doc: 'Feed vivo: itens chegam por cima em intervalos. items:[{icon?,text}] cicla.',
    props: { title: '?(AO VIVO)', items: '![{icon,text}]', interval: '?1400' },
    example: { type: 'live-feed', area: [7, 4, 4, 7], props: { title: 'PEDIDOS', items: [{ icon: 'shopping-cart', text: 'Novo pedido #1024' }, { icon: 'user', text: 'Cliente cadastrado' }] } },
    render({ props, T, d0, sid, demo }) {
      const p = `s${sid}`;
      const items = (props.items || []).map((it) => ({ svg: svgIcon(it.icon || 'circle-dot', 'w-4 h-4'), text: it.text }));
      const html = `<div ${rvAttr(`rounded-2xl ${T.card} border ${T.cardBorder} p-4 h-full flex flex-col overflow-hidden`, d0)}>` +
        `<div class="flex items-center gap-2 shrink-0"><span class="w-2 h-2 rounded-full bg-lime2 hb"></span><p class="text-[10px] font-bold tracking-widest ${T.muted} uppercase">${esc(props.title || 'AO VIVO')}</p></div>` +
        `<div id="${p}-feed" class="mt-3 flex flex-col gap-2 overflow-hidden"></div></div>`;
      const js = `/* live-feed slide ${sid} */
{
  const feed = document.getElementById('${p}-feed');
  const ITEMS = ${JSON.stringify(items)};
  let k = 0;
  feed.innerHTML = '';
  function push() {
    if (!demos.${demo}.on) return;
    const it = ITEMS[k % ITEMS.length]; k++;
    const row = document.createElement('div');
    row.className = 'pod pop flex items-center gap-2.5 rounded-xl ${T.dark ? 'bg-card2' : 'bg-limetint/50'} border ${T.cardBorder} px-3 py-2';
    row.innerHTML = '<span class="${T.kicker}">' + it.svg + '</span><span class="text-[12px] ${T.strong} font-medium truncate">' + it.text + '</span><span class="ml-auto text-[9px] ${T.muted}">agora</span>';
    feed.insertBefore(row, feed.firstChild);
    while (feed.children.length > 5) feed.removeChild(feed.lastChild);
  }
  push(); every(${props.interval || 1400}, push);
}`;
      return { html, js };
    },
  },
};
