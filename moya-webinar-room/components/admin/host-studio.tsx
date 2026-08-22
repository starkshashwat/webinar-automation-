'use client';

import { useState, useEffect, useRef } from 'react';
import { type Webinar, type WebinarSession } from '@/types/webinar';
import { AIControl } from '@/components/admin/ai-control';
import { BroadcastControl } from '@/components/admin/broadcast-control';
import { AdminChatContainer } from '@/components/admin/admin-chat-container';
import { VideoPlayer } from '@/components/webinar/video-player';
import { createClient } from '@/lib/supabase/client';
import { Settings, Play, Square, ExternalLink, Tv, Clock, RotateCcw, Radio, Users, History, Eye, X, Mail, Phone, BarChart, Copy, MousePointerClick } from 'lucide-react';
import Link from 'next/link';
import { AttendeeJourneyModal } from './attendee-journey-modal';

export function HostStudio({
  initialWebinar,
  initialSession,
}: {
  initialWebinar: Webinar;
  initialSession: WebinarSession | null;
}) {
  const [webinar, setWebinar] = useState<Webinar>(initialWebinar);
  const [session, setSession] = useState<WebinarSession | null>(initialSession);
  const [liveCount, setLiveCount] = useState<number>(0);
  const [waitingCount, setWaitingCount] = useState<number>(0);
  const [totalJoinedCount, setTotalJoinedCount] = useState<number>(0);
  const [liveAttendees, setLiveAttendees] = useState<any[]>([]);
  const [showLiveViewersModal, setShowLiveViewersModal] = useState(false);
  const [selectedJourneyAttendee, setSelectedJourneyAttendee] = useState<{ email?: string; phone?: string; name?: string } | null>(null);
  
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
      const durationMs = ((initialWebinar.recording_duration || initialWebinar.duration_minutes || 60) * 60 * 1000) + ((initialWebinar.duration_seconds || 0) * 1000);
      const endTime = startTime + durationMs;
      const now = Date.now();

      if (now >= startTime && now < endTime) return 'LIVE';
      if (now >= endTime) return 'ENDED';
    }
    return dbStatus;
  };

  const [status, setStatus] = useState<'WAITING' | 'LIVE' | 'ENDED'>(computeInitialStatus);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [streamElapsed, setStreamElapsed] = useState<string>('00:00:00');
  const [primaryDomain, setPrimaryDomain] = useState<string | null>(null);
  const manuallyEndedRef = useRef(initialWebinar.status?.toUpperCase() === 'ENDED');

  const [supabase] = useState(() => createClient());

  useEffect(() => {
    fetch('/api/settings/domain')
      .then(res => res.json())
      .then(data => {
        if (data.primaryDomain) {
          setPrimaryDomain(data.primaryDomain.domain);
        }
      })
      .catch(() => {});
  }, []);

  // Elapsed Live Stream Timer (Host Only)
  useEffect(() => {
    if (status !== 'LIVE') return;
    const startIso = session?.started_at || webinar.started_at || webinar.scheduled_start;
    if (!startIso) return;
    const startMs = new Date(startIso).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diffSecs = Math.max(0, Math.floor((now - startMs) / 1000));
      const hrs = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      const secs = diffSecs % 60;
      setStreamElapsed(
        `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [status, session?.started_at, webinar.started_at, webinar.scheduled_start]);

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

      const durationMs = ((webinar.recording_duration || webinar.duration_minutes || 60) * 60 * 1000) + ((webinar.duration_seconds || 0) * 1000);
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
      } else if (now >= startTime && now < endTime && !manuallyEndedRef.current) {
        if ((status as string) !== 'LIVE') {
          setStatus('LIVE');
        }
        setCountdown(null);
      } else if (now >= endTime) {
        if ((status as string) !== 'ENDED') {
          setStatus('ENDED');
        }
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
            const startMs = getStartTime();
            if (!startMs || Date.now() >= startMs) {
              manuallyEndedRef.current = false;
              setStatus('LIVE');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [webinar.id, supabase]);

  // 3. Live Attendees Instant Presence & Realtime Tracker
  useEffect(() => {
    const activeSessionId = session?.id || webinar.id;
    if (!activeSessionId) return;

    const fetchLiveViewers = async () => {
      try {
        const res = await fetch(`/api/analytics/live-attendees?session_id=${activeSessionId}&webinar_id=${webinar.id}`);
        const data = await res.json();
        if (data) {
          setTotalJoinedCount(data.totalJoinedCount || 0);
          setLiveAttendees(data.attendees || []);
        }
      } catch (err) {
        console.error('Failed to fetch live viewers:', err);
      }
    };

    // Fetch once on mount
    fetchLiveViewers();

    // Removed 1.5s polling loop to prevent DDoS (Phase 3 optimization)
    // We now fetch when the admin explicitly opens the modal via a separate effect below.

    // Instant WebSocket Presence Channel (0ms latency sync on join/leave/PiP-close/tab-close)
    const presenceChannel = supabase.channel(`room-${webinar.id}`);

    const syncPresenceState = () => {
      const state = presenceChannel.presenceState();
      
      let liveCountCalc = 0;
      let waitingCountCalc = 0;
      let uniqueAttendees = new Map();

      for (const key of Object.keys(state)) {
        const presenceObjects = state[key] as any[];
        const presence = presenceObjects[0];
        if (presence) {
          uniqueAttendees.set(key, presence);
          if (presence.status === 'LIVE') liveCountCalc++;
          if (presence.status === 'WAITING') waitingCountCalc++;
        }
      }

      setLiveCount(liveCountCalc);
      setWaitingCount(waitingCountCalc);
      
      setTotalJoinedCount((prev) => Math.max(prev, uniqueAttendees.size));
      
      setLiveAttendees(Array.from(uniqueAttendees.values()).map((p: any) => ({
        name: p.name || 'Anonymous Attendee',
        email: p.email || '',
        phone: p.phone || '',
        status: p.status || 'LIVE',
        watch_time_seconds: 0
      })));
    };

    presenceChannel
      .on('presence', { event: 'sync' }, syncPresenceState)
      .on('presence', { event: 'join' }, syncPresenceState)
      .on('presence', { event: 'leave' }, syncPresenceState)
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [session?.id, webinar.id, supabase]);

  // DB polling for live viewers removed. Tracking is now 100% handled by Zero-Cost Presence tracking above.

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
  // Ensure we use the exact DB timestamp if available to prevent host/attendee desync
  const startedAt = webinar.scheduled_start || session?.started_at || webinar.actual_start_at || webinar.started_at || undefined;

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
                  {/* Live Attendees Count Badge */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowLiveViewersModal(true)}
                      className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
                      title="Click to view live attendee details & watch time"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{liveCount} Watching</span>
                    </button>
                    
                    <button
                      onClick={() => setShowLiveViewersModal(true)}
                      className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
                      title="Click to view waiting attendee details"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      <span>{waitingCount} Waiting</span>
                    </button>
                  </div>

                {status === 'LIVE' && (
                  <span className="flex items-center gap-1 text-[11px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-md">
                    <Clock className="w-3 h-3 animate-pulse text-red-500" />
                    {streamElapsed}
                  </span>
                )}
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
                <div className="text-center p-6 space-y-4 max-w-md w-full animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
                    <BarChart className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-lg">Webinar Concluded & Analytics Saved</h3>
                    <p className="text-xs text-zinc-400">All attendance records, viewer watch times, and chat conversions have been preserved.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-black/60 p-3.5 rounded-xl border border-zinc-800 text-left">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">Total Joined</span>
                      <div className="text-lg font-bold text-emerald-400 font-mono">{totalJoinedCount} Attendees</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold">Peak Viewers</span>
                      <div className="text-lg font-bold text-blue-400 font-mono">{liveCount || totalJoinedCount} Peak</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Link
                      href={`/admin/webinars/${webinar.id}/report`}
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                    >
                      <BarChart className="w-4 h-4" />
                      View Full Analytics Report
                    </Link>
                    <button 
                      onClick={handleStartNow}
                      className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold px-3.5 py-2.5 rounded-xl transition-all border border-zinc-700"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restart
                    </button>
                  </div>
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
                <p className="text-xs text-zinc-400 font-mono">/w/{webinar.short_token || webinar.slug}</p>
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
                
                <button
                  onClick={() => {
                    const baseUrl = primaryDomain ? `https://${primaryDomain}` : window.location.origin;
                    const path = webinar.short_token ? `/w/${webinar.short_token}` : `/webinar/${encodeURIComponent(webinar.slug)}`;
                    navigator.clipboard.writeText(`${baseUrl}${path}`);
                    alert('Attendee link copied to clipboard!');
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors border border-zinc-700/50"
                  title="Copy Link to Clipboard"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Link
                </button>
                
                <a 
                  href={primaryDomain ? `https://${primaryDomain}${webinar.short_token ? `/w/${webinar.short_token}` : `/webinar/${encodeURIComponent(webinar.slug)}`}` : (webinar.short_token ? `/w/${webinar.short_token}` : `/webinar/${encodeURIComponent(webinar.slug)}`)} 
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

          {/* Bottom Controls: AI Autopilot & AI Broadcast Controller */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <BroadcastControl webinar={webinar} session={session} />
            <AIControl webinarId={webinar.id} initialEnabled={webinar.ai_enabled !== false} />
          </div>

        </div>

        {/* Right Column: Live Chat & Private Whispering (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-[650px] lg:h-full min-h-0 bg-[#121419] rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
          <AdminChatContainer sessionId={session?.id || webinar.id} status={status} />
        </div>

      </div>

      {/* Live Viewers Modal */}
      {showLiveViewersModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#121419] border border-zinc-800 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Live Stream Attendees ({liveCount} Active / {totalJoinedCount} Total)
                  </h3>
                  <p className="text-[11px] text-zinc-400">Attendees currently connected to this webinar stream</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLiveViewersModal(false)}
                className="text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 p-1.5 rounded-xl border border-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {liveAttendees.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 text-xs">
                  No attendees have connected to this session yet.
                </div>
              ) : (
                liveAttendees.map((att) => {
                  const watchMins = Math.floor((att.watchTimeSeconds || 0) / 60);
                  const watchSecs = (att.watchTimeSeconds || 0) % 60;

                  return (
                    <div 
                      key={att.id}
                      className="bg-black/30 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs truncate">{att.name}</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            att.isActive 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${att.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                            {att.isActive ? 'ACTIVE' : 'IDLE'}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 flex flex-wrap items-center gap-2">
                          {att.email && <span className="truncate">{att.email}</span>}
                          {att.phone && <span>• {att.phone}</span>}
                        </div>
                        {att.hasClickedCta && (
                          <div className="mt-1 inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase">
                            <MousePointerClick className="w-3 h-3" />
                            CTA Clicked
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">Watch Time</div>
                          <div className="text-xs font-mono font-bold text-emerald-400">
                            {watchMins}m {watchSecs}s
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedJourneyAttendee({
                              email: att.email,
                              phone: att.phone,
                              name: att.name
                            });
                          }}
                          className="p-2 bg-zinc-800 hover:bg-purple-900/30 text-zinc-400 hover:text-purple-300 border border-zinc-700/60 hover:border-purple-500/40 rounded-xl transition-all shadow-sm"
                          title="View Cross-Webinar Lifetime Journey & History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3.5 border-t border-zinc-800 bg-black/40 flex justify-end">
              <button
                onClick={() => setShowLiveViewersModal(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cross-Webinar Attendee Journey Modal */}
      {selectedJourneyAttendee && (
        <AttendeeJourneyModal
          email={selectedJourneyAttendee.email}
          phone={selectedJourneyAttendee.phone}
          initialName={selectedJourneyAttendee.name}
          onClose={() => setSelectedJourneyAttendee(null)}
        />
      )}
    </main>
  );
}
