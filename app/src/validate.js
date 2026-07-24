const ICON_NAMES = new Set([
  'argo', 'box_d', 'calendar_d', 'check_o', 'clock_l', 'cube_d', 'cube_g', 'cubes_w',
  'db_d', 'db_o', 'desktop_d', 'docker_d', 'docker_l', 'eye_d', 'filecode_d', 'gear_gh',
  'gears_d', 'globe_d', 'globe_g', 'heart_g', 'history_d', 'k8s_d', 'k8s_l', 'net_g',
  'scroll_d', 'search_gh', 'server_d', 'sync_l', 'undo_d', 'undo_l', 'users_d', 'video_d', 'warn_o',
]);

function count(str, re) {
  return (str.match(re) || []).length;
}

/**
 * Valida um slide gerado (html + js). Retorna lista de problemas (vazia = ok).
 */
export function validateSlide({ html, js }) {
  const issues = [];

  // estrutura da section
  const openSections = count(html, /<section\b/g);
  const closeSections = count(html, /<\/section>/g);
  if (openSections !== 1 || closeSections !== 1) {
    issues.push(`o html deve conter exatamente uma <section> (encontrado ${openSections} aberturas / ${closeSections} fechamentos)`);
  }
  const openDivs = count(html, /<div\b/g);
  const closeDivs = count(html, /<\/div>/g);
  if (openDivs !== closeDivs) issues.push(`tags <div> desbalanceadas (${openDivs} aberturas vs ${closeDivs} fechamentos)`);
  if (/<script\b/i.test(html)) issues.push('o html não pode conter <script>');
  if (/\bsrc=["']https?:/i.test(html) || /url\(\s*["']?https?:/i.test(html)) {
    issues.push('o html não pode referenciar recursos externos (http/https)');
  }

  // ícones
  for (const m of html.matchAll(/data-icon="(\w+)"/g)) {
    if (!ICON_NAMES.has(m[1])) issues.push(`ícone inexistente: "${m[1]}" (use apenas a lista oficial)`);
  }

  // orçamento de altura do palco (720px): nada posicionado/dimensionado além do limite
  for (const m of html.matchAll(/top-\[(\d+)px\]/g)) {
    if (parseInt(m[1], 10) >= 690) issues.push(`bloco posicionado em top-[${m[1]}px] — estoura o palco de 720px (limite: top < 690)`);
  }
  for (const m of html.matchAll(/h-\[(\d+)px\]/g)) {
    if (parseInt(m[1], 10) > 640) issues.push(`bloco com h-[${m[1]}px] — alto demais para o palco (limite prático: 640px)`);
  }
  for (const m of html.matchAll(/w-\[(\d+)px\]/g)) {
    if (parseInt(m[1], 10) > 1168) issues.push(`bloco com w-[${m[1]}px] — mais largo que a área útil (1168px entre as margens)`);
  }

  // demo declarada vs js
  const demoAttr = (html.match(/data-demo="([\w-]+)"/) || [])[1] || null;
  const jsTrim = (js || '').trim();
  const demoJs = (jsTrim.match(/demos\.([\w$]+)\s*=/) || [])[1] || null;
  if (demoAttr && !jsTrim) issues.push(`a section declara data-demo="${demoAttr}" mas o js está vazio`);
  if (!demoAttr && jsTrim) issues.push('há js de demo mas a section não declara data-demo');
  if (demoAttr && demoJs && demoAttr !== demoJs) {
    issues.push(`data-demo="${demoAttr}" não bate com demos.${demoJs} no js`);
  }

  // ids referenciados no js existem no html
  const idsInHtml = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  for (const m of jsTrim.matchAll(/getElementById\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    if (!idsInHtml.has(m[1])) issues.push(`js referencia id inexistente no html: "${m[1]}"`);
  }

  // sintaxe do js (parse sem executar; every/later/sleep/demos/hydrateIcons são do escopo do runtime)
  if (jsTrim) {
    try {
      new Function('demos', 'every', 'later', 'sleep', 'hydrateIcons', 'countUp', jsTrim);
    } catch (e) {
      issues.push(`erro de sintaxe no js: ${e.message}`);
    }
    if (/\bsetInterval\s*\(/.test(jsTrim)) issues.push('use every(ms, fn) em vez de setInterval (limpeza na troca de slide)');
  }

  return issues;
}

/**
 * Validações do deck montado inteiro.
 */
export function validateDeck(slides) {
  const issues = [];
  const allIds = new Map();
  slides.forEach((s, i) => {
    for (const m of s.html.matchAll(/id="([^"]+)"/g)) {
      if (allIds.has(m[1])) issues.push(`id duplicado entre slides ${allIds.get(m[1]) + 1} e ${i + 1}: "${m[1]}"`);
      else allIds.set(m[1], i);
    }
  });
  const demoNames = new Set();
  slides.forEach((s, i) => {
    const d = (s.html.match(/data-demo="([\w-]+)"/) || [])[1];
    if (d) {
      if (demoNames.has(d)) issues.push(`data-demo duplicado no slide ${i + 1}: "${d}"`);
      demoNames.add(d);
    }
  });
  return issues;
}
