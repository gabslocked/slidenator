import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKELETON = path.join(ROOT, 'template', 'skeleton.html');

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---------- cor: hex ↔ hsl + derivações ---------- */
function hexToHsl(hex) {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }) {
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}

function luminance(hex) {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const ch = (i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
}

const DEFAULT_THEME = {
  colors: { accent: '#D8E022', ink: '#070808', paper: '#EBEBEB' },
  radius: 'arredondado',
};

/**
 * Deriva a paleta completa (tokens semânticos do design system) a partir de
 * accent + ink + paper escolhidos pelo usuário.
 */
export function deriveColors(themeColors) {
  const accent = themeColors.accent || DEFAULT_THEME.colors.accent;
  const ink = themeColors.ink || DEFAULT_THEME.colors.ink;
  const paper = themeColors.paper || DEFAULT_THEME.colors.paper;
  const a = hexToHsl(accent);
  const k = hexToHsl(ink);
  return {
    ink,
    paper,
    lime: accent,
    lime2: hslToHex({ h: a.h, s: a.s, l: Math.max(18, a.l - 10) }),
    olive: hslToHex({ h: a.h, s: Math.min(a.s, 85), l: Math.min(34, Math.max(22, a.l - 30)) }),
    limetint: hslToHex({ h: a.h, s: Math.min(a.s, 55), l: 93 }),
    card: hslToHex({ h: k.h, s: Math.min(k.s, 12), l: k.l + 6 }),
    card2: hslToHex({ h: k.h, s: Math.min(k.s, 12), l: k.l + 8.5 }),
    edge: hslToHex({ h: k.h, s: Math.min(k.s, 10), l: k.l + 14 }),
    mut: '#9BA1A4',
    mutl: '#5C6265',
  };
}

function radiusCss(radius) {
  const maps = {
    reto: { '3xl': 6, '2xl': 5, 'xl': 4, 'lg': 3, 'md': 3, '': 2 },
    medio: { '3xl': 14, '2xl': 10, 'xl': 8, 'lg': 6, 'md': 5, '': 4 },
  };
  const map = maps[radius];
  if (!map) return '';
  return Object.entries(map)
    .map(([suf, px]) => `.rounded${suf ? '-' + suf : ''}{border-radius:${px}px!important}`)
    .join('');
}

function themeCss(colors, radius) {
  let css = radiusCss(radius);
  // accent escura → texto branco sobre superfícies accent (botões, badges, tokens)
  if (luminance(colors.lime) < 0.35) {
    css += '.bg-lime,.bg-lime *{color:#ffffff!important}';
  }
  // ink clara (tema "dark" claro) → texto escuro sobre fundos ink
  if (luminance(colors.ink) > 0.5) {
    css += '.bg-ink,.bg-ink *:not(.text-lime):not(.text-mut){color:#111111}';
  }
  return css;
}

/**
 * Injeta slides, demos e tema no skeleton. slides = [{html, js}]
 * theme = { colors:{accent,ink,paper}, radius:'arredondado'|'medio'|'reto', logo?, name? }
 */
export function assemble({ title, brand, slides, theme }) {
  let out = fs.readFileSync(SKELETON, 'utf-8');
  const t = { ...DEFAULT_THEME, ...(theme || {}) };
  const colors = deriveColors(t.colors || {});

  const slidesHtml = slides.map((s) => s.html.trim()).join('\n\n');
  const demosJs = slides
    .map((s) => (s.js || '').trim())
    .filter(Boolean)
    .map((js) => js.split('\n').map((l) => '  ' + l).join('\n'))
    .join('\n\n');

  const colorsJs = '{ ' + Object.entries(colors).map(([k, v]) => `${k}:'${v}'`).join(', ') + ' }';
  out = out.replace(/\/\*THEME\*\/\{[^]*?\}\/\*THEME\*\//, '/*THEME*/' + colorsJs + '/*THEME*/');
  out = out.replace('/*THEME_CSS*/', themeCss(colors, t.radius));

  const brandHtml = t.logo
    ? `<img src="${t.logo}" alt="${esc(brand)}" style="height:26px;display:block">`
    : esc(brand);
  out = out.replaceAll('{{TITLE}}', esc(title));
  out = out.replaceAll('{{BRAND}}', brandHtml);
  out = out.replace('<!-- {{SLIDES}} -->', slidesHtml);
  out = out.replace('/* {{DEMOS}} */', demosJs);
  return out;
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'deck';
}
