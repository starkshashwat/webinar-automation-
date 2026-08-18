import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WebinarSettings } from '@/components/settings/webinar-settings';
import { KnowledgeBase } from '@/components/settings/knowledge-base';
import { AdminHeader } from '@/components/admin/admin-header';

export const dynamic = 'force-dynamic';

export default async function WebinarSpecificSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: webinar } = await supabase
    .from('webinars')
    .select('*')
    .eq('id', id)
    .single();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C] text-zinc-100">
      <AdminHeader />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Webinar Settings</h2>
            <p className="text-zinc-400 text-sm">Configure parameters for {webinar?.title || 'this webinar'}</p>
          </div>

          <WebinarSettings initialData={webinar} />
          
          {webinar && (
            <>
              <KnowledgeBase webinarId={webinar.id} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
