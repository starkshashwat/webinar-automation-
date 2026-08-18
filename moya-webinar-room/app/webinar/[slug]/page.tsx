'use client';

import { useEffect, useState, use } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { JoinForm } from './join-form';
import { type Webinar, type WebinarSession } from '@/types/webinar';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function WebinarPage({ params }: PageProps) {
  const { slug } = use(params);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [session, setSession] = useState<WebinarSession | null>(null);
  const [derivedStatus, setDerivedStatus] = useState<'WAITING' | 'LIVE' | 'ENDED'>('WAITING');

  useEffect(() => {
    async function loadWebinar() {
      const decodedSlug = decodeURIComponent(slug);
      const supabase = createClient();

      const { data: w, error } = await supabase
        .from('webinars')
        .select('*')
        .eq('slug', decodedSlug)
        .single();

      if (error || !w) {
        setNotFoundState(true);
        setLoading(false);
        return;
      }

      setWebinar(w);

      let status = w.status as 'WAITING' | 'LIVE' | 'ENDED';
      if (w.scheduled_start) {
        const startTime = new Date(w.scheduled_start).getTime();
        const durationMs = (w.duration_minutes || 60) * 60 * 1000;
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
          .single();
        
        if (activeSession) {
          setSession(activeSession);
        }
      }

      setLoading(false);
    }

    loadWebinar();
  }, [slug]);

  if (notFoundState) {
    notFound();
  }

  if (loading || !webinar) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-zinc-500">
        Loading webinar room...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <JoinForm webinar={webinar} session={session} derivedStatus={derivedStatus} />
    </div>
  );
}
