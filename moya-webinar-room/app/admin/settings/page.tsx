'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { WebinarSettings } from '@/components/settings/webinar-settings';
import { KnowledgeBase } from '@/components/settings/knowledge-base';
import { AdminHeader } from '@/components/admin/admin-header';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [webinar, setWebinar] = useState<any>(null);

  useEffect(() => {
    async function loadSettings() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin/login');
        return;
      }

      const { data } = await supabase
        .from('webinars')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setWebinar(data);
      setLoading(false);
    }

    loadSettings();
  }, [router]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C] text-zinc-100">
      <AdminHeader />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">General Settings</h2>
            <p className="text-zinc-400 text-sm">Configure default webinar parameters and automated CTA drops</p>
          </div>

          {loading ? (
            <div className="text-zinc-500 py-12 text-center">Loading settings...</div>
          ) : (
            <>
              <WebinarSettings initialData={webinar} />
              {webinar && <KnowledgeBase webinarId={webinar.id} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
