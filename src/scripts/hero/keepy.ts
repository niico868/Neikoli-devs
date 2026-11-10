import Matter from 'matter-js';
import { gsap } from 'gsap';
import { HERO_CONFIG as CFG } from './config';
import { LocalScoreStore, qualifies, type Score, type ScoreStore } from './scores';

const { Bodies, Body, Composite, Sleeping } = Matter;
const G = CFG.game;
const STEP = 1000 / 60;

export interface GameHost {
  engine: Matter.Engine;
  stage: HTMLElement;
  size(): { W: number; H: number };
}

type Phase = 'off' | 'playing' | 'over';

/**
 * Keepy-uppy. Tap the O: a ball drops. Hold a finger or the mouse button
 * under it and it gets kicked back up. Every kick counts. Floor = game over,
 * then the top-10 board opens bottom right.
 */
export class KeepyUppy {
  phase: Phase = 'off';
  private ball: Matter.Body | null = null;
  private el: HTMLElement;
  private r = 40;
  private count = 0;
  private lastKick = 0;
  private foot: { id: number; x: number; y: number } | null = null;
  private store: ScoreStore = new LocalScoreStore(G.storageKey);
  private pending: Score | null = null;
  private lastTransform = '';

  private counter: HTMLElement;
  private counterN: HTMLElement;
  private hint: HTMLElement;
  private footEl: HTMLElement;
  private panel: HTMLElement;
  private list: HTMLOListElement;
  private last: HTMLElement;
  private form: HTMLFormElement;
  private nameInput: HTMLInputElement;

  constructor(private host: GameHost, private root: HTMLElement) {
    const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
    this.counter = q('[data-kick-count]');
    this.counterN = q('[data-kick-n]');
    this.hint = q('[data-kick-hint]');
    this.footEl = q('[data-kick-foot]');
    this.panel = q('[data-hs]');
    this.list = q<HTMLOListElement>('[data-hs-list]');
    this.last = q('[data-hs-last]');
    this.form = q<HTMLFormElement>('[data-hs-form]');
    this.nameInput = q<HTMLInputElement>('#hs-name');
    this.hint.textContent = G.hint;

    this.el = document.createElement('div');
    this.el.className = 'kick-ball';
    this.el.setAttribute('aria-hidden', 'true');
    this.el.innerHTML = ballSvg();
    this.el.hidden = true;
    host.stage.appendChild(this.el);

    q('[data-hs-close]').addEventListener('click', () => this.closePanel());
    this.form.addEventListener('submit', (e) => { e.preventDefault(); this.savePending(); });
    this.nameInput.addEventListener('input', () => {
      this.nameInput.value = this.nameInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    });
    this.bindFoot();
  }

  isBall(b: Matter.Body) { return b === this.ball; }

  /** Anything on screen that should be cleared when the hero parks. */
  get busy() { return !!this.ball || !this.panel.hidden || !this.counter.hidden; }

  park() { this.abort(); this.hidePanel(); }

  /* ---------- Lifecycle ---------- */

