import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/admin-header';
import { WebinarList } from '@/components/admin/webinar-list';
import { checkAndStartScheduledWebinars } from '@/lib/scheduler/webinar-scheduler';

export const dynamic = 'force-dynamic';

export default async function WebinarsListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  // Trigger check to automatically transition any live/scheduled webinars whose duration has ended
  try {
    await checkAndStartScheduledWebinars();
  } catch (err) {
    console.error('[WebinarsListPage] Error running scheduler check:', err);
  }

  const { data: webinars } = await supabase
    .from('webinars')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C] text-zinc-100">
      <AdminHeader />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">All Webinars</h2>
              <p className="text-zinc-400 text-sm">Schedule and manage one-time and daily recurring webinars</p>
            </div>
            <Link
              href="/admin/webinars/create"
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:scale-102 text-sm"
            >
              <Plus className="w-4 h-4" />
              Create Webinar
            </Link>
          </div>

          <WebinarList initialWebinars={webinars || []} />
        </div>
      </main>
    </div>
  );
}
