import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { classifyHostname } from '@/lib/domains';

export default async function Home() {
  const headersList = await headers();
  let hostname = headersList.get('host') || '';
  hostname = hostname.split(':')[0].toLowerCase();

  const domainType = await classifyHostname(hostname);

  // If on admin or default Vercel domain, go to dashboard
  if (domainType === 'ADMIN' || domainType === 'DEFAULT') {
    redirect('/admin');
  }

  // For ATTENDEE or CUSTOM domains (if they visit the root URL instead of a direct webinar link)
  return (
    <div className="min-h-screen bg-[#0E0F12] flex items-center justify-center text-zinc-500 font-medium text-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <span>Please use your specific webinar invitation link to join.</span>
      </div>
    </div>
  );
}