  start(x: number) {
    this.clearBall();
    this.savePending();
    this.panel.hidden = true;
    const { W } = this.host.size();
    const d = W < 700 ? G.ballSize.mobile : G.ballSize.desktop;
    this.r = d / 2;
    Object.assign(this.el.style, { width: d + 'px', height: d + 'px' });

    this.ball = Bodies.circle(gsap.utils.clamp(this.r, W - this.r, x), -this.r * 2, this.r, {
      restitution: G.restitution, friction: 0.02, frictionAir: 0.006, density: 0.001,
      // Only the screen edges stop the ball, so it can never come to rest on a letter.
      collisionFilter: { mask: 0xffffffff ^ 0x0002 },
    });
    Body.setAngularVelocity(this.ball, gsap.utils.random(-0.06, 0.06));
    Composite.add(this.host.engine.world, this.ball);

    this.count = 0;
    this.counterN.textContent = '0';
    this.phase = 'playing';
    this.root.classList.add('is-playing');
    this.el.hidden = false;
    gsap.set(this.el, { autoAlpha: 1 });
    this.counter.hidden = false;
    gsap.fromTo(this.counter, { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: 0.35 });
    this.hint.hidden = false;
    gsap.fromTo(this.hint, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 });
  }

  /** Called once per frame after the physics steps. */
  update() {
    const b = this.ball;
    if (!b) return;
    const { H, W } = this.host.size();

    if (this.phase === 'playing') {
      const f = this.foot;
      const now = performance.now();
      if (f && now - this.lastKick > G.kickCooldownMs) {
        const dx = b.position.x - f.x, dy = b.position.y - f.y;
        const touching = Math.hypot(dx, dy) < this.r + G.footReach;
        // The foot has to be under the ball, or at least level with its lower half.
        if (touching && dy < this.r * 0.35) this.kick(dx, H);
      }
      if (b.position.y + this.r >= H - 1.5 || b.position.x < -this.r * 3 || b.position.x > W + this.r * 3) this.over();
    }

    const t = `translate3d(${(b.position.x - this.r).toFixed(1)}px,${(b.position.y - this.r).toFixed(1)}px,0) rotate(${b.angle.toFixed(3)}rad)`;
    if (t !== this.lastTransform) { this.el.style.transform = t; this.lastTransform = t; }
  }

  private kick(dx: number, H: number) {
    const b = this.ball!;
    const g = Math.max(0.4, Math.abs(this.host.engine.gravity.y)) * this.host.engine.gravity.scale * STEP * STEP;
    const vy = -Math.sqrt(2 * g * G.kickHeight * H) * gsap.utils.random(0.92, 1.06);
    const vx = gsap.utils.clamp(-G.kickSideways, G.kickSideways, (dx / this.r) * G.kickSideways + gsap.utils.random(-1, 1));
    Sleeping.set(b, false);
    Body.setVelocity(b, { x: vx, y: vy });
    Body.setAngularVelocity(b, vx * 0.02 + gsap.utils.random(-0.05, 0.05));
    this.lastKick = performance.now();

    this.count++;
    this.counterN.textContent = String(this.count);
    gsap.fromTo(this.counterN, { scale: 1.45, color: CFG.colors.ink }, { scale: 1, color: CFG.colors.accent, duration: 0.45, ease: 'back.out(3)' });
    gsap.fromTo(this.el, { scaleY: 0.82, scaleX: 1.12 }, { scaleX: 1, scaleY: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });
    if (this.count === 1) gsap.to(this.hint, { autoAlpha: 0, duration: 0.3, onComplete: () => { this.hint.hidden = true; } });
  }

  private async over() {
    this.phase = 'over';
    this.root.classList.remove('is-playing');
    this.foot = null;
    this.footEl.hidden = true;
    gsap.to(this.hint, { autoAlpha: 0, duration: 0.2 });
    const ball = this.ball;
    gsap.to(this.el, { autoAlpha: 0, duration: 0.6, delay: 0.8, onComplete: () => { if (this.ball === ball) this.clearBall(); } });

    const score = this.count;
    const top = await this.store.top(G.maxScores);
    const best = top[0]?.score ?? 0;
    this.last.textContent = score === 1 ? 'You kept it up for 1 kick.' : `You kept it up for ${score} kicks.`;
    if (qualifies(top, score, G.maxScores)) {
      this.pending = { name: '', score, at: Date.now() };
      this.form.hidden = false;
      this.last.textContent += score > best ? ' New best!' : ' That makes the top 10.';
      this.renderList([...top, { ...this.pending, name: '···' }].sort((a, b) => b.score - a.score || a.at - b.at).slice(0, G.maxScores), this.pending.at);
    } else {
      this.form.hidden = true;
      this.renderList(top, -1);
    }
    this.panel.hidden = false;
    gsap.fromTo(this.panel, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power3.out' });
    if (!this.form.hidden && matchMedia('(pointer: fine)').matches) this.nameInput.focus({ preventScroll: true });
    gsap.to(this.counter, { autoAlpha: 0, duration: 0.4, delay: 1.6 });
  }

  /** Scrolling away, Reset, or a resize: stop without a score. */
  abort() {
    if (this.phase === 'playing') { this.phase = 'off'; this.root.classList.remove('is-playing'); }
    this.foot = null;
    this.footEl.hidden = true;
    this.clearBall();
    gsap.set([this.counter, this.hint], { autoAlpha: 0 });
    this.counter.hidden = true; this.hint.hidden = true;
  }

  closePanel() {
    this.savePending();
    gsap.to(this.panel, { autoAlpha: 0, y: 16, duration: 0.3, onComplete: () => { this.panel.hidden = true; } });
  }

  hidePanel() {
    this.savePending();
    this.panel.hidden = true;
  }

  private async savePending() {
    const p = this.pending;
    if (!p) return;
    this.pending = null;
    p.name = this.nameInput.value.trim() || 'YOU';
    this.nameInput.value = '';
    this.form.hidden = true;
    const list = await this.store.add(p, G.maxScores);
    this.renderList(list, p.at);
  }

  private renderList(list: Score[], highlightAt: number) {
    this.list.replaceChildren(...list.slice(0, G.maxScores).map((s, i) => {
      const li = document.createElement('li');
      if (s.at === highlightAt) li.className = 'is-you';
      const rank = document.createElement('span'); rank.className = 'hs__rank'; rank.textContent = String(i + 1).padStart(2, '0');
      const name = document.createElement('span'); name.className = 'hs__name'; name.textContent = s.name;
      const pts = document.createElement('span'); pts.className = 'hs__pts'; pts.textContent = String(s.score);
      li.append(rank, name, pts);
      return li;
    }));
    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'hs__empty';
      li.textContent = 'No scores yet. Get one kick to make the board.';
      this.list.append(li);
    }
  }

  private clearBall() {
    if (this.ball) Composite.remove(this.host.engine.world, this.ball);
    this.ball = null;
    this.el.hidden = true;
    this.lastTransform = '';
  }

  /* ---------- The "foot": a held mouse button or finger ---------- */

  private bindFoot() {
    const stage = this.host.stage;
    const toLocal = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    stage.addEventListener('pointerdown', (e) => {
      if (this.phase !== 'playing' || this.foot) return;
      if ((e.target as HTMLElement).closest('.letter, button, a, input, .hs, .hero__card')) return;
      e.preventDefault();
      stage.setPointerCapture(e.pointerId);
      this.foot = { id: e.pointerId, ...toLocal(e) };
      this.placeFoot();
    });
    stage.addEventListener('pointermove', (e) => {
      if (!this.foot || e.pointerId !== this.foot.id) return;
      Object.assign(this.foot, toLocal(e));
      this.placeFoot();
    });
    const up = (e: PointerEvent) => {
      if (!this.foot || e.pointerId !== this.foot.id) return;
      this.foot = null;
      this.footEl.hidden = true;
    };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
  }

  private placeFoot() {
    if (!this.foot) return;
    this.footEl.hidden = false;
    this.footEl.style.transform = `translate3d(${this.foot.x}px,${this.foot.y}px,0)`;
  }
}

