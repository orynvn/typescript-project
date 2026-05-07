import type { MetadataRoute } from 'next';
import { getSeoSettings } from '@/lib/seo';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSeoSettings();
  const siteUrl =
    settings['site.url'] || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
  const disallow = (settings['robots.disallow'] || '/admin/, /api/')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow,
    },
    sitemap: `${siteUrl}${settings['robots.sitemap.url'] || '/sitemap.xml'}`,
  };
}
