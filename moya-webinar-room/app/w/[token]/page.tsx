'use client';

import { useEffect, useState, use } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { JoinForm } from '@/app/webinar/[slug]/join-form';
import { type Webinar, type WebinarSession } from '@/types/webinar';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function MaskedWebinarPage({ params }: PageProps) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [session, setSession] = useState<WebinarSession | null>(null);
  const [derivedStatus, setDerivedStatus] = useState<'WAITING' | 'LIVE' | 'ENDED'>('WAITING');

  useEffect(() => {
    async function loadWebinar() {
      const decodedToken = decodeURIComponent(token).trim();
      const supabase = createClient();

      // 1. Try finding by short_token first, fallback to slug
      let { data: w } = await supabase
        .from('webinars')
        .select('*')
        .eq('short_token', decodedToken)
        .maybeSingle();

      if (!w) {
        const { data: fallbackWebinar } = await supabase
          .from('webinars')
          .select('*')
          .eq('slug', decodedToken)
          .maybeSingle();
        w = fallbackWebinar;
      }

      if (!w) {
        setNotFoundState(true);
        setLoading(false);
        return;
      }

      setWebinar(w);

      let status = w.status as 'WAITING' | 'LIVE' | 'ENDED';
      if (w.scheduled_start) {
        const startTime = new Date(w.scheduled_start).getTime();
        const durationMs = ((w.duration_minutes || 60) * 60 * 1000) + ((w.duration_seconds || 0) * 1000);
        const endTime = startTime + durationMs;
        const now = Date.now();

        if (now < startTime) {
          status = 'WAITING';
        } else if (now >= startTime && now < endTime) {
          status = 'LIVE';
        } else {
          status = 'ENDED';
        }
      }
      setDerivedStatus(status);

      if (status === 'LIVE') {
        const { data: activeSession } = await supabase
          .from('webinar_sessions')
          .select('*')
          .eq('webinar_id', w.id)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (activeSession) {
          setSession(activeSession);
        }
      }

      setLoading(false);
    }

    loadWebinar();
  }, [token]);

  if (notFoundState) {
    notFound();
  }

  if (loading || !webinar) {
    return (
      <div className="min-h-screen bg-[#0E0F12] flex items-center justify-center text-zinc-500 font-medium text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <span>Entering secure webinar room...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <JoinForm webinar={webinar} session={session} derivedStatus={derivedStatus} />
    </div>
  );
}
