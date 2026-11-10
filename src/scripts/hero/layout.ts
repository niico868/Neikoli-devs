import type { HeroConfig } from './config';

/** Font metrics per 100px of font size. Width axis does not change vertical metrics. */
export interface Metrics {
  capAscent: number;   // baseline to cap top
  baseline: number;    // top of a line-height:1 box to the baseline
  family: string;
  weight: string;
}

export interface LetterBox {
  char: string;
  w: number;           // advance width (element width)
  h: number;           // cap height (element height)
  homeX: number;       // centre, stage coords
  homeY: number;
  glyphTop: number;    // offset of the glyph's line box inside the element
}

export interface WordLayout {
  fontSize: number;
  letters: LetterBox[];
  left: number; top: number; width: number; height: number;
  metrics: Metrics;
}

let probe: HTMLSpanElement | null = null;

function getProbe(): HTMLSpanElement {
  if (probe) return probe;
  probe = document.createElement('span');
  probe.className = 'display';
  probe.setAttribute('aria-hidden', 'true');
  Object.assign(probe.style, {
    position: 'absolute', left: '-9999px', top: '0', visibility: 'hidden',
    fontSize: '100px', lineHeight: '1', whiteSpace: 'pre', letterSpacing: '0',
  });
  document.body.appendChild(probe);
  return probe;
}

export async function ensureFonts(): Promise<void> {
  const p = getProbe();
  p.textContent = 'NEIKOLI';
  const cs = getComputedStyle(p);
  try {
    await Promise.race([
      document.fonts.load(`${cs.fontWeight} 100px ${cs.fontFamily}`, 'NEIKOLI'),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    await document.fonts.ready;
  } catch { /* fall through with whatever is available */ }
}

export function readMetrics(): Metrics {
  const p = getProbe();
  const cs = getComputedStyle(p);
  const ctx = document.createElement('canvas').getContext('2d')!;
  ctx.font = `${cs.fontWeight} 100px ${cs.fontFamily}`;
  const m = ctx.measureText('N');
  const fA = m.fontBoundingBoxAscent ?? 92;
  const fD = m.fontBoundingBoxDescent ?? 24;
  const capAscent = m.actualBoundingBoxAscent || 72;
  const baseline = (100 - (fA + fD)) / 2 + fA;
  return { capAscent, baseline, family: cs.fontFamily, weight: cs.fontWeight };
}

/** Advance widths at 100px, measured in the DOM so font-stretch is honoured. */
export function measureAdvances(text: string): number[] {
  const p = getProbe();
  p.textContent = '';
  const spans = [...text].map((c) => {
    const s = document.createElement('span');
    s.textContent = c;
    p.appendChild(s);
    return s;
  });
  const out = spans.map((s) => s.getBoundingClientRect().width);
  p.textContent = '';
  return out;
}

export function layoutWord(cfg: HeroConfig, stageW: number, stageH: number): WordLayout {
  const metrics = readMetrics();
  const adv100 = measureAdvances(cfg.word);
  const track100 = cfg.layout.letterSpacingEm * 100;
  const total100 = adv100.reduce((a, b) => a + b, 0) + track100 * (adv100.length - 1);

  const byWidth = (cfg.layout.widthRatio * stageW) / total100 * 100;
  const byHeight = (cfg.layout.maxHeightRatio * stageH) / metrics.capAscent * 100;
  const fontSize = Math.max(28, Math.min(byWidth, byHeight));
  const k = fontSize / 100;

  const h = metrics.capAscent * k;
  const width = total100 * k;
  const left = (stageW - width) / 2;
  const top = stageH * cfg.layout.verticalCenter - h / 2;
  const glyphTop = -(metrics.baseline - metrics.capAscent) * k;

  let x = left;
  const letters: LetterBox[] = [...cfg.word].map((char, i) => {
    const w = adv100[i] * k;
    const box = { char, w, h, homeX: x + w / 2, homeY: top + h / 2, glyphTop };
    x += w + track100 * k;
    return box;
  });

  return { fontSize, letters, left, top, width, height: h, metrics };
}

/** Points inside a glyph, in the element's local coords (0..w, 0..h). */
export function sampleGlyph(box: LetterBox, fontSize: number, metrics: Metrics, count: number): { x: number; y: number }[] {
  const scale = Math.min(1, 160 / box.h); // sample at a modest resolution
  const cw = Math.ceil(box.w * scale) + 2;
  const ch = Math.ceil(box.h * scale) + 2;
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.font = `${metrics.weight} ${fontSize * scale}px ${metrics.family}`;
  // If the canvas cannot apply font-stretch, squeeze/stretch to the DOM advance.
  const drawn = ctx.measureText(box.char).width || box.w * scale;
  ctx.setTransform((box.w * scale) / drawn, 0, 0, 1, 0, 0);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000';
  ctx.fillText(box.char, 0, box.h * scale);
  const data = ctx.getImageData(0, 0, cw, ch).data;
  const pts: { x: number; y: number }[] = [];
  const step = 2;
  for (let y = 0; y < ch; y += step) {
    for (let x = 0; x < cw; x += step) {
      if (data[(y * cw + x) * 4 + 3] > 128) pts.push({ x: x / scale, y: y / scale });
    }
  }
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    out.push(pts.length ? pts[Math.floor(Math.random() * pts.length)] : { x: Math.random() * box.w, y: Math.random() * box.h });
  }
  return out;
}
