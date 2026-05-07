import type { MetadataRoute } from 'next';
import { getSeoSettings } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSeoSettings();
  const baseUrl =
    settings['site.url'] || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
  const routes = ['/', '/about', '/dashboard', '/profile', '/settings'];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '/' ? 'daily' : 'weekly',
    priority: route === '/' ? 1 : 0.7,
  }));
}
