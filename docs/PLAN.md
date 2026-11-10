# neikoli.com: plan and file structure

## Decisions taken for Phase 1 (flagged, easy to change)

| Open item in the brief | Choice | Why |
|---|---|---|
| Astro or Next.js | **Astro 7** | Ships zero JS by default and hydrates only the hero script, which is the best route to 60fps on a mid-range Android phone. It deploys to Cloudflare Pages/Workers with the official adapter, and the private `/dashboard` can be server-rendered routes later (with a React island if it needs one). |
| Hosting | **Cloudflare Pages** (static now, `@astrojs/cloudflare` adapter in Phase 2) | Matches the brief's build plan. |
| Backend | **Supabase** (auth, Postgres with RLS, storage) | Matches the brief. Not touched in Phase 1. |
| Section order | Brief's kickoff order: Hero, About, Work, Smuggler's Paradise, Services, Contact | Placeholders only for now. |
| Fonts | **Archivo (variable, self-hosted) as a stand-in** | Akira Expanded needs a confirmed commercial licence and Satoshi could not be downloaded from this sandbox. Archivo at 125% width / 900 weight stands in for Akira; Archivo normal width stands in for Satoshi. Swap instructions are in `src/styles/fonts.css`. |

## File structure

```
neikoli/
├─ astro.config.mjs          static output; Cloudflare adapter arrives in Phase 2
├─ public/
│  ├─ favicon.svg
│  └─ fonts/                 drop AkiraExpanded + Satoshi .woff2 here
├─ src/
│  ├─ pages/index.astro      page order lives here
│  ├─ layouts/Base.astro     <head>, reduced-motion class, grain overlay
│  ├─ components/
│  │  ├─ SiteHeader.astro    fixed header; its logo is the hero's dock target
│  │  ├─ hero/Hero.astro     hero markup + styles (static fallback word included)
│  │  ├─ KineticTitle.astro  headline split into letters for kinetic type
│  │  └─ sections/           About, Work, SmugglersParadise, Services, Contact (placeholders)
│  ├─ scripts/
│  │  ├─ motion.ts           Lenis smooth scroll wired to GSAP's ticker + ScrollTrigger
│  │  └─ hero/
│  │     ├─ config.ts        ← every tunable value: gravity, bounce, return delay, colours, copy, reveal cards
│  │     ├─ hero.ts          physics, drag/throw, cursor field, typing, tilt, reset, scroll story
│  │     ├─ layout.ts        font metrics, word layout, glyph sampling for the intro
│  │     ├─ fx.ts            canvas for the red fragments (intro + celebration burst)
│  │     ├─ reveal.ts        double-tap flip card
│  │     ├─ keepy.ts         keepy-uppy game on the O (ball, kicks, counter, high score board)
│  │     └─ scores.ts        top-10 score store (local now, Supabase in Phase 2)
│  │  sections.ts            scroll motion for the sections below the hero
│  ├─ data/site.ts           work list, packages, care plans
│  └─ styles/                tokens.css (colours/type/space), fonts.css, global.css
└─ docs/PLAN.md              this file
```

## How the hero works

- Each letter is a `<button>` positioned by a Matter.js body, so type stays crisp DOM text. Resting letters are frozen at home; they come loose when dragged, hit hard, or the phone tilts.
- Letters return home after 3 seconds idle with an elastic ease (taking the short way round so they do not spin).
- Typed characters fall in as red letters (cap 40, oldest fade). Typing `hire`, `work` or `hello` fires a burst and scrolls to `#contact`.
- Scroll story (pinned stage, 220vh): letters stretch and split, tagline rises through the gap, letters snap back, shrink and dock exactly onto the header logo. The next section rises over the stage so there is no blank screen.
- Physics stops the moment scrolling starts and whenever the hero is off screen.
- Keepy-uppy: a single tap on the O drops a soccer ball (a double tap still opens the O card). Hold the mouse button or a finger under the ball to kick it up; each kick pops the counter. When the ball hits the floor, a high score board opens bottom right with the top 10 only, and a top-10 score asks for initials. The ball passes in front of the letters so it can't get stuck on them. Scores are saved in the visitor's browser for now; Phase 2 moves them to a Supabase `game_scores` table queried with `limit 10`, which makes the board shared by everyone.
- `prefers-reduced-motion` and no-JS both get the static word with the tagline, a one-screen hero, and no smooth scroll.

## Phases (from the brief)

1. **Phase 1, public site**. 1a scaffold + hero (approved). 1a+ keepy-uppy game (done). 1b real content and motion for About, Work, Smuggler's Paradise, Services, Contact, building intensity down the page (done, awaiting approval). Still needed from Nico: project screenshots, Smuggler's Paradise designs/content/ethos/story, the Brussels Apparel build URL, a photo for About.
2. **Phase 2, backend**: Supabase tables (leads, messages, bookings, projects, invoices, page_views) with RLS on every table; Cloudflare adapter.
3. **Phase 3, contact**: message form → dashboard, Cal.com embed + webhook, then the chatbot (Neikoli's assistant).
4. **Phase 4, dashboard**: `/dashboard` behind Supabase login.
5. **Launch**: connect neikoli.com in Cloudflare, analytics, real-phone test.

## Run it

Node 22.12+ is required by Astro 7 (the brief said Node 20; Astro 7 needs newer).

```
npm install
npm run dev        # http://localhost:4321
npm run build && npm run preview
```

To test on a phone on the same Wi-Fi: `npm run dev -- --host`, then open the printed network URL. Tilt needs HTTPS on a real phone, so test tilt on a Cloudflare Pages preview deploy.

## Test checklist status (headless Chromium; real-phone checks still needed)

- [x] Intro assembles and lands in about 2.5 s
- [x] Letters can be grabbed and thrown (mouse and touch)
- [x] Letters return home after 3 s
- [x] Double-click / double-tap reveals a card (and Enter on a focused letter)
- [x] Typing `hire` bursts and jumps to contact
- [ ] Tilt on a real phone (code path in place; needs a device)
- [x] Scroll stretch and dock into the logo
- [x] ~60fps with 4x CPU throttling on a Pixel 7 profile (intro avg 59.6fps, throw avg 60fps)
- [x] Reduced-motion shows a clean static hero

## Performance trade-offs

- Letters are 7 DOM nodes moved only with `transform`; a transform string is written only when it changes.
- Fragments draw on one canvas that only runs during the intro and bursts (DPR capped at 1.5 on phones).
- Physics uses a fixed 60Hz step with sleeping bodies, and does not run while scrolling or off screen.
- The cursor glow (a blurred circle) is desktop-only. The grain is a static SVG with no blend mode.
- Hero JS is ~83 KB gzipped (Matter.js + GSAP + Lenis). It could be cut later by lazy-loading Matter on first interaction.

## Section motion (Phase 1b), calm to energetic

| Section | Motion |
|---|---|
| About | Headline letters start stretched and spread, then settle; copy fades up |
| Work | Headline letters fly in and snap together; rows slide in from alternating sides |
| Smuggler's Paradise | Dark section, pinned horizontal run through Designs / Content / Ethos / Story; title letters ripple with scroll speed; panel titles skew and stretch with speed; marquee races and flips direction |
| Services | Headline snaps in; package prices count up; cards rise |
| Contact | Huge "Let's talk." ripples with scroll speed; doors rise |

Reduced motion turns all of it off (the pinned run becomes wrapped panels). Measured ~59fps through the pinned section on a Pixel 7 profile at 4x CPU slowdown.
