/**
 * SlideKit — sistema de componentes prontos do Slidenator.
 *
 * A IA deixa de escrever HTML e passa a preencher um JSON (spec) por slide. Este
 * módulo é a API pública (contrato §1):
 *   CATALOG        metadados de cada componente
 *   CATALOG_PROMPT string compacta p/ o prompt da IA (catálogo + regras + ícones)
 *   ICON_NAMES     nomes de ícone válidos
 *   validateSpec   (spec) -> string[] de problemas (vazio = ok). Determinístico.
 *   renderSlide    (spec, ctx) -> { html, js } no shape dos builders atuais
 *
 * Render 100% determinístico: mesmas classes/estética do template atual, grade
 * 12×12 → posicionamento absoluto em px, reveal escalonado, demos com every/later
 * e ids prefixados pelo índice do slide.
 */
import { ICONS, ICON_CATEGORIES } from './icons.js';
import { COMPONENTS } from './components.js';
import { geo, areaInBounds, areasOverlap, tokens, overflowRatio } from './grid.js';

export const ICON_NAMES = Object.keys(ICONS).sort();
const ICON_SET = new Set(ICON_NAMES);

const AUTO_STEP = 70;              // ms de escalonamento automático entre componentes
const DEFAULT_DEMO_AREA = [1, 5, 10, 6];

/* ============================================================ CATALOG ===== */

function requiredOf(props) {
  return Object.keys(props).filter((k) => String(props[k]).startsWith('!'));
}

export const CATALOG = Object.fromEntries(
  Object.entries(COMPONENTS).map(([type, c]) => [type, {
    doc: c.doc,
    props: c.props,
    required: requiredOf(c.props),
    interactive: !!c.interactive,
    example: c.example,
  }])
);

/* ------- CATALOG_PROMPT: catálogo + regras + ícones por categoria --------- */

function propSig(props) {
  return Object.entries(props)
    .map(([k, v]) => k + (String(v).startsWith('!') ? '!' : '?'))
    .join(' ');
}

function buildCatalogPrompt() {
  const L = [];
  L.push('SLIDEKIT · você preenche UM JSON por slide (não escreve HTML).');
  L.push('Slide: {"title","theme":"light|dark","components":[…],"demo":null|{…}}');
  L.push('Componente: {"type","area":[col,row,colSpan,rowSpan],"props":{…},"reveal"?:ms}.');
  L.push('Grade 12×12 sobre o palco (1-based). area fora dos limites ou sobreposta = inválido. reveal opcional (escalona sozinho). props com ! são obrigatórias.');
  L.push('');
  L.push('COMPONENTES:');
  for (const [type, c] of Object.entries(COMPONENTS)) {
    if (c.interactive) continue;
    L.push(`- ${type} {${propSig(c.props)}} · ${c.doc}`);
    L.push(`  ex ${JSON.stringify(c.example)}`);
  }
  L.push('');
  L.push('INTERATIVOS (máx 1 por slide; use como componente OU no campo "demo"):');
  for (const [type, c] of Object.entries(COMPONENTS)) {
    if (!c.interactive) continue;
    L.push(`- ${type} {${propSig(c.props)}} · ${c.doc}`);
    L.push(`  ex ${JSON.stringify(c.example)}`);
  }
  L.push('');
  L.push('ÍCONES (prop "icon" — use o nome EXATO; setas/UI servem de conectores):');
  for (const [cat, names] of Object.entries(ICON_CATEGORIES)) {
    L.push(`${cat}: ${names.join(', ')}`);
  }
  L.push('');
  L.push('REGRAS: 1 tese por slide, título = tese. Textos pt-BR densos mas curtos (o render trunca o que estoura). Prefira cards/fluxos/gráficos a bullets crus. theme dark na capa/ganhos/fechamento. Números concretos com big-number/kpi/bar-chart.');
  return L.join('\n');
}

export const CATALOG_PROMPT = buildCatalogPrompt();

/* ========================================================= validateSpec === */

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

function nearestIcon(name) {
  let best = null, bestD = Infinity;
  for (const cand of ICON_NAMES) {
    const dist = levenshtein(name, cand);
    if (dist < bestD) { bestD = dist; best = cand; }
    if (dist === 0) break;
  }
  return bestD <= Math.max(3, Math.ceil(name.length / 2)) ? best : null;
}

function collectIcons(val, out) {
  if (Array.isArray(val)) { val.forEach((v) => collectIcons(v, out)); return; }
  if (val && typeof val === 'object') {
    for (const [k, v] of Object.entries(val)) {
      if (k === 'icon' && typeof v === 'string') out.push(v);
      else collectIcons(v, out);
    }
  }
}

/** Chars aproximados de texto visível de um componente (para heurística de fit). */
function textChars(props) {
  let n = 0;
  const add = (v) => { if (typeof v === 'string') n += v.length; };
  add(props.title); add(props.text); add(props.sub); add(props.label);
  add(props.caption); add(props.author);
  if (Array.isArray(props.items)) props.items.forEach((it) => add(typeof it === 'string' ? it : (it && (it.text || it.title || it.label))));
  return n;
}

