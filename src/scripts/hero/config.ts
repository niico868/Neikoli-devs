/**
 * HERO CONFIG
 * Every tunable value for the NEIKOLI hero lives here.
 * Change numbers, copy and colours in this one object; the code reads from it.
 */
export const HERO_CONFIG = {
  word: 'NEIKOLI',
  tagline: 'I build websites and systems that make businesses look as good as they are.',
  hint: 'Grab the letters.',

  colors: {
    paper: '#F4F1EA',
    ink: '#111111',
    accent: '#8B0F14',
  },

  layout: {
    widthRatio: 0.85,        // word spans this share of the viewport width
    maxHeightRatio: 0.34,    // ...but its font size never exceeds this share of viewport height
    verticalCenter: 0.44,    // where the word's centre sits (0 top, 1 bottom)
    letterSpacingEm: 0.0,    // extra tracking between letters
  },

  intro: {
    fragments: { desktop: 110, mobile: 64 }, // brief: 60 to 120
    fragmentSize: [3, 9],                    // min/max px
    assembleMs: 1600,                        // fragments fly in
    resolveMs: 450,                          // fragments turn into solid letters
    taglineDelayMs: 250,                     // after the letters resolve
  },

  physics: {
    gravity: 1.8,            // Matter.js gravity.y once letters are loose
    restitution: 0.35,       // bounce
    friction: 0.08,
    frictionAir: 0.012,
    density: 0.0018,
    throwBoost: 1.0,         // multiplies the release velocity of a thrown letter
    knockLooseSpeed: 4.5,    // a hit faster than this frees a resting letter
    returnDelayMs: 3000,     // idle time before letters float home
    returnMs: 1300,          // length of the trip home
    returnEase: 'elastic.out(1, 0.55)',
    wallThickness: 200,
  },

  cursor: {
    radius: 220,             // px around the pointer that affects letters
    push: 18,                // max px a letter leans away
    tilt: 6,                 // max degrees a letter rotates while leaning
    glowSize: 360,           // desktop glow diameter in px
    glowOpacity: 0.16,
  },

  typing: {
    maxChars: 40,            // cap on spawned characters; oldest fade out
    sizeRatio: 0.28,         // spawned char size vs NEIKOLI letter size
    minSize: 34,
    triggers: ['hire', 'work', 'hello'],
    triggerTarget: '#contact',
  },

  tilt: {
    releaseAngle: 14,        // degrees of sideways tilt before letters come loose
    strength: 1.4,           // gravity at a 45 degree tilt
  },

  scroll: {
    heroScrollVh: 220,       // how long (in viewport heights) the hero scroll story lasts
    stretchScaleX: 1.6,      // peak horizontal stretch of each letter
    spreadVw: 0.24,          // peak gap opened in the middle of the word (share of vw, min 240px)
  },

  // Double-click / double-tap a letter to flip it and reveal a card.
  // One entry per letter, in order. Edit freely.
  reveals: [
    { title: 'About Nico', body: 'Founder of Nexus Forge. Builds websites and the systems behind them.', href: '#about', cta: 'Read the story' },
    { title: 'Experience', body: 'Sites, booking dashboards and custom builders for real businesses.', href: '#work', cta: 'See the work' },
    { title: 'Ideas lab', body: 'Experiments, prototypes and things in the oven.', href: '#smugglers-paradise', cta: 'Take a look' },
    { title: 'Clients', body: "Cathy's Clean Green Classics, Melt Aways, Brussels Apparel and more.", href: '#work', cta: 'Meet them' },
    { title: 'Origin story', body: "It started with my mother's site, my father's and my own.", href: '#about', cta: 'How it began' },
    { title: 'Live build: Brussels Apparel', body: 'In progress right now. Watch it come together.', href: '#brussels', cta: 'View the build' },
    { title: 'Inquire', body: 'Ask the assistant, message me, or book a call.', href: '#contact', cta: 'Start a project' },
  ],
} as const;

export type HeroConfig = typeof HERO_CONFIG;
