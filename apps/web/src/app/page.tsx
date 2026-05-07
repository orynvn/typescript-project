import { redirect } from 'next/navigation';

export default function HomeRedirect(): null {
  redirect('/');
}
