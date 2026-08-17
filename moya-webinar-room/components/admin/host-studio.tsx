'use client';

import { useState, useEffect, useRef } from 'react';
import { type Webinar, type WebinarSession } from '@/types/webinar';
import { AIControl } from '@/components/admin/ai-control';
import { CampaignControl } from '@/components/admin/campaign-control';
import { AdminChatContainer } from '@/components/admin/admin-chat-container';
import { VideoPlayer } from '@/components/webinar/video-player';
import { createClient } from '@/lib/supabase/client';
import { Settings, Play, Square, ExternalLink, Tv, Clock, RotateCcw, Radio } from 'lucide-react';
import Link from 'next/link';

export function HostStudio({
  initialWebinar,
  initialSession,
  initialCampaign
}: {
  initialWebinar: Webinar;
  initialSession: WebinarSession | null;
  initialCampaign: any;
}) {
  const [webinar, setWebinar] = useState<Webinar>(initialWebinar);
  const [session, setSession] = useState<WebinarSession | null>(initialSession);
  
  // Helper to calculate target start timestamp
  const getStartTime = () => {
    if (webinar.scheduled_start) {
      return new Date(webinar.scheduled_start).getTime();
    }
    return null;
  };

  const computeInitialStatus = (): 'WAITING' | 'LIVE' | 'ENDED' => {
    const dbStatus = (initialWebinar.status?.toUpperCase() || 'WAITING') as 'WAITING' | 'LIVE' | 'ENDED';
    if (dbStatus === 'ENDED' || dbStatus === 'LIVE') return dbStatus;

    const startTime = initialWebinar.scheduled_start ? new Date(initialWebinar.scheduled_start).getTime() : null;
    if (startTime) {
      const durationMs = (initialWebinar.recording_duration || initialWebinar.duration_minutes || 60) * 60 * 1000;
      const endTime = startTime + durationMs;
      const now = Date.now();

      if (now >= startTime && now < endTime) return 'LIVE';
      if (now >= endTime) return 'ENDED';
    }
    return dbStatus;
  };

  const [status, setStatus] = useState<'WAITING' | 'LIVE' | 'ENDED'>(computeInitialStatus);
  const [countdown, setCountdown] = useState<string | null>(null);
  const manuallyEndedRef = useRef(initialWebinar.status?.toUpperCase() === 'ENDED');

  const supabase = createClient();

  // 1. Client-side Realtime 1-Second Time Sync & Auto-Start
  useEffect(() => {
    const checkSchedule = () => {
      // If host manually ended or webinar is marked ENDED, do not auto-start
      if (manuallyEndedRef.current || (status as string) === 'ENDED' || webinar.status?.toUpperCase() === 'ENDED') {
        setCountdown(null);
        return;
      }

      const startTime = getStartTime();
      if (!startTime) return;

      const durationMs = (webinar.recording_duration || webinar.duration_minutes || 60) * 60 * 1000;
      const endTime = startTime + durationMs;
      const now = Date.now();

      if (webinar.status?.toUpperCase() === 'LIVE') {
        if ((status as string) !== 'LIVE') setStatus('LIVE');
        setCountdown(null);
        if (now >= endTime) {
          setStatus('ENDED');
        }
        return;
      }

      if (now < startTime) {
        if ((status as string) !== 'WAITING') {
          setStatus('WAITING');
        }
        const diff = Math.max(0, Math.floor((startTime - now) / 1000));
        const hours = Math.floor(diff / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        const secs = diff % 60;
        if (hours > 0) {
          setCountdown(`${hours}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`);
        } else {
          setCountdown(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        }
      } else if (now >= startTime && now < endTime) {
        if ((status as string) !== 'LIVE') {
          setStatus('LIVE');
          fetch('/api/cron/webinar-scheduler', { method: 'POST' }).catch(() => {});
        }
        setCountdown(null);
      } else if (now >= endTime) {
        setStatus('ENDED');
        setCountdown(null);
      }
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 1000);
    return () => clearInterval(interval);
  }, [webinar.scheduled_start, webinar.daily_start_time, webinar.schedule_type, webinar.duration_minutes, webinar.recording_duration, status, webinar.status]);

  // 2. Supabase Realtime Listener for Host Studio
  useEffect(() => {
    const channel = supabase
      .channel(`host-studio-${webinar.id}`)
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
            if (normalized === 'ENDED') {
              manuallyEndedRef.current = true;
            } else if (normalized === 'LIVE') {
              manuallyEndedRef.current = false;
            }
            setStatus(normalized);
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
          setSession(newSession);
          if (newSession.status === 'LIVE' || (newSession.status as string) === 'live') {
            manuallyEndedRef.current = false;
            setStatus('LIVE');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [webinar.id, supabase]);

  const handleStartNow = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    manuallyEndedRef.current = false;
    setStatus('LIVE');
    try {
      const res = await fetch(`/api/webinars/${webinar.id}/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        console.error('Failed to start stream:', data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndNow = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    manuallyEndedRef.current = true;
    setStatus('ENDED');
    try {
      const res = await fetch(`/api/webinars/${webinar.id}/end`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        console.error('Failed to end stream:', data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const videoUrl = webinar.recording_url || webinar.video_url;
  const startedAt = session?.started_at || webinar.started_at || (status === 'LIVE' ? (webinar.scheduled_start || new Date().toISOString()) : undefined);

  return (
    <main className="flex-1 p-4 lg:p-5 min-h-0 flex flex-col overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
        
        {/* Left Column: Synchronized Video Stream + Webinar Controls (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-5 min-h-0">
          
          {/* Live Video Monitor */}
          <div className="bg-[#121419] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-xs uppercase tracking-wider text-zinc-200">
                  Host Live Stream Monitor
                </span>
              </div>
              <div className="flex items-center gap-2">
                {countdown && status === 'WAITING' && (
                  <span className="flex items-center gap-1 text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md">
                    <Clock className="w-3 h-3 animate-pulse" />
                    Starts in {countdown}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  status === 'LIVE' 
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                    : status === 'ENDED'
                    ? 'bg-zinc-800 text-zinc-400'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {status === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                  {status === 'WAITING' && <Radio className="w-3 h-3 animate-pulse text-blue-400" />}
                  {status === 'LIVE' ? 'STREAM LIVE' : status === 'WAITING' ? 'WAITING ROOM' : 'ENDED'}
                </span>
              </div>
            </div>

            {/* Video Player Frame */}
            <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
              {status === 'WAITING' ? (
                <div className="text-center p-8 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400 animate-pulse shadow-lg shadow-blue-600/20">
                    <Clock className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">Webinar Scheduled</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Stream is in waiting room mode and will automatically start for everyone at:
                    </p>
                    <p className="text-xl font-bold font-mono text-blue-400 mt-1">
                      {webinar.scheduled_start ? new Date(webinar.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (webinar.daily_start_time || 'Scheduled Time')}
                    </p>
                    {countdown && (
                      <p className="text-xs font-mono text-zinc-500 mt-1">
                        Auto-start countdown: <strong className="text-zinc-200">{countdown}</strong>
                      </p>
                    )}
                  </div>
                </div>
              ) : status === 'ENDED' ? (
                <div className="text-center p-8 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                    <Square className="w-5 h-5 fill-current" />
                  </div>
                  <p className="font-semibold text-zinc-200 text-base">Broadcast Concluded</p>
                  <p className="text-xs text-zinc-500 max-w-sm">The stream has ended for all attendees.</p>
                  <button 
                    onClick={handleStartNow}
                    className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restart Stream
                  </button>
                </div>
              ) : videoUrl ? (
                <VideoPlayer 
                  url={videoUrl}
                  sessionId={session?.id || webinar.id}
                  status={status}
                  isMuted={true}
                  startedAt={startedAt}
                />
              ) : (
                <div className="text-center p-6 text-zinc-500 text-sm space-y-1">
                  <p className="font-medium text-zinc-400">No recording URL configured</p>
                  <p className="text-xs">Add a video URL in Webinar Settings to preview here.</p>
                </div>
              )}
            </div>

            {/* Action Toolbar below Video */}
            <div className="p-4 bg-[#121419] flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80">
              <div className="space-y-0.5">
                <h2 className="font-bold text-sm text-white">{webinar.title}</h2>
                <p className="text-xs text-zinc-400 font-mono">/webinar/{webinar.slug}</p>
              </div>

              <div className="flex items-center gap-2">
                {status === 'WAITING' && (
                  <button 
                    onClick={handleStartNow}
                    className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-green-600/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    START STREAM EARLY
                  </button>
                )}
                {status === 'LIVE' && (
                  <button 
                    onClick={handleEndNow}
                    className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-red-600/20"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    END STREAM NOW
                  </button>
                )}
                {status === 'ENDED' && (
                  <button 
                    onClick={handleStartNow}
                    className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-green-600/20"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    RESTART STREAM
                  </button>
                )}
                <a 
                  href={`/webinar/${encodeURIComponent(webinar.slug)}`} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors border border-zinc-700/50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Attendee Room
                </a>
                <Link
                  href={`/admin/webinars/${webinar.id}/edit`}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors border border-zinc-700/50"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Settings
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Controls: AI & CTA Campaigns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <AIControl webinarId={webinar.id} initialEnabled={webinar.ai_enabled !== false} />
            <CampaignControl campaign={initialCampaign} />
          </div>

        </div>

        {/* Right Column: Live Chat & Private Whispering (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-[650px] lg:h-full min-h-0 bg-[#121419] rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
          <AdminChatContainer sessionId={session?.id || webinar.id} status={status} />
        </div>

      </div>
    </main>
  );
}
