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

  const resetActivity = () => {
    setIsActive(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    // Auto-fade after 4 seconds of inactivity
    timerRef.current = setTimeout(() => {
      setIsActive(false);
    }, 4000);
  };

  useEffect(() => {
    resetActivity();

    const handleInteraction = () => resetActivity();

    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col justify-end items-start md:items-end p-2 sm:p-4 md:p-6 pb-12 sm:pb-16 md:pb-6 pointer-events-none">
      {/* Container with smooth auto-fade on inactivity and full opacity on hover/focus */}
      <div 
        onMouseEnter={() => setIsActive(true)}
        onMouseLeave={resetActivity}
        onTouchStart={resetActivity}
        className={`w-full max-w-[320px] sm:max-w-[420px] h-[220px] sm:h-[320px] max-h-full pointer-events-auto flex flex-col transition-all duration-500 ease-in-out ${
          isActive 
            ? 'opacity-100 scale-100' 
            : 'opacity-20 hover:opacity-100 focus-within:opacity-100 scale-[0.98] hover:scale-100'
        }`}
      >
        <div className="w-full h-full bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-1 flex flex-col overflow-hidden shadow-2xl">
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
