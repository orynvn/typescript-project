import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <header style={{ padding: 16, borderBottom: '1px solid #ddd', display: 'flex', gap: 12 }}>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/profile">Profile</Link>
        <Link href="/settings">Settings</Link>
      </header>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
