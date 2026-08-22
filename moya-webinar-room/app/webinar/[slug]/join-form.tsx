'use client';

import { useState, useEffect, useRef } from 'react';
import { type Webinar, type WebinarSession } from '@/types/webinar';
import { WebinarRoom } from '@/components/webinar/webinar-room';
import { RegistrationForm } from '@/components/webinar/registration-form';
import { createClient } from '@/lib/supabase/client';
import { Clock, CheckCircle, Radio } from 'lucide-react';

export function JoinForm({ 
  webinar: initialWebinar, 
  session: initialSession,
  derivedStatus
}: { 
  webinar: Webinar;
  session: WebinarSession | null;
  derivedStatus: 'WAITING' | 'LIVE' | 'ENDED';
}) {
  const [webinar, setWebinar] = useState<Webinar>(initialWebinar);
  const [hasJoined, setHasJoined] = useState(false);
  const [attendee, setAttendee] = useState<any>(null);
  const [currentStatus, setCurrentStatus] = useState<'WAITING' | 'LIVE' | 'ENDED'>(() => {
    const dbStatus = (initialWebinar.status?.toUpperCase() || derivedStatus) as 'WAITING' | 'LIVE' | 'ENDED';
    if (dbStatus === 'LIVE' || dbStatus === 'ENDED') return dbStatus;
    return derivedStatus;
  });
  const [currentSession, setCurrentSession] = useState<WebinarSession | null>(initialSession);
  const [countdownText, setCountdownText] = useState<string>('');
  const [branding, setBranding] = useState<{ logo_url?: string | null; favicon_url?: string | null; brand_name?: string | null }>({});

  const supabase = createClient();
  const hasTriggeredCronRef = useRef(false);

  // Sync Branding & Favicon
  useEffect(() => {
    fetch('/api/settings/domain')
      .then(res => res.json())
      .then(data => {
        const logo = data.primaryDomain?.logo_url ?? data.platformSettings?.logo_url;
        const favicon = data.primaryDomain?.favicon_url ?? data.platformSettings?.favicon_url;
        const name = data.platformSettings?.brand_name ?? 'MOYA Live';
        setBranding({ logo_url: logo, favicon_url: favicon, brand_name: name });

        if (favicon) {
          let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'shortcut icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = favicon;
        }
      })
      .catch(() => {});
  }, []);

  // Check if they are already registered in this browser
  useEffect(() => {
    const id = localStorage.getItem(`moya_attendee_${webinar.id}`);
    const name = localStorage.getItem(`moya_attendee_name_${webinar.id}`);
    if (id && name) {
      setHasJoined(true);
      setAttendee({ id, display_name: name });
    }
  }, [webinar.id]);

  // Helper to calculate target start timestamp
  const getStartTime = () => {
    if (webinar.scheduled_start) {
      return new Date(webinar.scheduled_start).getTime();
    }
    return null;
  };

  // 1. Time-based automatic transition check with 1-second interval
  useEffect(() => {
    const checkTime = () => {
      // If DB marked as ENDED or status is ENDED, do not transition
      if ((webinar.status || '').toUpperCase() === 'ENDED' || (currentStatus as string) === 'ENDED') {
        setCountdownText('');
        return;
      }

      const startTime = getStartTime();
      if (!startTime) return;

      const durationMs = ((webinar.recording_duration || webinar.duration_minutes || 60) * 60 * 1000) + ((webinar.duration_seconds || 0) * 1000);
      const endTime = startTime + durationMs;
      const now = Date.now();

      if ((webinar.status || '').toUpperCase() === 'LIVE') {
        if ((currentStatus as string) !== 'LIVE') setCurrentStatus('LIVE');
        setCountdownText('');
        if (now >= endTime) {
          setCurrentStatus('ENDED');
        }
        return;
      }

      if (now >= startTime && now < endTime) {
        if ((currentStatus as string) !== 'LIVE') {
          setCurrentStatus('LIVE');
          if (!hasTriggeredCronRef.current) {
            hasTriggeredCronRef.current = true;
            
          }
        }
        setCountdownText('');
      } else if (now >= endTime) {
        setCurrentStatus('ENDED');
        setCountdownText('');
      } else {
        if ((currentStatus as string) !== 'WAITING') {
          setCurrentStatus('WAITING');
        }
        const diff = Math.max(0, Math.floor((startTime - now) / 1000));
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        setCountdownText(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [webinar.scheduled_start, webinar.daily_start_time, webinar.schedule_type, webinar.duration_minutes, webinar.recording_duration, currentStatus, webinar.status]);

  // 2. Supabase Realtime State Synchronization
  useEffect(() => {
    const channel = supabase
      .channel(`attendee-webinar-${webinar.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'webinars',
          filter: `id=eq.${webinar.id}`,
        },
        (payload) => {
          const updated = payload.new as Webinar;
          setWebinar(updated);
          const normalized = (updated.status || '').toUpperCase() as 'WAITING' | 'LIVE' | 'ENDED';
          if (normalized) {
            setCurrentStatus(normalized);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webinar_sessions',
          filter: `webinar_id=eq.${webinar.id}`,
        },
        (payload) => {
          const newSession = payload.new as WebinarSession;
          setCurrentSession(newSession);
          if (newSession.status === 'LIVE' || (newSession.status as string) === 'live') {
            setCurrentStatus('LIVE');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [webinar.id, supabase]);

  if (currentStatus === 'ENDED') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-[#090A0C]">
        <div className="w-full max-w-md bg-[#121419] border border-zinc-800 p-8 rounded-2xl shadow-2xl text-center space-y-4">
          <div className="w-16 h-16 bg-zinc-800/80 rounded-full flex items-center justify-center mx-auto mb-2 text-zinc-400">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Webinar Concluded</h1>
          <p className="text-zinc-400 text-sm">This webinar has ended. Thank you for your participation!</p>
        </div>
      </div>
    );
  }

  // If not registered yet, show registration form
  if (!hasJoined) {
    return (
      <RegistrationForm 
        webinarId={webinar.id} 
        onRegistered={(att) => {
          setAttendee(att);
          setHasJoined(true);
        }} 
      />
    );
  }

  // WAITING ROOM: strict adherence to Section 7 of prompt
  if (currentStatus === 'WAITING') {
    const formattedStartTime = webinar.scheduled_start
      ? new Date(webinar.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : (webinar.daily_start_time || 'Soon');

    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-[#090A0C] text-zinc-100">
        <div className="w-full max-w-lg bg-[#121419] border border-zinc-800 p-8 sm:p-10 rounded-3xl shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center justify-center gap-3">
            {branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={branding.logo_url} 
                alt={branding.brand_name || 'Logo'} 
                className="max-h-12 max-w-[180px] object-contain mb-1" 
              />
            ) : null}
            <div className="w-14 h-14 bg-blue-600/15 border border-blue-500/30 rounded-2xl flex items-center justify-center animate-pulse shadow-lg shadow-blue-600/20">
              <Clock className="w-7 h-7 text-blue-400" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              STARTING SOON
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{webinar.title}</h1>
            <p className="text-zinc-400 text-sm">
              Welcome, <strong className="text-white">{attendee?.display_name || 'Attendee'}</strong>! You are in the waiting room.
            </p>
          </div>

          <div className="bg-black/60 p-5 rounded-2xl border border-zinc-800/80 space-y-2">
            <p className="text-xs text-zinc-400 font-medium">The webinar will begin automatically at:</p>
            <p className="text-2xl font-bold text-white tracking-wide font-mono text-blue-400">
              {formattedStartTime}
            </p>
            {countdownText && (
              <p className="text-xs font-mono text-zinc-400">
                Starts in: <strong className="text-white font-bold">{countdownText}</strong>
              </p>
            )}
            {webinar.scheduled_start && (
              <p className="text-xs text-zinc-500">
                {new Date(webinar.scheduled_start).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            )}
          </div>

          <p className="text-xs text-zinc-500 leading-relaxed">
            Please stay on this page. The live recording and chat room will launch automatically without having to refresh.
          </p>
        </div>
      </div>
    );
  }

  // LIVE WEBINAR ROOM
  return (
    <WebinarRoom 
      webinar={{ 
        ...webinar, 
        status: currentStatus,
        video_url: webinar.recording_url || webinar.video_url
      }} 
      session={currentSession ? { 
        ...currentSession, 
        started_at: webinar.started_at || webinar.scheduled_start || currentSession.started_at 
      } : {
        id: webinar.id,
        webinar_id: webinar.id,
        started_at: webinar.started_at || webinar.scheduled_start || new Date().toISOString(),
        ended_at: null,
        status: 'LIVE',
      }} 
    />
  );
}
