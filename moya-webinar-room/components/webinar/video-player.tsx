'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { ChatOverlay } from '@/components/chat/chat-overlay';

export function VideoPlayer({ 
  url, 
  sessionId, 
  webinarId,
  status,
  isMuted = false,
  isFullscreen = false,
  hideOverlay = false,
  startedAt
}: { 
  url: string | null; 
  sessionId?: string; 
  webinarId?: string;
  status?: 'WAITING' | 'LIVE' | 'ENDED';
  isMuted?: boolean;
  isFullscreen?: boolean;
  hideOverlay?: boolean;
  startedAt?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [timeOffset, setTimeOffset] = useState<number>(0);

  // Sync server time offset
  useEffect(() => {
    const fetchTime = async () => {
      try {
        const clientStart = Date.now();
        const res = await fetch('/api/time');
        const data = await res.json();
        const clientEnd = Date.now();
        const rtt = clientEnd - clientStart;
        const estimatedServerTime = data.serverTime + (rtt / 2);
        const offset = estimatedServerTime - clientEnd;
        setTimeOffset(offset);
      } catch (err) {
        console.error('Failed to fetch server time for sync', err);
      }
    };
    fetchTime();
  }, []);

  // Mute effect
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Native Auto-PiP Setup (Option 1 Implementation)
  useEffect(() => {
    if (videoRef.current) {
      // Ensure PiP is allowed
      videoRef.current.disablePictureInPicture = false;
      // Enable Chrome/modern browser auto-PiP on tab switch/minimize
      if ('autoPictureInPicture' in videoRef.current) {
        (videoRef.current as any).autoPictureInPicture = true;
      }
    }
  }, [url]);

  // Global Time Sync Effect
  useEffect(() => {
    if (status !== 'LIVE' || !startedAt) return;

    const startTimestamp = new Date(startedAt).getTime();
    
    // Continuous sync loop for direct <video>
    const syncInterval = setInterval(() => {
      const currentNow = Date.now() + timeOffset;
      const rawTargetTime = Math.max(0, (currentNow - startTimestamp) / 1000);

      if (videoRef.current) {
        const video = videoRef.current;
        
        let targetTime = rawTargetTime;
        // If the video has loaded its metadata, apply modulo for looping videos
        if (video.duration && !isNaN(video.duration) && video.duration > 0) {
          if (video.loop) {
            targetTime = rawTargetTime % video.duration;
          } else if (rawTargetTime > video.duration) {
            targetTime = video.duration;
          }
        }

        const drift = targetTime - video.currentTime;
        const absDrift = Math.abs(drift);

        // If drift is massive (e.g. > 4 seconds) due to buffering/pausing, force a hard jump
        if (absDrift > 4) {
          video.currentTime = targetTime;
          video.playbackRate = 1.0;
        } 
        // If falling behind slightly (0.5s to 4s), speed up smoothly
        else if (drift > 0.5) {
          video.playbackRate = 1.15; // 15% faster to catch up
        } 
        // If ahead slightly (e.g. > 0.5s), slow down smoothly
        else if (drift < -0.5) {
          video.playbackRate = 0.85; // 15% slower to let server catch up
        } 
        // In perfect sync
        else {
          video.playbackRate = 1.0;
        }

        // Enforce playing state if it was paused (and not at the end)
        if (video.paused && targetTime < video.duration) {
          const vAny = video as any;
          if (!vAny._playAttempted) {
            vAny._playAttempted = true;
            video.play().catch(e => {
              // Only log once to avoid spamming the console
            }).finally(() => {
              setTimeout(() => { vAny._playAttempted = false; }, 3000);
            });
          }
        }
      }
    }, 1000);

    return () => clearInterval(syncInterval);
  }, [status, startedAt, timeOffset]);

  if (!url) {
    return (
      <div className="flex w-full h-full items-center justify-center bg-[#090A0C] text-zinc-600 font-medium">
        No video source configured
      </div>
    );
  }

  const isDirectVideo = url.endsWith('.mp4') || url.endsWith('.webm') || url.includes('.mp4') || url.includes('.m3u8');

  const embedUrl = useMemo(() => {
    let finalUrl = url;
    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
        let videoId = parsed.hostname.includes('youtu.be') 
          ? parsed.pathname.slice(1) 
          : parsed.searchParams.get('v') || '';
        if (videoId) {
          let currentElapsed = 0;
          if (status === 'LIVE' && startedAt) {
             const startTimestamp = new Date(startedAt).getTime();
             const now = Date.now() + timeOffset;
             currentElapsed = Math.floor(Math.max(0, (now - startTimestamp) / 1000));
          }
          finalUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${isMuted ? '1' : '0'}&rel=0&controls=0&modestbranding=1&start=${currentElapsed}`;
        }
      }
    } catch (e) {
      // Ignore
    }
    return finalUrl;
  }, [url, isMuted, status, startedAt, timeOffset]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center select-none group">
      {/* Video Source Rendering */}
      {isDirectVideo ? (
        <video
          ref={videoRef}
          src={url}
          autoPlay
          loop
          muted={isMuted}
          playsInline
          className="w-full h-full object-contain"
        />
      ) : (
        <iframe
          src={embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="absolute inset-0 h-full w-full border-0"
        />
      )}

      {/* Invisible overlay to prevent clicking/pausing the video (to enforce 'Live' illusion) */}
      <div className="absolute inset-0 z-10 bg-transparent" />

      {/* Chat Overlay ONLY for Fullscreen */}
      {sessionId && status === 'LIVE' && !hideOverlay && isFullscreen && (
        <div className="absolute bottom-0 left-0 right-0 z-40 transition-all duration-300 pointer-events-auto h-[40vh] md:h-[40%]">
          <ChatOverlay sessionId={sessionId} webinarId={webinarId} status={status} />
        </div>
      )}
    </div>
  );
}
