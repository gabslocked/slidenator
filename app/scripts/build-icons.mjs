/**
 * build-icons.mjs — regenera src/slidekit/icons.js a partir de `lucide-static`.
 *
 * NÃO roda em produção: o arquivo gerado (icons.js) é commitado no repo e é a
 * única dependência de runtime. Este script é só a ferramenta de regeneração.
 *
 * lucide-static é devDependency/opcional — instale-o SEMPRE com o cache do
 * scratchpad (o ~/.npm do ambiente é um symlink quebrado):
 *
 *   npm install --no-save --cache <scratchpad>/npm-cache lucide-static@latest
 *   node scripts/build-icons.mjs
 *
 * Categorias cobertas (contrato §4): negócios, dados/gráficos, tecnologia/infra,
 * pessoas/RH, finanças, tempo, comunicação, logística, saúde, educação, setas/UI.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ICONS_DIR = path.join(ROOT, 'node_modules', 'lucide-static', 'icons');
const OUT = path.join(ROOT, 'src', 'slidekit', 'icons.js');

/**
 * Curadoria: nomes Lucide (kebab-case) agrupados por categoria. Nomes ausentes
 * na versão instalada são avisados e ignorados (o arquivo gerado só contém os
 * que existem). Ordem = ordem de exibição no CATALOG_PROMPT.
 */
const GROUPS = {
  negocios: [
    'briefcase', 'building', 'building-2', 'target', 'trophy', 'award', 'medal',
    'handshake', 'presentation', 'rocket', 'lightbulb', 'flag', 'megaphone',
    'gem', 'crown', 'star', 'sparkles', 'goal', 'badge-check', 'store',
    'shopping-cart', 'shopping-bag', 'tag', 'tags', 'ticket', 'gift',
  ],
  dados: [
    'chart-line', 'chart-bar', 'chart-column', 'chart-pie', 'chart-area',
    'chart-scatter', 'chart-no-axes-column', 'chart-candlestick', 'chart-spline',
    'activity', 'trending-up', 'trending-down', 'gauge', 'database', 'table',
    'table-2', 'sigma', 'percent', 'hash', 'filter', 'funnel', 'layers',
    'grid-2x2', 'list', 'list-checks', 'list-ordered', 'binary', 'scan',
  ],
  tecnologia: [
    'server', 'cpu', 'hard-drive', 'memory-stick', 'container', 'boxes', 'box',
    'cloud', 'cloud-cog', 'cloudy', 'code', 'code-xml', 'terminal', 'terminal-square',
    'git-branch', 'git-commit-horizontal', 'git-merge', 'git-pull-request',
    'github', 'network', 'wifi', 'bluetooth', 'plug', 'plug-zap', 'power',
    'settings', 'settings-2', 'cog', 'wrench', 'bug', 'shield', 'shield-check',
    'lock', 'unlock', 'key', 'fingerprint', 'monitor', 'smartphone', 'laptop',
    'tablet', 'mouse-pointer-2', 'keyboard', 'webhook', 'api', 'braces', 'file-code',
  ],
  pessoas: [
    'user', 'users', 'user-plus', 'user-minus', 'user-check', 'user-x',
    'user-cog', 'user-round', 'users-round', 'contact', 'id-card', 'badge',
    'graduation-cap', 'briefcase-business', 'building-2', 'heart-handshake',
    'baby', 'accessibility', 'person-standing', 'smile', 'frown', 'meh',
  ],
  financas: [
    'dollar-sign', 'euro', 'pound-sterling', 'banknote', 'coins', 'credit-card',
    'wallet', 'piggy-bank', 'landmark', 'receipt', 'calculator', 'scale',
    'trending-up', 'trending-down', 'circle-dollar-sign', 'hand-coins',
    'chart-no-axes-combined', 'arrow-up-right', 'arrow-down-right', 'bitcoin',
  ],
  tempo: [
    'clock', 'clock-3', 'clock-9', 'timer', 'timer-reset', 'alarm-clock',
    'hourglass', 'calendar', 'calendar-days', 'calendar-check', 'calendar-clock',
    'calendar-range', 'history', 'rotate-ccw', 'rotate-cw', 'watch', 'sunrise',
    'sunset',
  ],
  comunicacao: [
    'mail', 'mail-open', 'send', 'message-circle', 'message-square',
    'messages-square', 'phone', 'phone-call', 'video', 'mic', 'mic-off',
    'bell', 'bell-ring', 'bell-off', 'share-2', 'link', 'link-2', 'at-sign',
    'rss', 'radio', 'speech', 'quote', 'inbox', 'reply', 'forward',
  ],
  logistica: [
    'truck', 'package', 'package-check', 'package-open', 'boxes', 'warehouse',
    'forklift', 'ship', 'plane', 'train-front', 'car', 'bike', 'map',
    'map-pin', 'map-pinned', 'navigation', 'compass', 'route', 'milestone',
    'globe', 'globe-2', 'anchor', 'fuel', 'container',
  ],
  saude: [
    'heart', 'heart-pulse', 'activity', 'stethoscope', 'pill', 'syringe',
    'thermometer', 'cross', 'hospital', 'ambulance', 'bandage', 'brain',
    'dna', 'microscope', 'test-tube', 'test-tube-diagonal', 'leaf', 'shield-plus',
  ],
  educacao: [
    'graduation-cap', 'book', 'book-open', 'book-open-check', 'library',
    'notebook', 'notebook-pen', 'pencil', 'pen-tool', 'highlighter', 'ruler',
    'calculator', 'flask-conical', 'atom', 'lightbulb', 'brain-circuit',
    'school', 'backpack', 'clipboard-list', 'clipboard-check',
  ],
  ui: [
    'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'arrow-up-right',
    'arrow-down-right', 'arrow-right-left', 'move-right', 'chevron-right',
    'chevron-down', 'chevrons-right', 'corner-down-right', 'check', 'check-check',
    'x', 'plus', 'minus', 'circle-check', 'circle-x', 'circle-alert',
    'circle-help', 'circle-plus', 'triangle-alert', 'info', 'ban', 'zap',
    'flame', 'search', 'eye', 'eye-off', 'download', 'upload', 'refresh-cw',
    'refresh-ccw', 'play', 'pause', 'square', 'circle', 'circle-dot', 'dot',
    'more-horizontal', 'menu', 'grip', 'maximize', 'minimize', 'expand',
    'thumbs-up', 'thumbs-down', 'bookmark', 'pin', 'trash-2', 'edit', 'copy',
    'clipboard', 'save', 'folder', 'folder-open', 'file', 'file-text', 'file-check',
    'paperclip', 'sliders-horizontal', 'layout-dashboard', 'layout-grid', 'workflow',
    'archive', 'command', 'external-link', 'log-in', 'log-out', 'toggle-left',
    'toggle-right', 'circle-user', 'square-check-big', 'loader', 'loader-circle',
  ],
};

