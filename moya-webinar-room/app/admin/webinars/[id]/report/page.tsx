'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { WebinarAnalytics } from '@/components/admin/webinar-analytics';
import { Rocket, ArrowLeft, Filter } from 'lucide-react';
import Link from 'next/link';

export default function WebinarReportPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [webinar, setWebinar] = useState<any>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    async function loadReport() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin/login');
        return;
      }

      const { data: w } = await supabase
        .from('webinars')
        .select('*')
        .eq('id', id)
        .single();

      if (!w) {
        setLoading(false);
        return;
      }

      setWebinar(w);
      
      const { data: s } = await supabase
        .from('webinar_sessions')
        .select('*')
        .eq('webinar_id', w.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .single();
      
      setSession(s);
      setLoading(false);
    }

    loadReport();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-[#090A0C] text-zinc-100">
        <div className="flex-1 flex items-center justify-center text-zinc-500">Loading report...</div>
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="flex flex-col h-screen bg-[#090A0C] text-zinc-100">
        <div className="flex-1 flex items-center justify-center text-zinc-500">Webinar not found.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C]">
      <header className="bg-[#121419] border-b border-zinc-800 px-6 py-4 flex justify-between items-center shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">WEBINAR REPORT</h1>
            <p className="text-xs text-zinc-400 font-medium">{webinar.title}</p>
          </div>
        </div>
        <Link href={`/admin/webinars`} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          Back to Webinars
        </Link>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        <WebinarAnalytics webinar={webinar} session={session} />
      </main>
    </div>
  );
}
