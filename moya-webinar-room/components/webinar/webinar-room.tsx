'use client';

import { useState, useEffect } from 'react';
import { VideoPlayer } from './video-player';
import { ChatPanel } from '@/components/chat/chat-panel';
import { FlashBanner } from './flash-banner';
import { type Webinar, type WebinarSession } from '@/types/webinar';
import { type ChatMessage } from '@/types/chat';
import { MessageSquare, Maximize, Volume2, VolumeX } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function WebinarRoom({ 
  webinar, 
  session 
}: { 
  webinar: Webinar;
  session: WebinarSession | null;
}) {
  const [showChat, setShowChat] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);
  const [activeBanner, setActiveBanner] = useState<ChatMessage | null>(null);
  const [branding, setBranding] = useState<{ logo_url?: string | null; favicon_url?: string | null; brand_name?: string | null }>({
    brand_name: 'MOYA'
  });
  const supabase = createClient();

  useEffect(() => {
    fetch('/api/settings/domain')
      .then(res => res.json())
      .then(data => {
        const logo = data.primaryDomain?.logo_url || data.platformSettings?.logo_url;
        const favicon = data.primaryDomain?.favicon_url || data.platformSettings?.favicon_url;
        const name = data.platformSettings?.brand_name || 'MOYA';
        setBranding({ logo_url: logo, favicon_url: favicon, brand_name: name });

        // Update document favicon dynamically
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

  const normalizedStatus: 'WAITING' | 'LIVE' | 'ENDED' = 
    (webinar.status?.toUpperCase() === 'LIVE' || webinar.status === 'live') ? 'LIVE' :
    (webinar.status?.toUpperCase() === 'ENDED' || webinar.status === 'ended') ? 'ENDED' : 'WAITING';
  
  // Analytics Join Effect & Session ID Cache
  useEffect(() => {
    if (!session?.id) return;
    const regId = localStorage.getItem(`moya_attendee_${webinar.id}`);
    if (!regId) return;

    // Fast-recover cached attendanceSessionId from localStorage
    const cachedAttId = localStorage.getItem(`moya_attendance_session_${webinar.id}`);
    if (cachedAttId) {
      setAttendanceSessionId(cachedAttId);
    }

    fetch('/api/analytics/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        registration_id: regId, 
        session_id: session.id,
        webinar_id: webinar.id 
      })
    })
    .then(r => r.json())
    .then(data => {
      if (data.attendance?.id) {
        setAttendanceSessionId(data.attendance.id);
        localStorage.setItem(`moya_attendance_session_${webinar.id}`, data.attendance.id);
      }
    })
    .catch(console.error);
  }, [session?.id, webinar.id]);

  // Banner Listener
  useEffect(() => {
    if (!session?.id || normalizedStatus !== 'LIVE') return;

    const channel = supabase
      .channel(`banner-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          const meta = typeof msg.metadata === 'string' ? JSON.parse(msg.metadata) : (msg.metadata || {});
          if (msg.message_type === 'CTA' && (meta.type === 'BANNER' || meta.type === 'BOTH')) {
            setActiveBanner({ ...msg, metadata: meta });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, normalizedStatus, supabase]);

  // Heartbeat & Presence effect
  useEffect(() => {
    if (normalizedStatus !== 'LIVE' || !session?.started_at) return;

    const startTime = new Date(session.started_at).getTime();

    // Realtime Presence Tracker for Live Watcher Synchronization
    const regId = localStorage.getItem(`moya_attendee_${webinar.id}`);
    const attendeeName = localStorage.getItem(`moya_attendee_name_${webinar.id}`) || 'Attendee';
    let presenceChannel: ReturnType<typeof supabase.channel> | null = null;

    if (regId) {
      presenceChannel = supabase.channel(`presence-${session.id}`, {
        config: { presence: { key: regId } }
      });

      presenceChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && presenceChannel) {
          await presenceChannel.track({
            registration_id: regId,
            name: attendeeName,
            online_at: new Date().toISOString()
          });
        }
      });
    }

    const sendLeaveSignal = () => {
      const attId = localStorage.getItem(`moya_attendance_session_${webinar.id}`);
      const payload = JSON.stringify({
        attendance_session_id: attId || undefined,
        registration_id: regId,
        session_id: session.id
      });

      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/leave', payload);
      } else {
        fetch('/api/analytics/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true
        }).catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendLeaveSignal();
      } else if (document.visibilityState === 'visible' && presenceChannel && regId) {
        presenceChannel.track({
          registration_id: regId,
          name: attendeeName,
          online_at: new Date().toISOString()
        });
      }
    };

    window.addEventListener('beforeunload', sendLeaveSignal);
    window.addEventListener('pagehide', sendLeaveSignal);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Fast 10-second heartbeat for analytics
    const heartbeatInterval = setInterval(() => {
      // Small probability to ping the scheduler to trigger auto-end (so we don't DDoS the server)
      if (Math.random() < 0.05) {
        fetch('/api/cron/webinar-scheduler', { method: 'POST', cache: 'no-store' }).catch(() => {});
      }

      if (!attendanceSessionId) return;
      const now = new Date().getTime();
      const diffSeconds = Math.max(0, (now - startTime) / 1000);
      
      fetch('/api/analytics/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          attendance_session_id: attendanceSessionId,
          current_video_time: diffSeconds 
        })
      }).catch(console.error);
    }, 10000);

    return () => {
      sendLeaveSignal();
      window.removeEventListener('beforeunload', sendLeaveSignal);
      window.removeEventListener('pagehide', sendLeaveSignal);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (presenceChannel) supabase.removeChannel(presenceChannel);
      clearInterval(heartbeatInterval);
    };
  }, [normalizedStatus, session?.started_at, attendanceSessionId, session?.id, webinar.id, supabase]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === 'm') {
        setIsMuted(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0E0F12] text-zinc-100 overflow-hidden">
      {/* Professional Header */}
      <header 
        className={`flex items-center justify-between bg-[#121419] px-4 lg:px-6 shadow-sm transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${isFullscreen ? 'h-0 opacity-0 border-b-0 pointer-events-none' : 'h-14 opacity-100 border-b border-zinc-800'}`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center font-bold text-white tracking-widest text-lg">
            {branding.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={branding.logo_url} 
                alt={branding.brand_name || 'Brand Logo'} 
                className="max-h-7 max-w-[120px] object-contain" 
              />
            ) : (
              branding.brand_name || 'MOYA'
            )}
          </div>
          <div className="h-4 w-px bg-zinc-700 mx-2" />
          <h1 className="text-sm font-medium text-zinc-300 truncate max-w-xs sm:max-w-md">
            {webinar.title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {normalizedStatus === 'LIVE' && (
            <div className="flex items-center gap-1.5 bg-red-500/10 text-red-500 px-2.5 py-0.5 rounded text-xs font-bold tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              LIVE
            </div>
          )}
          <button 
            onClick={toggleFullscreen}
            className="text-zinc-400 hover:text-white active:scale-95 transition-all hidden sm:block p-1"
            title="Fullscreen (F)"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Video Area */}
        <div className={`flex-1 flex flex-col justify-center items-center bg-black relative ${isFullscreen ? 'p-0' : 'p-0 sm:p-2 lg:p-4'}`}>
          {normalizedStatus === 'WAITING' ? (
            <div className="flex aspect-video w-full max-w-5xl flex-col items-center justify-center rounded-xl border border-zinc-800/50 bg-[#12141A] p-8 text-center">
              <h2 className="text-xl font-medium text-zinc-200 mb-2">Webinar will begin shortly</h2>
              <p className="text-zinc-500 text-sm">Please wait for the host to start the broadcast.</p>
            </div>
          ) : normalizedStatus === 'ENDED' ? (
            <div className="flex aspect-video w-full max-w-5xl flex-col items-center justify-center rounded-xl border border-zinc-800/50 bg-[#12141A] p-8 text-center">
              <h2 className="text-xl font-medium text-zinc-200 mb-2">Webinar has ended</h2>
              <p className="text-zinc-500 text-sm">Thank you for attending.</p>
            </div>
          ) : (
            <div className={`w-full h-full flex flex-col relative ${isFullscreen ? 'max-w-none' : 'max-w-5xl aspect-video rounded-xl overflow-hidden'}`}>
              <VideoPlayer 
                url={webinar.recording_url || webinar.video_url} 
                sessionId={session?.id}
                webinarId={webinar.id}
                status={normalizedStatus}
                isMuted={isMuted}
                isFullscreen={isFullscreen}
                startedAt={session?.started_at}
                hideOverlay={!!activeBanner}
              />
              
              {/* Click to Unmute Overlay */}
              {isMuted && (
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                  <button 
                    onClick={() => setIsMuted(false)}
                    className="pointer-events-auto bg-blue-600/90 hover:bg-blue-500 text-white px-6 py-3 rounded-full font-semibold shadow-2xl flex items-center gap-3 backdrop-blur-sm border border-blue-500/50 transition-all hover:scale-105 animate-pulse"
                  >
                    <VolumeX className="w-5 h-5" />
                    Click to Unmute Audio
                  </button>
                </div>
              )}
              
              {/* Flash Banner Overlay — only in fullscreen mode */}
              {isFullscreen && activeBanner && (
                <FlashBanner 
                  mode="overlay"
                  message={activeBanner} 
                  onClose={() => setActiveBanner(null)}
                  onClaimOffer={() => window.dispatchEvent(new CustomEvent('requestPiP'))}
                />
              )}
            </div>
          )}
        </div>

        {/* Right Side Panel (Chat Box / Flash Banner in sidebar mode) */}
        <div 
          className={`
            shrink-0 bg-[#121419] flex flex-col transition-all duration-500 ease-in-out overflow-hidden
            ${(isFullscreen || !showChat) 
              ? 'lg:w-0 lg:opacity-0 h-0 lg:h-full lg:border-l-0 opacity-0 border-t-0 pointer-events-none' 
              : 'w-full lg:w-[340px] h-[45vh] lg:h-full border-t lg:border-t-0 lg:border-l border-zinc-800 opacity-100'
            }
          `}
        >
          <div className="w-full lg:w-[340px] h-full flex flex-col min-h-0 relative">
            {/* Flash Banner replaces chat in sidebar when active */}
            {!isFullscreen && activeBanner ? (
              <FlashBanner 
                mode="sidebar"
                message={activeBanner} 
                onClose={() => setActiveBanner(null)}
                onClaimOffer={() => window.dispatchEvent(new CustomEvent('requestPiP'))}
              />
            ) : session ? (
              <ChatPanel sessionId={session.id} webinarId={webinar.id} status={normalizedStatus} isOverlay={false} />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-zinc-600 text-sm">
                Chat will be available when the session starts
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Minimal Bottom Control Bar */}
      <footer 
        className={`bg-[#121419] px-4 flex items-center justify-between shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${isFullscreen ? 'h-0 opacity-0 border-t-0 pointer-events-none' : 'h-14 opacity-100 border-t border-zinc-800'}`}
      >
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-zinc-300 hover:bg-zinc-800 active:scale-95 transition-all"
            title="Mute/Unmute (M)"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-zinc-300" />}
            <span className="hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowChat(!showChat)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium active:scale-95 transition-all ${showChat ? 'bg-zinc-800 text-white shadow-inner' : 'text-zinc-400 hover:bg-zinc-800/50'}`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Chat</span>
          </button>
          <button 
            onClick={toggleFullscreen}
            className="flex sm:hidden items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-zinc-400 hover:bg-zinc-800/50 active:scale-95 transition-all"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
