import { gsap, ScrollTrigger } from './motion';

/**
 * Section motion below the hero. Intensity builds down the page:
 *   About   calm: headline letters stretch and settle, copy fades up
 *   Work    letters snap in, rows slide in
 *   Smuggler's Paradise (most energetic): pinned horizontal run, velocity-driven
 *           letter wave, skewing panel titles, marquee that speeds up and flips
 *   Services letters snap, prices count up
 *   Contact  big wave headline, doors rise
 * Everything sits inside a no-preference media query, so reduced motion gets the static page.
 */
export function initSections() {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const velocity = trackVelocity();
    calmReveals();
    kineticStretch();
    kineticSnap();
    workRows();
    smugglersParadise(velocity);
    kineticWave(velocity);
    services();
    contactDoors();
    // Fonts change line lengths; measure again once they are in.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  });
}

/** Smoothed scroll velocity in px/s, shared by the energetic sections. */
function trackVelocity() {
  const v = { raw: 0, smooth: 0 };
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => { v.raw = self.getVelocity(); } });
  gsap.ticker.add(() => { v.smooth += (v.raw - v.smooth) * 0.12; v.raw *= 0.9; });
  return v;
}

const chars = (el: Element) => [...el.querySelectorAll<HTMLElement>('.kt__ch')];

function calmReveals() {
  gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((group) => {
    gsap.from(group.children, {
      y: 28, autoAlpha: 0, duration: 1, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: group, start: 'top 85%', once: true },
    });
  });
}

/** About: letters start stretched wide and pulled apart, then settle as you scroll. */
function kineticStretch() {
  document.querySelectorAll('[data-kinetic="stretch"]').forEach((title) => {
    const cs = chars(title);
    const mid = (cs.length - 1) / 2;
    gsap.from(cs, {
      scaleX: 2.1, x: (i) => (i - mid) * 10, autoAlpha: 0.15, ease: 'power2.out',
      scrollTrigger: { trigger: title, start: 'top 95%', end: 'top 45%', scrub: 0.6 },
    });
  });
}

/** Work and Services: letters fly in from scattered positions and snap together. */
function kineticSnap() {
  document.querySelectorAll('[data-kinetic="snap"]').forEach((title) => {
    gsap.from(chars(title), {
      yPercent: () => gsap.utils.random(-140, 140),
      rotation: () => gsap.utils.random(-30, 30),
      scale: () => gsap.utils.random(0.4, 1.6),
      autoAlpha: 0, ease: 'back.out(2.2)', stagger: { each: 0.02, from: 'random' },
      scrollTrigger: { trigger: title, start: 'top 92%', end: 'top 50%', scrub: 0.5 },
    });
  });
}

function workRows() {
  gsap.utils.toArray<HTMLElement>('[data-work-row]').forEach((row, i) => {
    gsap.from(row, {
      x: i % 2 ? 80 : -80, autoAlpha: 0, duration: 1, ease: 'power4.out',
      scrollTrigger: { trigger: row, start: 'top 88%', once: true },
    });
  });
}

function smugglersParadise(v: { smooth: number }) {
  const section = document.querySelector<HTMLElement>('[data-sp]');
  if (!section) return;
  const pin = section.querySelector<HTMLElement>('[data-sp-pin]')!;
  const track = section.querySelector<HTMLElement>('[data-sp-track]')!;
  const keys = gsap.utils.toArray<HTMLElement>('[data-sp-key]', section);
  const marquee = section.querySelector<HTMLElement>('.sp__marquee-track')!;

  const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
  gsap.to(track, {
    x: () => -distance(), ease: 'none',
    scrollTrigger: {
      trigger: section, start: 'top top', end: () => '+=' + (distance() + window.innerHeight * 0.4),
      pin, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
    },
  });

  // Marquee drifts on its own, then races and flips direction with the scroll.
  let mx = 0, dir = -1;
  const half = () => marquee.scrollWidth / 2;
  const setX = gsap.quickSetter(marquee, 'x', 'px');
  // Panel titles skew and stretch with scroll speed, then spring back.
  const skew = keys.map((k) => gsap.quickTo(k, 'skewX', { duration: 0.5, ease: 'power3.out' }));
  const stretch = keys.map((k) => gsap.quickTo(k, 'scaleX', { duration: 0.5, ease: 'power3.out' }));

  let visible = false;
  ScrollTrigger.create({ trigger: section, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });
  gsap.ticker.add((_t, dt) => {
    if (!visible) return;
    const s = v.smooth;
    if (Math.abs(s) > 30) dir = s > 0 ? -1 : 1;
    mx += dir * (0.04 + Math.min(Math.abs(s), 4000) / 9000) * dt;
    const h = half();
    if (h > 0) { if (mx < -h) mx += h; if (mx > 0) mx -= h; }
    setX(mx);
    const k = gsap.utils.clamp(-1, 1, s / 2500);
    skew.forEach((f) => f(k * -14));
    stretch.forEach((f) => f(1 + Math.abs(k) * 0.35));
  });
}

/** Smuggler's Paradise and Contact: letters ripple with scroll speed. */
function kineticWave(v: { smooth: number }) {
  document.querySelectorAll<HTMLElement>('[data-kinetic="wave"]').forEach((title) => {
    const cs = chars(title);
    gsap.from(cs, {
      yPercent: 110, autoAlpha: 0, ease: 'power4.out', stagger: 0.03,
      scrollTrigger: { trigger: title, start: 'top 95%', end: 'top 55%', scrub: 0.5 },
    });
    const ys = cs.map((c) => gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power2.out' }));
    const sy = cs.map((c) => gsap.quickTo(c, 'scaleY', { duration: 0.35, ease: 'power2.out' }));
    let visible = false;
    ScrollTrigger.create({ trigger: title, start: 'top bottom', end: 'bottom top', onToggle: (s) => { visible = s.isActive; } });
    gsap.ticker.add((time) => {
      if (!visible) return;
      const amp = Math.min(Math.abs(v.smooth) / 60, 26);
      cs.forEach((_, i) => {
        const w = Math.sin(i * 0.7 + time * 9);
        ys[i](w * amp);
        sy[i](1 + Math.max(0, w) * amp / 70);
      });
    });
  });
}

function services() {
  gsap.utils.toArray<HTMLElement>('[data-pkg]').forEach((card, i) => {
    gsap.from(card, {
      y: 60, autoAlpha: 0, duration: 0.9, delay: i * 0.08, ease: 'power3.out',
      scrollTrigger: { trigger: card, start: 'top 90%', once: true },
    });
  });
  gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
    const target = Number(el.dataset.count);
    const o = { n: 0 };
    gsap.to(o, {
      n: target, duration: 1.4, ease: 'power3.out',
      onUpdate: () => { el.textContent = '$' + Math.min(target, Math.round(o.n / 50) * 50).toLocaleString('en-US'); },
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
  gsap.from('[data-care]', {
    y: 30, autoAlpha: 0, duration: 0.8, stagger: 0.07, ease: 'power3.out',
    scrollTrigger: { trigger: '.care', start: 'top 88%', once: true },
  });
}

function contactDoors() {
  gsap.from('[data-door]', {
    y: 50, autoAlpha: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out',
    scrollTrigger: { trigger: '.doors', start: 'top 88%', once: true },
  });
}