/** A plain two-tone ball: one centre pentagon and five clipped ones round the edge. */
function ballSvg() {
  const pent = (cx: number, cy: number, r: number, rot: number) =>
    Array.from({ length: 5 }, (_, i) => {
      const a = rot + (i * 2 * Math.PI) / 5;
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    }).join(' ');
  const up = -Math.PI / 2;
  const centre = pent(50, 50, 17, up);
  let outer = '', seams = '';
  for (let i = 0; i < 5; i++) {
    const a = up + (i * 2 * Math.PI) / 5;
    const vx = 50 + 17 * Math.cos(a), vy = 50 + 17 * Math.sin(a);
    const ox = 50 + 47 * Math.cos(a), oy = 50 + 47 * Math.sin(a);
    outer += `<polygon points="${pent(ox, oy, 15, a + Math.PI)}"/>`;
    seams += `<line x1="${vx.toFixed(2)}" y1="${vy.toFixed(2)}" x2="${(50 + 33 * Math.cos(a)).toFixed(2)}" y2="${(50 + 33 * Math.sin(a)).toFixed(2)}"/>`;
  }
  return `<svg viewBox="0 0 100 100" width="100%" height="100%">
    <defs><clipPath id="kick-ball-clip"><circle cx="50" cy="50" r="47"/></clipPath></defs>
    <circle cx="50" cy="50" r="47" fill="#fbfaf6"/>
    <g clip-path="url(#kick-ball-clip)" fill="#111" stroke="#111" stroke-width="2" stroke-linejoin="round">
      <polygon points="${centre}"/>${outer}${seams}
    </g>
    <circle cx="50" cy="50" r="47" fill="none" stroke="#111" stroke-width="3"/>
  </svg>`;
}
