import Link from 'next/link';

export default function UserDetailPage({ params }: { params: { id: string } }): JSX.Element {
  return (
    <section>
      <h1>User Detail</h1>
      <p>User ID: {params.id}</p>
      <Link href="/users">Back to users</Link>
    </section>
  );
}
