import { gsap } from 'gsap';

/**
 * One canvas for the red fragments: the intro assembly and the celebration burst.
 * It only draws while something is moving, then clears and idles.
 */
interface Frag {
  x: number; y: number; size: number; rot: number; spin: number;
  // intro
  sx?: number; sy?: number; cx?: number; cy?: number; tx?: number; ty?: number; delay?: number;
  // burst
  vx?: number; vy?: number; life?: number; maxLife?: number;
  shape: 0 | 1;
}

export class Fx {
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private w = 0; private h = 0;
  private intro: Frag[] = [];
  private burst: Frag[] = [];
  private introT = 0;          // 0..1 flight progress
  private introFade = 1;       // 1..0 while resolving into letters
  private running = false;
  private color: string;

  constructor(private canvas: HTMLCanvasElement, color: string) {
    this.ctx = canvas.getContext('2d')!;
    this.color = color;
  }

  resize(w: number, h: number) {
    this.dpr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 2);
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  /** Fly fragments in from the edges to the given targets. Resolves when they land. */
  assemble(targets: { x: number; y: number }[], sizeRange: readonly [number, number], ms: number): Promise<void> {
    const { w, h } = this;
    this.intro = targets.map((t) => {
      const edge = Math.floor(Math.random() * 4);
      const sx = edge === 0 ? -30 : edge === 1 ? w + 30 : Math.random() * w;
      const sy = edge === 2 ? -30 : edge === 3 ? h + 30 : Math.random() * h;
      return {
        x: sx, y: sy, sx, sy, tx: t.x, ty: t.y,
        // a control point off the straight line gives each fragment a gentle curve
        cx: (sx + t.x) / 2 + (Math.random() - 0.5) * w * 0.35,
        cy: (sy + t.y) / 2 + (Math.random() - 0.5) * h * 0.35,
        size: gsap.utils.random(sizeRange[0], sizeRange[1]),
        rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 6,
        delay: Math.random() * 0.35,
        shape: Math.random() < 0.5 ? 0 : 1,
      };
    });
    this.introT = 0; this.introFade = 1;
    this.start();
    return new Promise((resolve) => {
      gsap.to(this, { introT: 1, duration: ms / 1000, ease: 'none', onComplete: () => resolve() });
    });
  }

  /** Fade the assembled fragments out as the solid letters take over. */
  resolveIntro(ms: number): Promise<void> {
    return new Promise((resolve) => {
      gsap.to(this, {
        introFade: 0, duration: ms / 1000, ease: 'power2.in',
        onComplete: () => { this.intro = []; resolve(); },
      });
    });
  }

  burstAt(x: number, y: number, count: number, spread: number) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 4 + Math.random() * 12;
      this.burst.push({
        x: x + (Math.random() - 0.5) * spread, y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6,
        size: 3 + Math.random() * 8, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 0.4,
        life: 0, maxLife: 50 + Math.random() * 40, shape: Math.random() < 0.5 ? 0 : 1,
      });
    }
    this.start();
  }

  private start() {
    if (this.running) return;
    this.running = true;
    gsap.ticker.add(this.draw);
  }

  private stop() {
    this.running = false;
    gsap.ticker.remove(this.draw);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private draw = () => {
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = this.color;

    const t = this.introT;
    for (const f of this.intro) {
      const local = gsap.utils.clamp(0, 1, (t - f.delay!) / (1 - f.delay!));
      const e = 1 - Math.pow(1 - local, 3); // power3.out
      const u = 1 - e;
      f.x = u * u * f.sx! + 2 * u * e * f.cx! + e * e * f.tx!;
      f.y = u * u * f.sy! + 2 * u * e * f.cy! + e * e * f.ty!;
      const r = f.rot + f.spin * u;
      const s = f.size * (0.4 + 0.6 * this.introFade) * (1 - 0.4 * e);
      ctx.globalAlpha = Math.min(1, local * 3) * this.introFade;
      this.shape(f.shape, f.x * dpr, f.y * dpr, s * dpr, r);
    }

    for (let i = this.burst.length - 1; i >= 0; i--) {
      const p = this.burst[i];
      p.vy! += 0.45; p.vx! *= 0.985;
      p.x += p.vx!; p.y += p.vy!; p.rot += p.spin;
      p.life!++;
      const k = 1 - p.life! / p.maxLife!;
      if (k <= 0) { this.burst.splice(i, 1); continue; }
      ctx.globalAlpha = k;
      this.shape(p.shape, p.x * dpr, p.y * dpr, p.size * dpr, p.rot);
    }
    ctx.globalAlpha = 1;

    if (!this.intro.length && !this.burst.length) this.stop();
  };

  private shape(kind: 0 | 1, x: number, y: number, s: number, r: number) {
    const { ctx } = this;
    ctx.setTransform(Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), x, y);
    if (kind === 0) ctx.fillRect(-s / 2, -s / 2, s, s * 0.6);
    else {
      ctx.beginPath();
      ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, s / 2); ctx.lineTo(-s / 2, s / 2);
      ctx.closePath(); ctx.fill();
    }
  }
}
