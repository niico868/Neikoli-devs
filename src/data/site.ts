// Content shared by the sections. Edit here, not in the components.

export interface WorkItem {
  slug: string;
  name: string;
  kind: string;
  summary: string;
  tags: string[];
  status: 'live' | 'in-progress';
  url?: string;       // public site, when there is one
  liveUrl?: string;   // Brussels Apparel: the in-progress build to show in a frame
}

export const work: WorkItem[] = [
  {
    slug: 'cathys', name: "Cathy's Clean Green Classics", kind: 'Website',
    summary: 'Ordering site for made-to-order salads, homestyle meals and diabetic-friendly cold-pressed juices, with customer accounts for quick repeat orders and delivery slots built in.',
    tags: ['Design', 'Build', 'Online ordering', 'SEO setup'], status: 'live', url: 'https://cathyscleangreenclassics.com',
  },
  {
    slug: 'melt-elite', name: 'Melt Elite Aesthetics', kind: 'Clinic website + dashboard app',
    summary: 'A consultation-first body contouring clinic in El Dorado. Clients plan treatments and book consultations online; the clinic runs bookings and messages from its own dashboard.',
    tags: ['Website', 'Dashboard', 'Bookings'], status: 'live', url: 'https://meltawaysspa.com',
  },
  {
    slug: 'smugglers-builder', name: "Smuggler's Paradise custom builder", kind: 'Own build',
    summary: 'Storefront and design studio for my own brand: shoppers build their own heavyweight tee on the site, and every piece is printed to order.',
    tags: ['Custom feature', 'Product builder', 'Storefront'], status: 'live', url: 'https://smugpara.com/design',
  },
  {
    slug: 'bruffels', name: 'Bruffels Apparel × Passport to Paradise', kind: 'Storefront',
    summary: 'Authentic one-of-one menswear and bulk accessories under one roof. Being built right now: the live build is visible as it comes together.',
    tags: ['Website', 'Storefront', 'In progress'], status: 'in-progress',
    liveUrl: 'https://bruffles-apparelxptp.neikoliaugustine.workers.dev'
  },
];

export interface Package { name: string; price: number; tagline: string; includes: string[]; note?: string }

export const packages: Package[] = [
  {
    name: 'Basic', price: 4500, tagline: 'A sharp, custom site that does the essentials well.',
    includes: [
      '3 to 5 custom-designed pages, mobile and desktop friendly',
      'Domain setup and launch',
      'Contact form, email sign-up and Google Maps location',
      'A simple product showcase or a booking request form',
      'SEO setup: sitemap, page titles and descriptions, brand information, privacy policy, Google Business profile',
      '2 rounds of revisions',
    ],
    note: 'Nothing elaborate: no custom features.',
  },
  {
    name: 'Intermediate', price: 10000, tagline: 'Your site plus the tools to run bookings and messages.',
    includes: [
      'Everything in Basic',
      '1 or 2 custom-coded features, such as a freight calculator or a product designer with AI images, with a clear limit in the quote',
      'Client dashboard: view and reply to bookings and messages, with a calendar of appointment days',
      'Automatic email confirmations',
    ],
    note: 'No online card payments: that is Premium or an add-on.',
  },
  {
    name: 'Premium', price: 15000, tagline: 'The works.',
    includes: [
      'Everything in Intermediate',
      '7 to about 24 pages, plus any subdomains needed',
      'Online payments and checkout',
      'Advanced security: logins, roles and data protection',
      'A fully interactive business dashboard that schedules everything, including follow-ups, progress and reminder emails to clients',
    ],
  },
];

export const carePlans = [
  { name: 'Essential', ttd: 200, blurb: 'Hosting, backups, security, uptime monitoring.' },
  { name: 'Basic', ttd: 650, blurb: 'Essential, plus basic monthly SEO and 1 hour of edits.' },
  { name: 'Growth', ttd: 1500, blurb: 'Basic, plus 3 hours of edits, a monthly report and analytics, and review management.' },
  { name: 'Premium', ttd: 3000, blurb: 'Growth, plus 5 hours of edits, priority support, email marketing, conversion improvements and a monthly strategy call.' },
];

