import Link from 'next/link';
import { AppImage } from '@/components/common/app-image';

export default function UserDetailPage({ params }: { params: { id: string } }): JSX.Element {
  return (
    <section>
      <h1>User Detail</h1>
      <p>User ID: {params.id}</p>
      <AppImage src="https://picsum.photos/120" alt="User avatar" width={80} height={80} />
      <Link href="/users">Back to users</Link>
    </section>
  );
}
