import Link from 'next/link';

export default function LandingPage(): JSX.Element {
  return (
    <main style={{ padding: 24 }}>
      <section id="hero">
        <h1>Your Awesome Product</h1>
        <p>The best solution for your needs.</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/register">Get Started Free</Link>
          <Link href="#features">Learn More</Link>
        </div>
      </section>

      <section id="features" style={{ marginTop: 24 }}>
        <h2>Features</h2>
        <ul>
          <li>Fast setup</li>
          <li>Production ready</li>
          <li>Extensible architecture</li>
        </ul>
      </section>
    </main>
  );
}
