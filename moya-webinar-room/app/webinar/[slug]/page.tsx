import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { WebinarRoom } from '@/components/webinar/webinar-room';
import { type Webinar, type WebinarSession } from '@/types/webinar';
import { JoinForm } from './join-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function WebinarPage({ params }: PageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const supabase = await createClient();

  // 1. Fetch webinar by slug
  const { data: webinar, error } = await supabase
    .from('webinars')
    .select('*')
    .eq('slug', decodedSlug)
    .single();

  if (error || !webinar) {
    notFound();
  }

  // 2. Compute derived status based on scheduled_start
  let derivedStatus = webinar.status;
  if (webinar.scheduled_start) {
    const startTime = new Date(webinar.scheduled_start).getTime();
    const durationMs = (webinar.duration_minutes || 60) * 60 * 1000;
    const endTime = startTime + durationMs;
    const now = Date.now();

    if (now < startTime) {
      derivedStatus = 'WAITING';
    } else if (now >= startTime && now < endTime) {
      derivedStatus = 'LIVE';
    } else {
      derivedStatus = 'ENDED';
    }
  }

  // 3. Fetch active session if LIVE
  let session: WebinarSession | null = null;
  if (derivedStatus === 'LIVE') {
    const { data: activeSession } = await supabase
      .from('webinar_sessions')
      .select('*')
      .eq('webinar_id', webinar.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();
    
    if (activeSession) {
      session = activeSession;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <JoinForm webinar={webinar} session={session} derivedStatus={derivedStatus} />
    </div>
  );
}
