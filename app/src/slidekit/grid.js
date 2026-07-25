/**
 * grid.js — geometria da grade 12×12 sobre o palco 1280×720 e helpers de render.
 *
 * Modelo de posicionamento (contrato §2): padding externo fixo de 56px e gap de
 * 16px "embutidos no cálculo do renderer". A área útil (dentro do padding) é
 * dividida em 12 colunas × 12 linhas separadas por gaps de 16px. `area` é
 * [col, row, colSpan, rowSpan], 1-based, e vira left/top/width/height em px.
 */
export const STAGE_W = 1280;
export const STAGE_H = 720;
export const PAD = 56;
export const GAP = 16;
export const N = 12;

const INNER_W = STAGE_W - PAD * 2;              // 1168
const INNER_H = STAGE_H - PAD * 2;              // 608
export const COL_W = (INNER_W - (N - 1) * GAP) / N; // 82.667
export const ROW_H = (INNER_H - (N - 1) * GAP) / N; // 36.0

/** [col,row,colSpan,rowSpan] (1-based) → {left,top,width,height} em px inteiros. */
export function geo(area) {
  const [col, row, cs, rs] = area;
  const left = PAD + (col - 1) * (COL_W + GAP);
  const top = PAD + (row - 1) * (ROW_H + GAP);
  const width = cs * COL_W + (cs - 1) * GAP;
  const height = rs * ROW_H + (rs - 1) * GAP;
  return {
    left: Math.round(left),
    top: Math.round(top),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/** Área dentro dos limites da grade? */
export function areaInBounds(area) {
  if (!Array.isArray(area) || area.length !== 4) return false;
  const [col, row, cs, rs] = area;
  if (![col, row, cs, rs].every((v) => Number.isInteger(v))) return false;
  if (col < 1 || row < 1 || cs < 1 || rs < 1) return false;
  if (col - 1 + cs > N) return false;
  if (row - 1 + rs > N) return false;
  return true;
}

/** Sobreposição de duas áreas em coordenadas de grade (bounding-box). */
export function areasOverlap(a, b) {
  const ax2 = a[0] + a[2], ay2 = a[1] + a[3];
  const bx2 = b[0] + b[2], by2 = b[1] + b[3];
  return a[0] < bx2 && b[0] < ax2 && a[1] < by2 && b[1] < ay2;
}

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Heurística de "cabe o texto?": estima a capacidade de caracteres da área a uma
 * dada fonte (px) e retorna a razão ocupação = chars/capacidade. >1 = provável
 * estouro. Usada pelo validateSpec para avisar (não é exato, é conservador).
 */
export function overflowRatio(chars, g, fontPx) {
  const charW = fontPx * 0.52;
  const lineH = fontPx * 1.35;
  const perLine = Math.max(1, Math.floor((g.width - 16) / charW));
  const lines = Math.max(1, Math.floor((g.height - 12) / lineH));
  const capacity = perLine * lines;
  return chars / capacity;
}

/** Tokens de classe por tema (light|dark). */
export function tokens(theme) {
  const dark = theme === 'dark';
  return {
    dark,
    section: dark ? 'bg-ink text-white' : 'bg-paper text-ink',
    card: dark ? 'bg-card' : 'bg-white',
    cardBorder: dark ? 'border-edge' : 'border-neutral-200',
    card2: dark ? 'bg-card2' : 'bg-limetint/40',
    muted: dark ? 'text-mut' : 'text-mutl',
    kicker: dark ? 'text-lime' : 'text-olive',
    strong: dark ? 'text-white' : 'text-ink',
    track: dark ? 'bg-edge' : 'bg-neutral-100',
    badge: dark
      ? 'bg-card border border-edge text-lime'
      : 'bg-limetint border border-lime2 text-olive',
    hair: dark ? 'border-edge' : 'border-neutral-200',
  };
}

/** Cores de estado (hex) usadas em JS de demo e barras. */
export const STATE = { ok: '#9EC100', warn: '#D8A022', bad: '#E06060', good: '#17B689' };

/** Atributos de um elemento que entra em cascata: class + rv + data-d. */
export function rvAttr(baseClasses, d) {
  return `class="${baseClasses} rv" data-d="${Math.max(0, Math.round(d))}"`;
}
