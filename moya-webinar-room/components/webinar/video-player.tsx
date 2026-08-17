'use client';

import { useRef, useEffect, useState } from 'react';
import { ChatOverlay } from '@/components/chat/chat-overlay';

export function VideoPlayer({ 
  url, 
  sessionId, 
  status,
  isMuted = false,
  isFullscreen = false,
  startedAt
}: { 
  url: string | null; 
  sessionId?: string; 
  status?: 'WAITING' | 'LIVE' | 'ENDED';
  isMuted?: boolean;
  isFullscreen?: boolean;
  startedAt?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [initialStartSeconds, setInitialStartSeconds] = useState(0);

  // Mute effect
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Global Time Sync Effect
  useEffect(() => {
    if (status !== 'LIVE' || !startedAt) return;

    const startTimestamp = new Date(startedAt).getTime();
    
    // Calculate initial start offset for YouTube
    const now = Date.now();
    const initialElapsed = Math.max(0, (now - startTimestamp) / 1000);
    setInitialStartSeconds(Math.floor(initialElapsed));

    // Continuous sync loop for direct <video>
    const syncInterval = setInterval(() => {
      const currentNow = Date.now();
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

        const drift = Math.abs(video.currentTime - targetTime);

        // If drift is greater than 2 seconds, force resync
        if (drift > 2) {
          video.currentTime = targetTime;
        }

        // Enforce playing state if it was paused
        if (video.paused && targetTime < video.duration) {
          video.play().catch(e => console.error('Auto-play prevented:', e));
        }
      }
    }, 1000);

    return () => clearInterval(syncInterval);
  }, [status, startedAt]);

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
          className="w-full h-full object-contain pointer-events-none"
        />
      ) : (
        <iframe
          src={embedUrl}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          className="absolute inset-0 h-full w-full border-0 pointer-events-none"
        />
      )}

      {/* Chat Overlay for Fullscreen or Mobile */}
      {sessionId && status === 'LIVE' && (
        <div className={`absolute bottom-0 left-0 right-0 z-40 transition-all duration-300 pointer-events-auto ${isFullscreen ? 'h-[35%]' : 'h-[35%] lg:hidden'}`}>
          <ChatOverlay sessionId={sessionId} status={status} />
        </div>
      )}
    </div>
  );
}
