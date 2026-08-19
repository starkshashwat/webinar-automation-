'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090A0C] text-white">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-zinc-400 text-sm">Redirecting to MOYA Webinar Admin...</p>
        <p className="text-xs text-zinc-600">
          If you are not redirected automatically,{' '}
          <Link href="/admin" className="text-blue-400 hover:text-blue-300 underline">
            click here to enter
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