export function validateSpec(spec) {
  const issues = [];
  if (!spec || typeof spec !== 'object') return ['spec ausente ou não é um objeto'];
  if (spec.theme && spec.theme !== 'light' && spec.theme !== 'dark') {
    issues.push(`theme inválido: "${spec.theme}" (use "light" ou "dark")`);
  }

  const list = Array.isArray(spec.components) ? spec.components.slice() : [];
  if (!Array.isArray(spec.components)) issues.push('components deve ser um array');
  if (spec.demo) list.push({ ...spec.demo, _fromDemo: true });

  const placed = []; // { area, isBg }
  let interactiveCount = 0;

  list.forEach((comp, i) => {
    const where = comp._fromDemo ? 'demo' : `componente #${i + 1}`;
    if (!comp || typeof comp !== 'object') { issues.push(`${where}: não é um objeto`); return; }
    const def = COMPONENTS[comp.type];
    if (!def) {
      issues.push(`${where}: tipo desconhecido "${comp.type}"`);
      return;
    }
    if (def.interactive) interactiveCount++;
    if (comp._fromDemo && !def.interactive) issues.push(`demo deve ser um componente interativo, "${comp.type}" não é`);

    // área
    const area = comp.area || (comp._fromDemo ? DEFAULT_DEMO_AREA : null);
    if (!area) issues.push(`${where}: falta "area"`);
    else if (!areaInBounds(area)) issues.push(`${where} (${comp.type}): area ${JSON.stringify(area)} fora da grade 12×12 ou malformada`);
    else placed.push({ area, isBg: comp.layer === 'bg', label: `${where} (${comp.type})` });

    // props obrigatórias
    const props = comp.props || {};
    for (const req of requiredOf(def.props)) {
      const v = props[req];
      if (v == null || (typeof v === 'string' && v === '') || (Array.isArray(v) && v.length === 0)) {
        issues.push(`${where} (${comp.type}): falta prop obrigatória "${req}"`);
      }
    }

    // ícones
    const iconNames = [];
    collectIcons(props, iconNames);
    for (const name of iconNames) {
      if (!ICON_SET.has(name)) {
        const sug = nearestIcon(name);
        issues.push(`${where} (${comp.type}): ícone inválido "${name}"${sug ? ` — você quis dizer "${sug}"?` : ''}`);
      }
    }

    // heurística de estouro de texto
    if (area && areaInBounds(area)) {
      const g = geo(area);
      const chars = textChars(props);
      if (chars > 0) {
        const ratio = overflowRatio(chars, g, 13);
        if (ratio > 1.35) issues.push(`${where} (${comp.type}): texto provavelmente não cabe na área (~${Math.round(ratio * 100)}% da capacidade) — encurte ou aumente a área`);
      }
    }
  });

  if (interactiveCount > 1) {
    issues.push(`${interactiveCount} componentes interativos no slide — o runtime suporta 1 demo por slide; mantenha só um`);
  }

  // sobreposição (ignora layer:"bg")
  for (let a = 0; a < placed.length; a++) {
    for (let b = a + 1; b < placed.length; b++) {
      if (placed[a].isBg || placed[b].isBg) continue;
      if (areasOverlap(placed[a].area, placed[b].area)) {
        issues.push(`sobreposição: ${placed[a].label} e ${placed[b].label} ocupam a mesma célula`);
      }
    }
  }

  return issues;
}

/* =========================================================== renderSlide === */

/**
 * @param {object} spec  { title, theme, components:[…], demo?:{…} }
 * @param {object} ctx   { index, brand:{name,logoDataUri?}, theme } — theme é o
 *                        objeto de cores do assemble (não usado no HTML do slide,
 *                        que usa tokens; recebido por compatibilidade de contrato)
 * @returns {{html:string, js:string}}
 */
export function renderSlide(spec, ctx = {}) {
  const sid = ctx.index != null ? ctx.index : 0;
  const theme = spec.theme === 'dark' ? 'dark' : 'light';
  const T = tokens(theme);
  const brand = ctx.brand && ctx.brand.name ? ctx.brand.name : '';
  const demoName = `sk${sid}`;

  const list = Array.isArray(spec.components) ? spec.components.slice() : [];
  if (spec.demo) list.push({ ...spec.demo, area: spec.demo.area || DEFAULT_DEMO_AREA, _fromDemo: true });

  const wrappers = [];
  const jsBodies = [];
  let hasDemo = false;

  list.forEach((comp, i) => {
    const def = COMPONENTS[comp.type];
    if (!def) return; // inválidos são silenciosamente ignorados no render (validateSpec já avisa)
    const area = comp.area || DEFAULT_DEMO_AREA;
    if (!areaInBounds(area)) return;
    const g = geo(area);
    const d0 = comp.reveal != null ? comp.reveal : i * AUTO_STEP;
    const props = comp.props || {};

    let out;
    try {
      out = def.render({ props, g, T, d0, sid, demo: demoName, brand });
    } catch (e) {
      return; // render defensivo: um componente quebrado não derruba o slide
    }
    const z = comp.layer === 'bg' ? 0 : 1;
    wrappers.push(
      `<div class="absolute" style="left:${g.left}px;top:${g.top}px;width:${g.width}px;height:${g.height}px;overflow:hidden;z-index:${z}">${out.html}</div>`
    );
    if (out.js && out.js.trim()) { jsBodies.push(out.js.trim()); hasDemo = true; }
  });

  const demoAttr = hasDemo ? ` data-demo="${demoName}"` : '';
  const html = `<section class="slide ${T.section}" data-theme="${theme}"${demoAttr}>\n${wrappers.join('\n')}\n</section>`;

  let js = '';
  if (hasDemo) {
    const body = jsBodies.map((b) => b.split('\n').map((l) => '  ' + l).join('\n')).join('\n\n');
    js = `/* -- slide ${sid + 1}: demo SlideKit -- */\ndemos.${demoName} = { start() {\n${body}\n}};`;
  }

  return { html, js };
}