export const addOns = [
  { name: 'Advanced SEO', usd: 'from $400', ttd: 'from TT$2,700', what: 'Keyword tracking, new optimised content, backlinks, Google Business updates, rankings report' },
  { name: 'Meta ads management', usd: 'from $500', ttd: 'from TT$3,400', what: "Facebook and Instagram ads from your content. Ad spend is billed separately." },
  { name: 'Content production', usd: 'from $300', ttd: 'from TT$2,000', what: 'Blog posts, product photos, AI video ads' },
  { name: 'Email marketing', usd: '$250', ttd: 'TT$1,700', what: 'Monthly newsletter plus automated welcome, abandoned cart and win-back emails' },
  { name: 'Conversion improvements', usd: '$300', ttd: 'TT$2,000', what: 'Testing headlines, offers and layouts to turn more visitors into leads' },
  { name: 'AI chatbot', usd: '$99 to $199', ttd: 'TT$670 to TT$1,350', what: 'Chatbot hosting, training on your business information, monthly updates' },
  { name: 'Review management', usd: '$99', ttd: 'TT$670', what: 'Automatically asking happy customers for Google reviews and replying to them' },
  { name: 'Analytics and strategy call', usd: '$150', ttd: 'TT$1,000', what: 'Monthly report plus a 30-minute call on what to do next' },
];

export const metaAds = [
  { name: 'Ads management only', usd: 'from $300', ttd: 'from TT$2,000', hours: '5 to 8 hours a month', what: 'Campaign setup, audience and offer testing, daily checks, weekly budget tweaks, monthly report. You supply the images, videos and copy.' },
  { name: 'Ads management plus creative', usd: 'from $500', ttd: 'from TT$3,400', hours: '8 to 15 hours a month', what: 'Everything above, plus 3 to 6 new ads a month: images, video (including AI video) and copy.' },
];

export const usd = (n: number) => '$' + n.toLocaleString('en-US');
export const ttd = (n: number) => 'TT$' + n.toLocaleString('en-US');

export interface Client {
  name: string;
  logo: string;            // path under /public
  descriptor: string;
  url?: string;            // leave undefined until the site is live: the card shows "Site coming soon"
  halo?: boolean;          // logo file has a light halo baked in (dark lettering); shown slightly larger
}

/** Clients grid: first three fill the top row, last two sit centred underneath. */
export const clients: Client[] = [
  {
    name: 'Nexus Forge', logo: '/images/clients/nexus-forge.webp', url: 'https://neikoli.com', halo: true,
    descriptor: 'Where the dream took form. Years of quiet conviction — that the highest version of this work lives at the intersection of code, creativity, and freedom. Building toward a life designed entirely on its own terms.',
  },
  {
    name: 'Melt Elite Aesthetics', logo: '/images/clients/melt-aways.webp', url: 'https://meltawaysspa.com',
    descriptor: "Consultation-first body contouring in El Dorado. Clients plan treatments and book online; Krystal runs it all from her dashboard.",
  },
  {
    name: "Cathy's Clean Green Classics", logo: '/images/clients/ccgc.webp', url: 'https://cathyscleangreenclassics.com',
    descriptor: "Ordering site for fresh salads, homestyle meals and diabetic-friendly juices, with accounts for quick repeat orders.",
  },
  {
    name: "Smuggler's Paradise", logo: '/images/clients/smugglers-paradise.webp', url: 'https://smugpara.com',
    descriptor: 'Storefront and design studio for heavyweight tees: shop the drops or design your own, printed to order.',
  },
  {
    name: 'Bruffels × PTP', logo: '/images/clients/bruffles-ptp.webp', url: 'https://bruffles-apparelxptp.neikoliaugustine.workers.dev',
    descriptor: 'One-of-one menswear from Bruffels Apparel and accessories from Passport to Paradise, in one storefront. Live build in progress.',
  },
];
