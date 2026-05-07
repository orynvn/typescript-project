import type { Metadata } from 'next';
import { ConfirmProvider } from '@/providers/confirm-provider';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'),
  title: {
    default: process.env.NEXT_PUBLIC_APP_NAME || 'MyApp',
    template: `%s | ${process.env.NEXT_PUBLIC_APP_NAME || 'MyApp'}`,
  },
  description: 'Default app description',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: process.env.NEXT_PUBLIC_APP_NAME || 'MyApp',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>
        <ConfirmProvider>{children}</ConfirmProvider>
      </body>
    </html>
  );
}
