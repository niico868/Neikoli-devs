// @ts-check
import { defineConfig } from 'astro/config';

// Static output for Phase 1. Cloudflare adapter + SSR routes (/dashboard, API)
// get added in Phase 2–4 with @astrojs/cloudflare.
export default defineConfig({
  site: 'https://neikoli.com',
  output: 'static',
});
