import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <>
      <header style={{ padding: 16, borderBottom: '1px solid #ddd' }}>
        <Link href="/">MyApp</Link>
      </header>
      {children}
      <footer style={{ padding: 16, borderTop: '1px solid #ddd' }}>© MyApp</footer>
    </>
  );
}