function extractInner(svg) {
  // remove comentário de licença e o wrapper <svg ...>...</svg>
  const body = svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<svg[\s\S]*?>/, '')
    .replace(/<\/svg>/, '');
  return body.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
}

function main() {
  if (!fs.existsSync(ICONS_DIR)) {
    console.error('lucide-static não encontrado em node_modules. Rode:');
    console.error('  npm install --no-save --cache <scratchpad>/npm-cache lucide-static@latest');
    process.exit(1);
  }
  const map = {};
  const categories = {};
  const missing = [];
  const seen = new Set();

  for (const [cat, names] of Object.entries(GROUPS)) {
    categories[cat] = [];
    for (const name of names) {
      const file = path.join(ICONS_DIR, name + '.svg');
      if (!fs.existsSync(file)) { missing.push(name); continue; }
      if (!seen.has(name)) {
        map[name] = extractInner(fs.readFileSync(file, 'utf-8'));
        seen.add(name);
      }
      if (!categories[cat].includes(name)) categories[cat].push(name);
    }
  }

  const version = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'node_modules', 'lucide-static', 'package.json'), 'utf-8')
  ).version;

  const lines = [];
  lines.push('/**');
  lines.push(' * icons.js — GERADO por scripts/build-icons.mjs. Não editar à mão.');
  lines.push(` * Fonte: lucide-static v${version} (ISC). Paths inline, viewBox 24, stroke currentColor.`);
  lines.push(` * ${seen.size} ícones em ${Object.keys(categories).length} categorias.`);
  lines.push(' */');
  lines.push('export const ICONS = {');
  for (const name of Object.keys(map).sort()) {
    lines.push(`  ${JSON.stringify(name)}: ${JSON.stringify(map[name])},`);
  }
  lines.push('};');
  lines.push('');
  lines.push('export const ICON_CATEGORIES = {');
  for (const [cat, names] of Object.entries(categories)) {
    lines.push(`  ${JSON.stringify(cat)}: ${JSON.stringify(names)},`);
  }
  lines.push('};');
  lines.push('');

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, lines.join('\n'));

  console.log(`✓ ${seen.size} ícones gerados em src/slidekit/icons.js`);
  if (missing.length) console.warn(`⚠ ${missing.length} nomes ausentes na v${version}, ignorados: ${missing.join(', ')}`);
}

main();
