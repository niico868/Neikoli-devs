import Matter from 'matter-js';
import { gsap, ScrollTrigger, prefersReducedMotion, scrollToTarget } from '../motion';
import { HERO_CONFIG as CFG } from './config';
import { ensureFonts, layoutWord, measureAdvances, sampleGlyph, type WordLayout } from './layout';
import { Fx } from './fx';
import { RevealCard } from './reveal';

const { Engine, Bodies, Body, Composite, Constraint, Events, Sleeping } = Matter;
const STEP = 1000 / 60;
const TAU = Math.PI * 2;

type State = 'home' | 'loose' | 'returning';

interface Item {
  el: HTMLElement;
  glyph: HTMLElement;
  body: Matter.Body;
  w: number; h: number;
  index: number;            // letter index, or -1 for typed characters
  homeX: number; homeY: number;
  state: State;
  tween: gsap.core.Tween | null;
  lean: { x: number; y: number; r: number; tx: number; ty: number; tr: number };
  squash: number;
  last: string;             // last transform written, to skip identical writes
}

interface Drag {
  item: Item; id: number; x0: number; y0: number; started: boolean;
  constraint: Matter.Constraint | null; rect: DOMRect;
}

export class Hero {
  private stage: HTMLElement;
  private wordEl: HTMLElement;
  private spawnEl: HTMLElement;
  private fx: Fx;
  private card: RevealCard;

  private engine = Engine.create({ enableSleeping: true });
  private walls: Matter.Body[] = [];
  private layout!: WordLayout;
  private letters: Item[] = [];
  private typed: Item[] = [];
  private W = 0; private H = 0;

  private live = false;
  private inView = true;
  private scrollP = 0;
  private acc = 0;
  private lastInteraction = 0;
  private drag: Drag | null = null;
  private lastTap: { item: Item; t: number } | null = null;
  private releaseQueue = new Set<Item>();
  private buffer = '';
  private advCache = new Map<string, number>();
  private st = { sx: 1, gap: 0 };   // scroll-driven stretch
  private offsets: number[] = [];

  constructor(private root: HTMLElement) {
    this.stage = root.querySelector('[data-stage]')!;
    this.wordEl = root.querySelector('[data-word]')!;
    this.spawnEl = root.querySelector('[data-spawn]')!;
    this.fx = new Fx(root.querySelector('[data-fx]')!, CFG.colors.accent);
    this.card = new RevealCard(root.querySelector('[data-card]')!, this.stage, false);
    this.engine.gravity.y = CFG.physics.gravity;
  }

  async init() {
    await ensureFonts();
    this.measureStage();
    this.layout = layoutWord(CFG, this.W, this.H);
    this.buildLetters();
    this.buildWalls();
    this.fx.resize(this.W, this.H);
    this.root.classList.add('is-ready');

    Events.on(this.engine, 'collisionStart', this.onCollide);
    this.bindPointer();
    this.bindKeys();
    this.bindTilt();
    this.bindResize();
    this.buildScroll();
    new IntersectionObserver(([e]) => { this.inView = e.isIntersecting; }).observe(this.root);
    this.root.querySelector('[data-reset]')!.addEventListener('click', () => this.reset());

    gsap.ticker.add(this.tick);
    await this.intro();
  }

  /* ---------- Layout ---------- */

  private measureStage() {
    this.W = this.stage.clientWidth;
    this.H = this.stage.clientHeight;
  }

