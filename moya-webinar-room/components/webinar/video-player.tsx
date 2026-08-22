'use client';

import { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { Volume2, VolumeX, Maximize, Minimize, PictureInPicture, Loader2 } from 'lucide-react';
import { ChatOverlay } from '@/components/chat/chat-overlay';

export function VideoPlayer({ 
  url, 
  sessionId, 
  webinarId,
  status,
  isMuted = false,
  isFullscreen = false,
  hideOverlay = false,
  startedAt,
  onMuteToggle,
  onFullscreenToggle
}: { 
  url: string | null; 
  sessionId?: string; 
  webinarId?: string;
  status?: 'WAITING' | 'LIVE' | 'ENDED';
  isMuted?: boolean;
  isFullscreen?: boolean;
  hideOverlay?: boolean;
  startedAt?: string | null;
  onMuteToggle?: (muted: boolean) => void;
  onFullscreenToggle?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [timeOffset, setTimeOffset] = useState<number>(0);
  const [initialEmbedUrl, setInitialEmbedUrl] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<'mp4' | 'hls' | 'youtube' | null>(null);
  
  const [isBuffering, setIsBuffering] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync server time offset
  useEffect(() => {
    let active = true;
    const fetchTime = async () => {
      try {
        const clientStart = Date.now();
        const res = await fetch('/api/time');
        const data = await res.json();
        if (!active) return;
        const clientEnd = Date.now();
        const rtt = clientEnd - clientStart;
        const estimatedServerTime = data.serverTime + (rtt / 2);
        const offset = estimatedServerTime - clientEnd;
        setTimeOffset(offset);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') console.error('Failed to fetch server time for sync', err);
      }
    };
    fetchTime();
    return () => { active = false; };
  }, []);

  // Detect Source Type and set URL
  useEffect(() => {
    if (!url) {
      setSourceType(null);
      return;
    }
    
    if (process.env.NODE_ENV === 'development') console.log(`[PLAYER_SOURCE_CHANGE] URL updated`);
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      setSourceType('youtube');
      if (!initialEmbedUrl) {
         let videoId = url.includes('youtu.be') ? new URL(url).pathname.slice(1) : new URL(url).searchParams.get('v') || '';
         let start = 0;
         if (status === 'LIVE' && startedAt) {
            const startTimestamp = new Date(startedAt).getTime();
            start = Math.floor(Math.max(0, (Date.now() + timeOffset - startTimestamp) / 1000));
         }
         // Immutable URL with enablejsapi=1 for postMessage control
         setInitialEmbedUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&controls=0&modestbranding=1&enablejsapi=1&start=${start}`);
      }
    } else if (url.endsWith('.m3u8') || url.includes('.m3u8')) {
      setSourceType('hls');
    } else {
      setSourceType('mp4');
    }
  }, [url, status, startedAt, initialEmbedUrl]); // Exclude timeOffset and isMuted from deps

  // HLS Mounting
  useEffect(() => {
    if (sourceType !== 'hls' || !url || !videoRef.current) return;
    const video = videoRef.current;
    
    if (process.env.NODE_ENV === 'development') console.log(`[PLAYER_MOUNT] HLS initialization`);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });
      hlsRef.current = hls;
      
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (process.env.NODE_ENV === 'development') console.log(`[PLAYER_RECOVER] Network error, recovering`);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (process.env.NODE_ENV === 'development') console.log(`[PLAYER_RECOVER] Media error, recovering`);
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
      return () => {
        if (process.env.NODE_ENV === 'development') console.log(`[PLAYER_UNMOUNT] HLS destruction`);
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari
      video.src = url;
    }
  }, [url, sourceType]);

  // Handle Mute/Unmute without reloading
  useEffect(() => {
    if (sourceType === 'youtube' && iframeRef.current?.contentWindow) {
      if (process.env.NODE_ENV === 'development') console.log(`[PLAYER_UNMUTE] YouTube iframe postMessage`);
      const command = isMuted ? 'mute' : 'unMute';
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: command, args: [] }), '*');
    } else if (videoRef.current) {
      if (process.env.NODE_ENV === 'development') console.log(`[PLAYER_UNMUTE] Native video mute state: ${isMuted}`);
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, sourceType]);

  // Live Synchronization Loop (Drift Correction)
  useEffect(() => {
    if (status !== 'LIVE' || !startedAt) return;
    const startTimestamp = new Date(startedAt).getTime();
    let isRecovering = false;
    
    // Use interval purely for drift checking and playback enforcement outside of React rendering lifecycle
    const syncInterval = setInterval(() => {
      // Ignore background tab drift checking to prevent heavy CPU usage
      if (document.hidden) return;

      if ((sourceType === 'mp4' || sourceType === 'hls') && videoRef.current) {
        const video = videoRef.current;
        
        // Wait until enough metadata/data is available
        if (video.readyState >= 2) {
          const currentNow = Date.now() + timeOffset;
          let targetTime = Math.max(0, (currentNow - startTimestamp) / 1000);
          
          if (video.duration && video.loop) {
            targetTime = targetTime % video.duration;
          } else if (video.duration && targetTime > video.duration) {
            targetTime = video.duration;
          }

          const drift = targetTime - video.currentTime;
          const absDrift = Math.abs(drift);

          // Force jump if drift is > 3 seconds to avoid infinite natural catching up
          if (absDrift > 3 && !isRecovering) {
            if (process.env.NODE_ENV === 'development') console.log(`[PLAYER_SYNC] Drift ${drift.toFixed(2)}s > 3s. Synchronizing.`);
            isRecovering = true;
            video.currentTime = targetTime;
            setTimeout(() => { isRecovering = false; }, 2000);
          }

          // Enforce playing if stalled due to buffering/browser policy, but do not spam
          if (video.paused && targetTime < (video.duration || Infinity)) {
            const vAny = video as any;
            if (!vAny._playAttempted) {
              vAny._playAttempted = true;
              video.play().catch(e => {
                // Auto-play blocked
              }).finally(() => {
                setTimeout(() => { vAny._playAttempted = false; }, 3000);
              });
            }
          }
        }
      }
    }, 2000); // Check every 2s

    return () => clearInterval(syncInterval);
  }, [status, startedAt, timeOffset, sourceType]);

  // Video Native Event Listeners for Buffering UI
  useEffect(() => {
    const video = videoRef.current;
    if (!video || (sourceType !== 'mp4' && sourceType !== 'hls')) return;

    const handleWaiting = () => {
      if (process.env.NODE_ENV === 'development') console.log(`[PLAYER_BUFFERING] Waiting for data`);
      setIsBuffering(true);
    };
    const handlePlaying = () => setIsBuffering(false);
    const handleLoadedData = () => {
      if (process.env.NODE_ENV === 'development') console.log(`[PLAYER_METADATA_READY] Media loaded`);
      setIsBuffering(false);
    };
    const handleError = () => {
      if (process.env.NODE_ENV === 'development') console.error(`[PLAYER_RECOVER] Fatal native video error`);
      setIsBuffering(true);
    };

    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
    };
  }, [sourceType]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 2500);
  };

  const handlePiPToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (process.env.NODE_ENV === 'development') console.log(`[PLAYER_PIP_ENTER] Toggling PiP`);
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current && document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP failed', err);
    }
  };

  if (!url) {
    return (
      <div className="flex w-full h-full items-center justify-center bg-[#090A0C] text-zinc-600 font-medium">
        No video source configured
      </div>
    );
  }

  const isNativeVideo = sourceType === 'mp4' || sourceType === 'hls';

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
      className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center select-none group"
    >
      {/* Video Source Rendering */}
      {isNativeVideo ? (
        <video
          ref={videoRef}
          src={sourceType === 'mp4' ? url : undefined}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          className="w-full h-full object-contain"
        />
      ) : (
        <iframe
          ref={iframeRef}
          src={initialEmbedUrl || undefined}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="absolute inset-0 h-full w-full border-0"
        />
      )}

      {/* Invisible overlay prevents skipping, pausing, or interacting with native controls (Live Illusion) */}
      <div className="absolute inset-0 z-10 bg-transparent cursor-default" />

      {/* Buffering Indicator */}
      {isNativeVideo && isBuffering && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none bg-black/20">
          <Loader2 className="w-8 h-8 text-white animate-spin opacity-70" />
        </div>
      )}

      {/* Custom Player Controls UI */}
      <div className={`absolute bottom-0 left-0 right-0 z-30 p-4 transition-opacity duration-300 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 bg-red-500/90 text-white px-2 py-1 rounded text-[10px] font-bold tracking-wider shadow-sm">
               <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
               LIVE
             </div>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            {onMuteToggle && (
              <button 
                onClick={(e) => { e.stopPropagation(); onMuteToggle(!isMuted); }}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors backdrop-blur-sm"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            )}
            
            {isNativeVideo && typeof document !== 'undefined' && document.pictureInPictureEnabled && (
              <button 
                onClick={handlePiPToggle}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors backdrop-blur-sm hidden sm:block"
                title="Picture in Picture"
              >
                <PictureInPicture className="w-4 h-4" />
              </button>
            )}

            {onFullscreenToggle && (
              <button 
                onClick={(e) => { e.stopPropagation(); onFullscreenToggle(); }}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors backdrop-blur-sm"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chat Overlay ONLY for Fullscreen */}
      {sessionId && status === 'LIVE' && !hideOverlay && isFullscreen && (
        <div className="absolute bottom-0 left-0 right-0 z-40 transition-all duration-300 pointer-events-auto h-[40vh] md:h-[40%]">
          <ChatOverlay sessionId={sessionId} webinarId={webinarId} status={status} />
        </div>
      )}
    </div>
  );
}
