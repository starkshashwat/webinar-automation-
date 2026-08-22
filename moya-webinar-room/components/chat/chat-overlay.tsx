'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatPanel } from './chat-panel';

export function ChatOverlay({
  sessionId,
  webinarId,
  status
}: {
  sessionId: string;
  webinarId?: string;
  status: 'WAITING' | 'LIVE' | 'ENDED';
}) {
  const [isActive, setIsActive] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  const resetActivity = () => {
    setIsActive(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsActive(false);
    }, 4000);
  };

  useEffect(() => {
    resetActivity();

    const handleInteraction = (e: MouseEvent | TouchEvent | KeyboardEvent) => {
      // If it's a touch or click, check if outside
      if (e.type === 'touchstart' || e.type === 'mousedown') {
        const target = e.target as Node;
        if (chatRef.current && !chatRef.current.contains(target)) {
          // Clicked outside chat -> hide immediately
          setIsActive(false);
          if (timerRef.current) clearTimeout(timerRef.current);
          return;
        }
      }
      resetActivity();
    };

    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('mousedown', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col justify-end items-start md:items-end p-2 sm:p-4 md:p-6 pb-16 sm:pb-16 md:pb-6 pointer-events-none">
      {/* Container with smooth auto-fade on inactivity and full opacity on hover/focus */}
      <div 
        ref={chatRef}
        onMouseEnter={() => setIsActive(true)}
        onMouseLeave={resetActivity}
        className={`w-full md:max-w-[420px] h-[40vh] sm:h-[320px] max-h-full pointer-events-auto flex flex-col transition-all duration-500 ease-in-out ${
          isActive 
            ? 'opacity-100 scale-100' 
            : 'opacity-10 hover:opacity-100 focus-within:opacity-100 scale-[0.98] hover:scale-100'
        }`}
      >
        <div className="w-full h-full bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 p-1 flex flex-col overflow-hidden shadow-2xl">
          <ChatPanel 
            sessionId={sessionId} 
            webinarId={webinarId} 
            status={status} 
            isOverlay={true} 
          />
        </div>
      </div>
    </div>
  );
}
