import Link from 'next/link';

export default function SettingsPage(): JSX.Element {
  return (
    <section style={{ display: 'grid', gap: 10 }}>
      <h1>Settings</h1>
      <p>Manage system-level configuration pages.</p>
      <Link href="/settings/seo">Open SEO Settings</Link>
    </section>
  );
}
