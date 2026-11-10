import { gsap } from 'gsap';

export interface RevealContent { title: string; body: string; href: string; cta: string }

/** The flip card shown on double-click / double-tap / Enter on a letter. */
export class RevealCard {
  private openIndex = -1;
  private returnFocus: HTMLElement | null = null;
  private glyph: HTMLElement | null = null;
  private titleEl: HTMLElement;
  private bodyEl: HTMLElement;
  private linkEl: HTMLAnchorElement;
  private keyEl: HTMLElement;

  constructor(private card: HTMLElement, private stage: HTMLElement, private reduced: boolean) {
    this.titleEl = card.querySelector('[data-card-title]')!;
    this.bodyEl = card.querySelector('[data-card-body]')!;
    this.linkEl = card.querySelector('[data-card-link]')!;
    this.keyEl = card.querySelector('[data-card-key]')!;
    card.querySelector('[data-card-close]')!.addEventListener('click', () => this.close());
    this.linkEl.addEventListener('click', () => this.close(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isOpen) this.close(); });
    document.addEventListener('pointerdown', (e) => {
      if (this.isOpen && !card.contains(e.target as Node) && !(e.target as HTMLElement).closest('.letter')) this.close(false);
    });
  }

  get isOpen() { return this.openIndex >= 0; }

  open(index: number, letterEl: HTMLElement, char: string, content: RevealContent, viaKeyboard = false) {
    if (this.openIndex === index) return;
    if (this.isOpen) this.close(false, true);
    this.openIndex = index;
    this.returnFocus = letterEl;
    this.glyph = letterEl.querySelector('.glyph');

    this.keyEl.textContent = char;
    this.titleEl.textContent = content.title;
    this.bodyEl.textContent = content.body;
    this.linkEl.href = content.href;
    this.linkEl.textContent = content.cta;

    gsap.killTweensOf(this.card);
    this.card.hidden = false;
    const s = this.stage.getBoundingClientRect();
    const l = letterEl.getBoundingClientRect();
    const c = this.card.getBoundingClientRect();
    const pad = 16;
    const x = gsap.utils.clamp(pad, s.width - c.width - pad, l.left - s.left + l.width / 2 - c.width / 2);
    const y = gsap.utils.clamp(pad + 48, s.height - c.height - pad, l.top - s.top + l.height / 2 - c.height / 2);
    gsap.set(this.card, { x, y });

    if (this.reduced) {
      gsap.set(this.card, { rotationY: 0, autoAlpha: 1 });
    } else {
      const tl = gsap.timeline();
      if (this.glyph) tl.to(this.glyph, { rotationY: 90, duration: 0.18, ease: 'power2.in' });
      tl.fromTo(this.card, { rotationY: -90, autoAlpha: 1 }, { rotationY: 0, duration: 0.42, ease: 'back.out(1.6)' });
    }
    this.linkEl.focus({ preventScroll: true, focusVisible: viaKeyboard } as FocusOptions);
  }

  close(restoreFocus = true, instant = false) {
    if (!this.isOpen) return;
    const glyph = this.glyph;
    const card = this.card;
    this.openIndex = -1;
    if (restoreFocus) this.returnFocus?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    if (this.reduced || instant) {
      gsap.set(card, { autoAlpha: 0 }); card.hidden = true;
      if (glyph) gsap.set(glyph, { rotationY: 0 });
      return;
    }
    gsap.timeline()
      .to(card, { rotationY: 90, duration: 0.2, ease: 'power2.in', onComplete: () => { card.hidden = true; } })
      .to(glyph ?? {}, { rotationY: 0, duration: 0.4, ease: 'back.out(1.8)' });
  }
}
