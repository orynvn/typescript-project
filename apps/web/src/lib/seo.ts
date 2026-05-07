import type { Metadata } from 'next';

export type SeoSettings = Record<string, string>;

export async function getSeoSettings(): Promise<SeoSettings> {
  const endpoint = process.env.SEO_SETTINGS_ENDPOINT || 'http://localhost:3000/api/seo/settings';

  try {
    const response = await fetch(endpoint, { next: { revalidate: 3600 } });
    if (!response.ok) {
      return {};
    }
    const payload = (await response.json()) as { data?: SeoSettings } | SeoSettings;
    return 'data' in payload && payload.data ? payload.data : (payload as SeoSettings);
  } catch {
    return {};
  }
}

export function createMetadataFromSettings(settings: SeoSettings, pageTitle?: string): Metadata {
  const siteName = settings['site.name'] || process.env.NEXT_PUBLIC_APP_NAME || 'MyApp';
  const siteUrl =
    settings['site.url'] || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
  const titleTemplate = settings['meta.title.template'] || `%s | ${siteName}`;
  const title = pageTitle
    ? titleTemplate.replace('%s', pageTitle)
    : settings['meta.title.default'] || siteName;
  const description = settings['meta.description'] || 'Default app description';

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    keywords: settings['meta.keywords']
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    robots: {
      index: !(settings['meta.robots.default'] || '').includes('noindex'),
      follow: !(settings['meta.robots.default'] || '').includes('nofollow'),
    },
    openGraph: {
      type: (settings['og.type.default'] as 'website' | 'article') || 'website',
      locale: settings['og.locale'] || 'en_US',
      siteName,
      title,
      description,
      images: [
        {
          url: settings['og.image.default'] || '/images/og-default.png',
          width: Number(settings['og.image.width'] || 1200),
          height: Number(settings['og.image.height'] || 630),
        },
      ],
    },
    twitter: {
      card:
        (settings['twitter.card'] as 'summary' | 'summary_large_image') || 'summary_large_image',
      site: settings['twitter.site'] || undefined,
      creator: settings['twitter.creator'] || undefined,
      title,
      description,
    },
  };
}
