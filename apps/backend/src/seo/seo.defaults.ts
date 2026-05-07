export const SEO_DEFAULTS: Array<{ key: string; value: string; group: string; label: string }> = [
  { key: 'site.name', value: 'MyApp', group: 'site', label: 'Website Name' },
  { key: 'site.tagline', value: 'The best solution', group: 'site', label: 'Site Tagline' },
  { key: 'site.url', value: 'http://localhost:3002', group: 'site', label: 'Site URL' },
  { key: 'site.language', value: 'en', group: 'site', label: 'Site Language' },
  { key: 'site.favicon', value: '', group: 'site', label: 'Favicon URL' },
  { key: 'site.logo', value: '', group: 'site', label: 'Logo URL' },

  { key: 'meta.title.template', value: '%s | MyApp', group: 'meta', label: 'Title Template' },
  {
    key: 'meta.title.default',
    value: 'MyApp — The best solution',
    group: 'meta',
    label: 'Default Title',
  },
  {
    key: 'meta.description',
    value: 'Default description',
    group: 'meta',
    label: 'Default Description',
  },
  {
    key: 'meta.keywords',
    value: 'myapp, template, fullstack',
    group: 'meta',
    label: 'Default Keywords',
  },
  { key: 'meta.robots.default', value: 'index, follow', group: 'meta', label: 'Default Robots' },
  { key: 'meta.canonical.auto', value: 'true', group: 'meta', label: 'Auto Canonical' },

  {
    key: 'og.image.default',
    value: '/images/og-default.png',
    group: 'social',
    label: 'Default OG Image',
  },
  { key: 'og.image.width', value: '1200', group: 'social', label: 'OG Width' },
  { key: 'og.image.height', value: '630', group: 'social', label: 'OG Height' },
  { key: 'og.type.default', value: 'website', group: 'social', label: 'Default OG Type' },
  { key: 'og.locale', value: 'en_US', group: 'social', label: 'OG Locale' },
  { key: 'twitter.card', value: 'summary_large_image', group: 'social', label: 'Twitter Card' },
  { key: 'twitter.site', value: '@myapp', group: 'social', label: 'Twitter Site' },
  { key: 'twitter.creator', value: '@myapp', group: 'social', label: 'Twitter Creator' },

  { key: 'robots.txt.custom', value: '', group: 'robots', label: 'Custom Robots' },
  { key: 'robots.sitemap.url', value: '/sitemap.xml', group: 'robots', label: 'Sitemap URL' },
  { key: 'robots.disallow', value: '/admin/, /api/', group: 'robots', label: 'Disallow Paths' },

  { key: 'analytics.ga4.id', value: '', group: 'analytics', label: 'GA4 ID' },
  { key: 'analytics.gtm.id', value: '', group: 'analytics', label: 'GTM ID' },
  { key: 'analytics.fb.pixel', value: '', group: 'analytics', label: 'Facebook Pixel ID' },
];
