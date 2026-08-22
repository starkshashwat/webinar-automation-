'use client';

import { useRef, useEffect, useState } from 'react';
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
  const [initialStartSeconds, setInitialStartSeconds] = useState(0);
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

  // PiP Listener
  useEffect(() => {
    const handlePiP = async () => {
      if (videoRef.current && document.pictureInPictureEnabled) {
        try {
          if (document.pictureInPictureElement !== videoRef.current) {
            await videoRef.current.requestPictureInPicture();
          }
        } catch (err) {
          console.error('PiP failed', err);
        }
      }
    };
    window.addEventListener('requestPiP', handlePiP);
    return () => window.removeEventListener('requestPiP', handlePiP);
  }, []);

  // Global Time Sync Effect
  useEffect(() => {
    if (status !== 'LIVE' || !startedAt) return;

    const startTimestamp = new Date(startedAt).getTime();
    
    // Calculate initial start offset for YouTube
    const now = Date.now() + timeOffset;
    const initialElapsed = Math.max(0, (now - startTimestamp) / 1000);
    setInitialStartSeconds(Math.floor(initialElapsed));

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
          video.play().catch(e => console.error('Auto-play prevented:', e));
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

  let embedUrl = url;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
      let videoId = parsed.hostname.includes('youtu.be') 
        ? parsed.pathname.slice(1) 
        : parsed.searchParams.get('v') || '';
      if (videoId) {
        // Append &start= parameter for initial load sync
        embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${isMuted ? '1' : '0'}&rel=0&controls=0&modestbranding=1&start=${initialStartSeconds}`;
      }
    }
  } catch (e) {
    // Ignore URL parse errors
  }

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

      {/* Chat Overlay for Fullscreen or Mobile */}
      {sessionId && status === 'LIVE' && !hideOverlay && (
        <div className={`absolute bottom-0 left-0 right-0 z-40 transition-all duration-300 pointer-events-auto ${isFullscreen ? 'h-[40%]' : 'h-[35%] lg:hidden'}`}>
          <ChatOverlay sessionId={sessionId} webinarId={webinarId} status={status} />
        </div>
      )}
    </div>
  );
}
