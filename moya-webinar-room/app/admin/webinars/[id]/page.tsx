'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader } from '@/components/admin/admin-header';
import { HostStudio } from '@/components/admin/host-studio';
import { WebinarAnalytics } from '@/components/admin/webinar-analytics';
import { Rocket } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [webinar, setWebinar] = useState<any>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    async function loadWebinar() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin/login');
        return;
      }

      fetch('/api/cron/webinar-scheduler').catch((err) => console.error('Scheduler check error:', err));

      const { data: w } = await supabase
        .from('webinars')
        .select('*')
        .eq('id', id)
        .single();

      if (w) {
        setWebinar(w);
        const { data: s } = await supabase
          .from('webinar_sessions')
          .select('*')
          .eq('webinar_id', w.id)
          .order('started_at', { ascending: false })
          .limit(1)
          .single();
        setSession(s);
      }
      setLoading(false);
    }

    loadWebinar();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-[#090A0C] text-zinc-100">
        <AdminHeader />
        <div className="flex-1 flex items-center justify-center text-zinc-500">Loading webinar host room...</div>
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="flex flex-col h-screen bg-[#090A0C] text-zinc-100">
        <AdminHeader />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-[#121419] border border-zinc-800 p-8 rounded-2xl text-center max-w-md">
            <Rocket className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-4">Webinar Not Found</h1>
            <p className="text-zinc-400 mb-6">The requested webinar could not be located.</p>
            <Link href="/admin/webinars" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-medium transition-colors">
              Back to Webinars
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C] text-zinc-100">
      <AdminHeader />
      {webinar.status === 'ENDED' ? (
        <WebinarAnalytics webinar={webinar} session={session} />
      ) : (
        <HostStudio 
          initialWebinar={webinar}
          initialSession={session}
        />
      )}
    </div>
  );
}