  private buildLetters() {
    const L = this.layout;
    this.wordEl.querySelectorAll('.letter').forEach((n) => n.remove());
    this.letters = L.letters.map((box, i) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'letter';
      const reveal = CFG.reveals[i];
      el.setAttribute('aria-label', `${box.char}: ${reveal?.title ?? ''}. Opens a card.`);
      const glyph = document.createElement('span');
      glyph.className = 'glyph display';
      glyph.setAttribute('aria-hidden', 'true');
      glyph.textContent = box.char;
      el.appendChild(glyph);
      this.wordEl.appendChild(el);
      el.addEventListener('click', (e) => {
        if ((e as MouseEvent).detail === 0) this.openReveal(item, true); // keyboard activation only
      });
      const item: Item = {
        el, glyph, body: null as unknown as Matter.Body, w: 0, h: 0, index: i,
        homeX: 0, homeY: 0, state: 'home', tween: null,
        lean: { x: 0, y: 0, r: 0, tx: 0, ty: 0, tr: 0 }, squash: 0, last: '',
      };
      this.sizeLetter(item);
      return item;
    });
    this.offsets = this.letters.map(() => 0);
  }

  /** Apply the current layout to a letter: element size, glyph offset, and a fresh static body at home. */
  private sizeLetter(item: Item) {
    const L = this.layout;
    const box = L.letters[item.index];
    item.w = box.w; item.h = box.h; item.homeX = box.homeX; item.homeY = box.homeY;
    Object.assign(item.el.style, { width: box.w + 'px', height: box.h + 'px' });
    Object.assign(item.glyph.style, { fontSize: L.fontSize + 'px', top: box.glyphTop + 'px' });
    if (item.body) Composite.remove(this.engine.world, item.body);
    item.tween?.kill(); item.tween = null;
    item.state = 'home';
    item.body = this.makeBody(box.homeX, box.homeY, box.w * 0.9, box.h, true);
    item.body.plugin = { item };
    Composite.add(this.engine.world, item.body);
    item.last = '';
  }

  private makeBody(x: number, y: number, w: number, h: number, isStatic: boolean) {
    const P = CFG.physics;
    // Always create dynamic, then freeze: Matter only restores mass on un-freezing
    // if the body had a real mass to begin with.
    const b = Bodies.rectangle(x, y, w, h, {
      restitution: P.restitution, friction: P.friction, frictionAir: P.frictionAir, density: P.density,
      chamfer: { radius: Math.min(w, h) * 0.06 },
      sleepThreshold: 90,
    });
    if (isStatic) Body.setStatic(b, true);
    return b;
  }

  private buildWalls() {
    Composite.remove(this.engine.world, this.walls);
    const t = CFG.physics.wallThickness, { W, H } = this;
    const opts = { isStatic: true, restitution: 0.2, friction: 0.3 };
    this.walls = [
      Bodies.rectangle(W / 2, H + t / 2, W + t * 2, t, opts),            // floor
      Bodies.rectangle(-t / 2, H / 2 - H, t, H * 4, opts),               // left
      Bodies.rectangle(W + t / 2, H / 2 - H, t, H * 4, opts),            // right
      Bodies.rectangle(W / 2, -H * 1.5 - t / 2, W + t * 2, t, opts),     // ceiling, high up so typed chars can fall in
    ];
    Composite.add(this.engine.world, this.walls);
  }

  private relayout() {
    const prevW = this.W, prevH = this.H;
    this.measureStage();
    // Ignore the phone address bar sliding in and out.
    if (this.W === prevW && Math.abs(this.H - prevH) < 140) return;
    this.card.close(false, true);
    this.endDrag();
    this.layout = layoutWord(CFG, this.W, this.H);
    this.letters.forEach((it) => this.sizeLetter(it));
    [...this.typed].forEach((it) => this.removeTyped(it, true));
    this.buildWalls();
    this.fx.resize(this.W, this.H);
    ScrollTrigger.refresh();
  }

  private bindResize() {
    let t = 0;
    const onResize = () => { clearTimeout(t); t = window.setTimeout(() => this.relayout(), 180); };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
  }

  /* ---------- Intro ---------- */

  private async intro() {
    const I = CFG.intro;
    const els = this.letters.map((l) => l.el);
    const glyphs = this.letters.map((l) => l.glyph);
    gsap.set(els, { autoAlpha: 0 });

    const mobile = this.W < 700;
    const total = mobile ? I.fragments.mobile : I.fragments.desktop;
    const sumW = this.letters.reduce((a, l) => a + l.w, 0);
    const targets = this.letters.flatMap((l) => {
      const n = Math.max(4, Math.round((total * l.w) / sumW));
      return sampleGlyph(this.layout.letters[l.index], this.layout.fontSize, this.layout.metrics, n)
        .map((p) => ({ x: l.homeX - l.w / 2 + p.x, y: l.homeY - l.h / 2 + p.y }));
    });

    await this.fx.assemble(targets, I.fragmentSize, I.assembleMs);

    this.fx.resolveIntro(I.resolveMs);
    gsap.to(els, { autoAlpha: 1, duration: (I.resolveMs / 1000) * 0.5, ease: 'power1.out' });
    gsap.fromTo(glyphs,
      { color: CFG.colors.accent, scale: 1.1 },
      { color: CFG.colors.ink, scale: 1, duration: 0.7, ease: 'back.out(3)', stagger: 0.035, clearProps: 'color' });

    await wait(I.resolveMs + I.taglineDelayMs);
    gsap.to(this.root.querySelector('.hero__tagline'), { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.out' });
    gsap.to(this.root.querySelectorAll('.hero__hint, .hero__controls-inner'), { autoAlpha: 1, y: 0, duration: 0.7, delay: 0.35, ease: 'power3.out' });
    this.live = true;
  }

  /* ---------- Frame loop ---------- */

  private tick = (_t: number, deltaMs: number) => {
    if (!this.inView) return;
    const parked = this.scrollP > 0.015;

    if (this.live && !parked) {
      this.acc += Math.min(deltaMs, 50);
      let steps = 0;
      while (this.acc >= STEP && steps < 3) { Engine.update(this.engine, STEP); this.acc -= STEP; steps++; }
      if (steps === 3) this.acc = 0;

      this.releaseQueue.forEach((it) => this.release(it));
      this.releaseQueue.clear();

      const idle = performance.now() - this.lastInteraction > CFG.physics.returnDelayMs;
      for (const it of this.letters) {
        if (it.state !== 'loose') continue;
        const p = it.body.position;
        const lost = p.y > this.H + 400 || p.x < -400 || p.x > this.W + 400;
        if (lost || (idle && this.drag?.item !== it)) this.returnHome(it, lost ? 600 : CFG.physics.returnMs);
      }
    } else if (parked) {
      // Scrolling takes over: bring every letter home quickly and stop the physics.
      if (this.drag) this.endDrag();
      for (const it of this.letters) if (it.state === 'loose') this.returnHome(it, 500, 'power3.out');
    }

    this.computeOffsets();
    for (const it of this.letters) this.render(it);
    if (!parked) for (const it of this.typed) this.render(it);
  };

  /** Scroll stretch: letters widen and the word splits around a gap between NEI and KOLI. */
  private computeOffsets() {
    const { sx, gap } = this.st;
    const n = this.letters.length;
    if (sx === 1 && gap === 0) { this.offsets.fill(0); return; }
    const split = Math.ceil(n / 2) - 1; // last index of the left group
    const seam = this.letters[split].homeX + this.letters[split].w / 2;
    // As the gap opens, slide it to the centre of the screen so the tagline rises through it.
    const splitX = seam + (this.W / 2 - seam) * Math.min(1, gap / this.gapPx());
    let cur = splitX + gap / 2;
    for (let i = split + 1; i < n; i++) {
      const l = this.letters[i];
      this.offsets[i] = cur + (l.w * sx) / 2 - l.homeX;
      cur += l.w * sx;
    }
    cur = splitX - gap / 2;
    for (let i = split; i >= 0; i--) {
      const l = this.letters[i];
      this.offsets[i] = cur - (l.w * sx) / 2 - l.homeX;
      cur -= l.w * sx;
    }
  }

  private render(it: Item) {
    const p = it.body.position;
    const ln = it.lean;
    if (it.state !== 'home') { ln.tx = ln.ty = ln.tr = 0; }
    ln.x += (ln.tx - ln.x) * 0.16; ln.y += (ln.ty - ln.y) * 0.16; ln.r += (ln.tr - ln.r) * 0.16;
    it.squash *= 0.82;
    if (it.squash < 0.002) it.squash = 0;

    const isLetter = it.index >= 0;
    const ox = isLetter ? this.offsets[it.index] : 0;
    const sx = (isLetter ? this.st.sx : 1) * (1 + it.squash);
    const sy = 1 - it.squash * 0.8;
    const x = p.x - it.w / 2 + ox + ln.x;
    const y = p.y - it.h / 2 + ln.y;
    const a = it.body.angle + ln.r;
    const t = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${a.toFixed(4)}rad) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
    if (t !== it.last) { it.el.style.transform = t; it.last = t; }
  }

  /* ---------- Physics state changes ---------- */

  private release(it: Item) {
    if (it.state === 'loose') return;
    it.tween?.kill(); it.tween = null;
    Body.setStatic(it.body, false);
    Sleeping.set(it.body, false);
    it.state = 'loose';
  }

  private returnHome(it: Item, ms: number, ease: string = CFG.physics.returnEase) {
    if (it.state !== 'loose') return;
    const b = it.body;
    Body.setStatic(b, true);
    // Take the short way round so letters do not spin several turns on the way home.
    let a = b.angle % TAU;
    if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU;
    Body.setAngle(b, a);
    const proxy = { x: b.position.x, y: b.position.y, a };
    it.state = 'returning';
    it.tween = gsap.to(proxy, {
      x: it.homeX, y: it.homeY, a: 0, duration: ms / 1000, ease,
      onUpdate: () => { Body.setPosition(b, { x: proxy.x, y: proxy.y }); Body.setAngle(b, proxy.a); },
      onComplete: () => { it.state = 'home'; it.tween = null; },
    });
  }

  private onCollide = (e: Matter.IEventCollision<Matter.Engine>) => {
    for (const pair of e.pairs) {
      const A = pair.bodyA, B = pair.bodyB;
      const dvx = A.velocity.x - B.velocity.x, dvy = A.velocity.y - B.velocity.y;
      const speed = Math.hypot(dvx, dvy);
      for (const [self, other] of [[A, B], [B, A]] as const) {
        const it = self.plugin?.item as Item | undefined;
        if (!it) continue;
        if (speed > 2) it.squash = Math.min(0.16, speed * 0.012);
        // A fast hit knocks a resting letter loose.
        if (it.index >= 0 && it.state === 'home' && !other.isStatic && speed > CFG.physics.knockLooseSpeed) {
          this.releaseQueue.add(it);
          this.touch();
        }
      }
    }
  };

  private touch() { this.lastInteraction = performance.now(); }

  /* ---------- Pointer: drag, throw, double-tap, cursor field ---------- */

  private bindPointer() {
    const canGlow = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const glow = this.root.querySelector<HTMLElement>('[data-glow]')!;
    const gx = gsap.quickTo(glow, 'x', { duration: 0.5, ease: 'power3.out' });
    const gy = gsap.quickTo(glow, 'y', { duration: 0.5, ease: 'power3.out' });
    if (!canGlow) glow.remove();

    for (const it of this.letters) {
      it.el.addEventListener('pointerdown', (e) => this.onDown(e, it));
    }
    this.stage.addEventListener('pointermove', (e) => {
      if (this.drag || e.pointerType !== 'mouse' || this.scrollP > 0.015) return;
      const r = this.stage.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (canGlow) { gx(x - CFG.cursor.glowSize / 2); gy(y - CFG.cursor.glowSize / 2); gsap.to(glow, { autoAlpha: CFG.cursor.glowOpacity, duration: 0.4, overwrite: 'auto' }); }
      this.field(x, y);
    });
    this.stage.addEventListener('pointerleave', () => {
      this.field(-1e5, -1e5);
      if (canGlow) gsap.to(glow, { autoAlpha: 0, duration: 0.5, overwrite: 'auto' });
    });
  }

  /** Letters at rest lean and ripple away from a nearby pointer. */
  private field(x: number, y: number) {
    const { radius, push, tilt } = CFG.cursor;
    for (const it of this.letters) {
      const dx = it.homeX + this.offsets[it.index] - x, dy = it.homeY - y;
      const d = Math.hypot(dx, dy);
      const ln = it.lean;
      if (d > radius || it.state !== 'home') { ln.tx = ln.ty = ln.tr = 0; continue; }
      const f = Math.pow(1 - d / radius, 2);
      ln.tx = (dx / (d || 1)) * push * f;
      ln.ty = (dy / (d || 1)) * push * f;
      ln.tr = ((Math.sign(dx) * tilt * f) * Math.PI) / 180;
    }
  }

  private onDown(e: PointerEvent, it: Item) {
    if (!this.live || this.scrollP > 0.015 || e.button > 0 || this.drag) return;
    e.preventDefault();
    it.el.setPointerCapture(e.pointerId);
    const rect = this.stage.getBoundingClientRect();
    this.drag = { item: it, id: e.pointerId, x0: e.clientX, y0: e.clientY, started: false, constraint: null, rect };
    gsap.fromTo(it.glyph, { scale: 1 }, { scale: 1.08, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' });
    this.root.classList.add('is-grabbing');
    this.touch();

    const move = (ev: PointerEvent) => {
      const d = this.drag;
      if (!d || ev.pointerId !== d.id) return;
      const x = ev.clientX - d.rect.left, y = ev.clientY - d.rect.top;
      if (!d.started) {
        if (Math.hypot(ev.clientX - d.x0, ev.clientY - d.y0) < 5) return;
        d.started = true;
        this.release(it);
        const b = it.body;
        d.constraint = Constraint.create({
          pointA: { x, y }, bodyB: b,
          pointB: { x: x - b.position.x, y: y - b.position.y },
          stiffness: 0.22, damping: 0.08, length: 0,
        });
        Composite.add(this.engine.world, d.constraint);
      }
      d.constraint!.pointA = { x, y };
      Sleeping.set(it.body, false);
      this.touch();
    };
    const up = (ev: PointerEvent) => {
      const d = this.drag;
      if (!d || ev.pointerId !== d.id) return;
      it.el.removeEventListener('pointermove', move);
      it.el.removeEventListener('pointerup', up);
      it.el.removeEventListener('pointercancel', up);
      const wasDrag = d.started;
      this.endDrag();
      if (wasDrag) {
        const v = it.body.velocity, k = CFG.physics.throwBoost;
        Body.setVelocity(it.body, { x: v.x * k, y: v.y * k });
      } else if (ev.type === 'pointerup') {
        const now = performance.now();
        if (this.lastTap?.item === it && now - this.lastTap.t < 340) { this.lastTap = null; this.openReveal(it); }
        else this.lastTap = { item: it, t: now };
      }
      this.touch();
    };
    it.el.addEventListener('pointermove', move);
    it.el.addEventListener('pointerup', up);
    it.el.addEventListener('pointercancel', up);
  }

  private endDrag() {
    const d = this.drag;
    if (!d) return;
    if (d.constraint) Composite.remove(this.engine.world, d.constraint);
    try { d.item.el.releasePointerCapture(d.id); } catch { /* already released */ }
    this.drag = null;
    this.root.classList.remove('is-grabbing');
  }

  private openReveal(it: Item, viaKeyboard = false) {
    const content = CFG.reveals[it.index];
    if (content) this.card.open(it.index, it.el, it.glyph.textContent ?? '', content, viaKeyboard);
  }

  /* ---------- Typing into the scene ---------- */

  private bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (!this.live || !this.inView || this.scrollP > 0.015) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1 || e.key === ' ') return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]') || this.card.isOpen) return;
      if (!/[\p{L}\p{N}!?&@#$%*+=]/u.test(e.key)) return;
      this.spawn(e.key);
      this.buffer = (this.buffer + e.key.toLowerCase()).slice(-12);
      const hit = CFG.typing.triggers.find((w) => this.buffer.endsWith(w));
      if (hit) { this.buffer = ''; this.celebrate(); }
    });
  }

  private advance100(ch: string) {
    let a = this.advCache.get(ch);
    if (a === undefined) { a = measureAdvances(ch)[0] || 60; this.advCache.set(ch, a); }
    return a;
  }

  private spawn(raw: string) {
    const ch = raw.toUpperCase();
    const L = this.layout;
    const size = Math.max(CFG.typing.minSize, L.fontSize * CFG.typing.sizeRatio);
    const k = size / 100;
    const w = this.advance100(ch) * k, h = L.metrics.capAscent * k;
    const el = document.createElement('span');
    el.className = 'letter letter--typed';
    el.setAttribute('aria-hidden', 'true');
    Object.assign(el.style, { width: w + 'px', height: h + 'px' });
    const glyph = document.createElement('span');
    glyph.className = 'glyph display';
    glyph.textContent = ch;
    Object.assign(glyph.style, { fontSize: size + 'px', top: -(L.metrics.baseline - L.metrics.capAscent) * k + 'px' });
    el.appendChild(glyph);
    this.spawnEl.appendChild(el);

    const x = gsap.utils.random(this.W * 0.15, this.W * 0.85);
    const body = this.makeBody(x, -h, w * 0.9, h, false);
    Body.setAngle(body, gsap.utils.random(-0.4, 0.4));
    Body.setAngularVelocity(body, gsap.utils.random(-0.08, 0.08));
    const it: Item = {
      el, glyph, body, w, h, index: -1, homeX: x, homeY: -h, state: 'loose', tween: null,
      lean: { x: 0, y: 0, r: 0, tx: 0, ty: 0, tr: 0 }, squash: 0, last: '',
    };
    body.plugin = { item: it };
    Composite.add(this.engine.world, body);
    this.typed.push(it);
    this.touch();
    while (this.typed.length > CFG.typing.maxChars) this.removeTyped(this.typed[0]);
  }

  private removeTyped(it: Item, instant = false) {
    this.typed = this.typed.filter((t) => t !== it);
    const done = () => { Composite.remove(this.engine.world, it.body); it.el.remove(); };
    if (instant) done();
    else gsap.to(it.el, { autoAlpha: 0, scale: 0.6, duration: 0.4, onComplete: done });
  }

  private celebrate() {
    const L = this.layout;
    this.fx.burstAt(L.left + L.width / 2, L.top + L.height / 2, this.W < 700 ? 60 : 110, L.width * 0.8);
    gsap.fromTo(this.letters.map((l) => l.glyph), { scale: 1 },
      { scale: 1.18, duration: 0.14, yoyo: true, repeat: 1, stagger: 0.035, ease: 'power2.out' });
    window.setTimeout(() => scrollToTarget(CFG.typing.triggerTarget), 650);
  }

  /* ---------- Phone tilt ---------- */

  private bindTilt() {
    const btn = this.root.querySelector<HTMLButtonElement>('[data-tilt]')!;
    const coarse = matchMedia('(pointer: coarse)').matches;
    if (!coarse || typeof DeviceOrientationEvent === 'undefined') return;

    const listen = () => window.addEventListener('deviceorientation', this.onTilt);
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<'granted' | 'denied'> };
    if (typeof DOE.requestPermission === 'function') {
      // iOS: needs a tap to ask permission.
      btn.hidden = false;
      btn.addEventListener('click', async () => {
        try {
          const res = await DOE.requestPermission!();
          if (res === 'granted') { listen(); btn.textContent = 'Tilt on'; btn.disabled = true; }
          else { btn.textContent = 'Tilt unavailable'; btn.disabled = true; }
        } catch { btn.hidden = true; }
      });
    } else {
      listen();
    }
  }

  private onTilt = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null || !this.live) return;
    const angle = (screen.orientation?.angle ?? (window.orientation as number) ?? 0) as number;
    let side = e.gamma, fwd = e.beta;
    if (angle === 90) { side = e.beta; fwd = -e.gamma; }
    else if (angle === 270 || angle === -90) { side = -e.beta; fwd = e.gamma; }
    const { strength, releaseAngle } = CFG.tilt;
    const clamp = gsap.utils.clamp(-1, 1);
    this.engine.gravity.x = clamp(side / 45) * strength;
    this.engine.gravity.y = clamp(fwd / 45) * strength;
    if (Math.abs(side) > releaseAngle && this.scrollP <= 0.015 && this.inView) {
      for (const it of this.letters) if (it.state === 'home') this.release(it);
      this.touch();
    }
  };

  /* ---------- Reset ---------- */

  private reset() {
    this.card.close(false, true);
    this.endDrag();
    [...this.typed].forEach((it) => this.removeTyped(it));
    this.engine.gravity.x = 0;
    this.engine.gravity.y = CFG.physics.gravity;
    for (const it of this.letters) {
      if (it.state === 'loose') this.returnHome(it, 900);
    }
    this.lastInteraction = 0;
  }

  /* ---------- Scroll story ---------- */

  private gapPx() { return Math.max(240, CFG.scroll.spreadVw * this.W); }

  /** Where the word must go (translate + scale about its top-left) to sit exactly on the header logo. */
  private dock() {
    const logo = document.querySelector<HTMLElement>('[data-dock-target]');
    const L = this.layout;
    if (!logo) return { x: 0, y: -this.H, s: 0.1 };
    const r = logo.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(logo).fontSize);
    const s = fs / L.fontSize;
    const capTop = r.top + ((L.metrics.baseline - L.metrics.capAscent) * fs) / 100;
    return { x: r.left - s * L.left, y: capTop - s * L.top, s };
  }

  private buildScroll() {
    const copy = this.root.querySelector<HTMLElement>('.hero__copy')!;
    const hintWrap = this.root.querySelector('.hero__hint-wrap');
    const controls = this.root.querySelector('.hero__controls');
    const logo = document.querySelector('[data-dock-target]');
    gsap.set(this.wordEl, { transformOrigin: '0 0' });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: this.root, start: 'top top', end: 'bottom bottom',
        scrub: 0.6, invalidateOnRefresh: true,
        onUpdate: (self) => {
          const wasParked = this.scrollP > 0.015;
          this.scrollP = self.progress;
          if (self.progress > 0.015 && !wasParked) {
            this.card.close(false);
            this.field(-1e5, -1e5);
            gsap.to('[data-glow]', { autoAlpha: 0, duration: 0.4, overwrite: 'auto' });
          }
        },
      },
    });

    tl.to([hintWrap, controls, this.spawnEl], { autoAlpha: 0, duration: 0.06 }, 0)
      // 1. Stretch: letters widen and pull apart; the tagline rises through the gap.
      .to(this.st, { sx: CFG.scroll.stretchScaleX, gap: () => this.gapPx(), duration: 0.38, ease: 'power2.inOut' }, 0)
      .to(copy, {
        y: () => {
          const c = copy.getBoundingClientRect();
          const wordMid = this.layout.top + this.layout.height / 2;
          return wordMid - (c.top + c.height / 2) - this.layout.height * 0.9;
        },
        duration: 0.44,
      }, 0.02)
      .to(copy, { autoAlpha: 0, duration: 0.08 }, 0.38)
      // 2. Snap back together.
      .to(this.st, { sx: 1, gap: 0, duration: 0.12, ease: 'power4.in' }, 0.42)
      // 3. Shrink and dock into the top-left logo.
      .to(this.wordEl, {
        x: () => this.dock().x, y: () => this.dock().y, scale: () => this.dock().s,
        duration: 0.34, ease: 'power3.inOut',
      }, 0.56)
      .to(logo, { opacity: 1, duration: 0.04 }, 0.92)
      .to(this.wordEl, { opacity: 0, duration: 0.04 }, 0.92)
      .to({}, { duration: 0.04 }, 0.96); // hold, while the next section rises over the stage
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Entry point. Reduced motion (or a failure) leaves the static server-rendered hero in place. */
export function mountHero(root: HTMLElement | null) {
  if (!root) return;
  if (prefersReducedMotion()) { root.classList.add('is-static'); return; }
  const hero = new Hero(root);
  hero.init().catch((err) => {
    console.error('[hero] falling back to static', err);
    root.classList.remove('is-ready');
    root.classList.add('is-static');
  });
}
