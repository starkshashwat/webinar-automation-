import { redirect } from 'next/navigation';

export default function Home() {
  // Simple redirect to admin page for the root
  redirect('/admin');
}
