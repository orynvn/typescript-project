import type { Metadata } from 'next';
import { ConfirmProvider } from '@/providers/confirm-provider';
import { createMetadataFromSettings, getSeoSettings } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSeoSettings();
  return createMetadataFromSettings(settings);
}

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: process.env.NEXT_PUBLIC_APP_NAME || 'MyApp',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002',
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <ConfirmProvider>{children}</ConfirmProvider>
      </body>
    </html>
  );
}
