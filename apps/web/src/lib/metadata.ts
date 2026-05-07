import type { Metadata } from 'next';
import { createMetadataFromSettings, getSeoSettings } from './seo';

export async function createPageMetadata(
  title: string,
  fallbackDescription: string,
): Promise<Metadata> {
  const settings = await getSeoSettings();
  const metadata = createMetadataFromSettings(settings, title);
  return {
    ...metadata,
    description: metadata.description ?? fallbackDescription,
    openGraph: {
      ...metadata.openGraph,
      description: metadata.openGraph?.description ?? fallbackDescription,
    },
    twitter: {
      ...metadata.twitter,
      description: metadata.twitter?.description ?? fallbackDescription,
    },
  };
}
