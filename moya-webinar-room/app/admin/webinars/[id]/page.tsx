export const runtime = 'edge';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminHeader } from '@/components/admin/admin-header';
import { HostStudio } from '@/components/admin/host-studio';
import { WebinarAnalytics } from '@/components/admin/webinar-analytics';
import { checkAndStartScheduledWebinars } from '@/lib/scheduler/webinar-scheduler';
import { Rocket } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  try {
    await checkAndStartScheduledWebinars();
  } catch (err) {
    console.error('[AdminDashboard] Error checking scheduler:', err);
  }

  const { data: webinar } = await supabase
    .from('webinars')
    .select('*')
    .eq('id', id)
    .single();

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

  const { data: session } = await supabase
    .from('webinar_sessions')
    .select('*')
    .eq('webinar_id', webinar.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  // Manual campaigns feature was removed

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
