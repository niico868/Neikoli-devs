# Agent instructions

## Usage budget (Claude Pro, 5-hour window)

- Keep any single task well inside one 5-hour usage window. Long autonomous loops stop at **2 hours or 4 rounds**, whichever comes first, then report and wait.
- Timebox each individual fix to about 15 minutes or 2 attempts. If it still fails, log it and move on.
- Avoid parallel subagents. Use at most one reviewer or critic subagent per round.
- Before starting something that could run long, say how long you expect it to take.

## Skill routing

When a request matches a row below, invoke the listed skill **before** any other skill or general approach. Use the repo-scoped skills in `.claude/skills/` over similar global or plugin skills.

| When the user asks for… | Use first | Then / also |
|---|---|---|
| Matching reference images, "cook", "let it cook", "iterate until it matches", 3D/WebGL/shader scenes | `cook` (capped, see budget above) | `find-references` |
| Building, designing, redesigning or polishing a page, landing page or site; "looks generic / AI-made" | `design-taste-frontend` | `website-design-system`, `website-new-page` |
| A brand-new website from scratch | `new-website` | `design-taste-frontend` |
| A new page on this site | `website-new-page` | `design-taste-frontend` |
| Scroll-driven, cinematic, layered-hero or "Apple-style" pages | `scroll-craft` | `website-motion` |
| Animation or motion on the site | `website-motion` | `transition-craft` |
| Turning a screenshot, mockup or Figma frame into code | `image-to-code` | `design-taste-frontend` |
| Finding visual references or moodboards | `find-references` | |
| Logo, wordmark, monogram, brand mark | `logo-design-studio` (full workflow, 1,400+ references) | `logo-design` (quick SVG concepts) |
| Brand kit, colors, fonts, design tokens | `website-brand-kit` | `website-design-system` |
| Shader backgrounds or logo stings **for videos** (not website shaders) | `paper-shaders` | |
| Video titles, lower thirds, kinetic typography | `title-design` | `kinetic-type-art` |
| Video transitions | `transition-craft` | |
| Page copy: homepage, landing, about, pricing, CTAs | `copywriting` | `copywriter-agent` for variants |
| Ads, emails, social posts, taglines, headline variants | `copywriter-agent` | `website-tagline` |
| Store or product copy, checkout, cart, product descriptions | `ecommerce-copywriting` | |
| Positioning or tagline | `website-positioning` | `website-tagline` |
| Testimonials section | `website-testimonials` | |
| Contact form | `website-contact-form` | |
| SEO, AI search visibility, structured data, social preview images | `website-seo-geo` | `schema-markup`, `og-images` |
| Reviewing the site | `website-review` | `website-qa` |
| Before launch or deploy | `website-launch-check` | `website-qa` |
