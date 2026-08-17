'use client';

import { useState, useEffect } from 'react';
import { VideoPlayer } from './video-player';
import { ChatPanel } from '@/components/chat/chat-panel';
import { type Webinar, type WebinarSession } from '@/types/webinar';
import { MessageSquare, Maximize, Volume2, VolumeX } from 'lucide-react';

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
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null);

  const normalizedStatus: 'WAITING' | 'LIVE' | 'ENDED' = 
    (webinar.status?.toUpperCase() === 'LIVE' || webinar.status === 'live') ? 'LIVE' :
    (webinar.status?.toUpperCase() === 'ENDED' || webinar.status === 'ended') ? 'ENDED' : 'WAITING';
  
  // Analytics Join Effect
  useEffect(() => {
    if (!session?.id) return;
    const regId = sessionStorage.getItem('moya_attendee_id');
    if (!regId) return;

    fetch('/api/analytics/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registration_id: regId, session_id: session.id })
    })
    .then(r => r.json())
    .then(data => {
      if (data.attendance?.id) setAttendanceSessionId(data.attendance.id);
    })
    .catch(console.error);
  }, [session?.id]);

  // Elapsed time and Heartbeat effect
  useEffect(() => {
    if (normalizedStatus !== 'LIVE' || !session?.started_at) return;

    const startTime = new Date(session.started_at).getTime();
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, now - startTime);
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setElapsedTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    // Heartbeat for analytics
    const heartbeatInterval = setInterval(() => {
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
    }, 30000);

    return () => {
      clearInterval(interval);
      clearInterval(heartbeatInterval);
    };
  }, [normalizedStatus, session?.started_at, attendanceSessionId]);

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
      {!isFullscreen && (
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-[#121419] px-4 lg:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center font-bold text-white tracking-widest text-lg">
              MOYA
            </div>
            <div className="h-4 w-px bg-zinc-700 mx-2" />
            <h1 className="text-sm font-medium text-zinc-300 truncate max-w-xs sm:max-w-md">
              {webinar.title}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {normalizedStatus === 'LIVE' && (
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-zinc-400">{elapsedTime}</span>
                <div className="flex items-center gap-1.5 bg-red-500/10 text-red-500 px-2 py-0.5 rounded text-xs font-bold tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  LIVE
                </div>
              </div>
            )}
            <button 
              onClick={toggleFullscreen}
              className="text-zinc-400 hover:text-white transition hidden sm:block p-1"
              title="Fullscreen (F)"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

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
                status={normalizedStatus}
                isMuted={isMuted}
                isFullscreen={isFullscreen}
                startedAt={session?.started_at}
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
            </div>
          )}
        </div>

        {/* Right Chat Panel (Desktop) */}
        {!isFullscreen && showChat && (
          <div className="w-full lg:w-[340px] shrink-0 border-l border-zinc-800 bg-[#121419] flex flex-col h-[40vh] lg:h-full transition-all">
            {session ? (
              <ChatPanel sessionId={session.id} status={normalizedStatus} isOverlay={false} />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-zinc-600 text-sm">
                Chat will be available when the session starts
              </div>
            )}
          </div>
        )}
      </main>

      {/* Minimal Bottom Control Bar */}
      {!isFullscreen && (
        <footer className="h-14 border-t border-zinc-800 bg-[#121419] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition"
              title="Mute/Unmute (M)"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-zinc-300" />}
              <span className="hidden sm:inline">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowChat(!showChat)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition ${showChat ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'}`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
            </button>
            <button 
              onClick={toggleFullscreen}
              className="flex sm:hidden items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-zinc-400 hover:bg-zinc-800/50 transition"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
