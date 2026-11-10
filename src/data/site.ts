// Content that several sections share. Edit here, not in the components.

export const work = [
  { slug: 'cathys', name: "Cathy's Clean Green Classics", kind: 'Website', status: 'live' },
  { slug: 'melt-aways', name: 'Melt Aways', kind: 'Salon website + dashboard app', status: 'live' },
  { slug: 'smugglers-builder', name: "Smuggler's Paradise custom builder", kind: 'Own build', status: 'live' },
  { slug: 'brussels', name: 'Brussels Apparel', kind: 'Website', status: 'in-progress' },
] as const;

export const packages = [
  { name: 'Basic', price: 4500, blurb: '3 to 5 custom pages, launch, SEO setup, 2 revision rounds.' },
  { name: 'Intermediate', price: 10000, blurb: 'Everything in Basic, 1 to 2 custom features, client dashboard, email confirmations.' },
  { name: 'Premium', price: 15000, blurb: 'The works: 7 to ~24 pages, online payments, logins and roles, full business dashboard.' },
] as const;

export const carePlans = [
  { name: 'Essential', ttd: 200, blurb: 'Hosting, backups, security, uptime monitoring.' },
  { name: 'Basic', ttd: 650, blurb: 'Essential + basic monthly SEO + 1 hour of edits.' },
  { name: 'Growth', ttd: 1500, blurb: 'Basic + 3 hours of edits, monthly report, review management.' },
  { name: 'Premium', ttd: 3000, blurb: 'Growth + 5 hours of edits, priority support, email marketing, strategy call.' },
] as const;

export const usd = (n: number) => '$' + n.toLocaleString('en-US');
export const ttd = (n: number) => 'TT$' + n.toLocaleString('en-US');
