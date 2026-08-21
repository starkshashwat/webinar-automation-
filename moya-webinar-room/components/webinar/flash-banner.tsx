'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, ShoppingCart } from 'lucide-react';
import { type ChatMessage } from '@/types/chat';
import { trackCtaClick } from '@/lib/analytics/tracker';

export function FlashBanner({ 
  message, 
  onClose, 
  onClaimOffer,
  mode = 'overlay'
}: { 
  message: ChatMessage; 
  onClose: () => void; 
  onClaimOffer?: () => void;
  mode?: 'overlay' | 'sidebar';
}) {
  const [isVisible, setIsVisible] = useState(false);
  const durationMs = (message.metadata?.bannerDuration || 30) * 1000;

  useEffect(() => {
    // Slight delay for smooth entrance animation
    const enterTimer = setTimeout(() => setIsVisible(true), 50);
    
    // Auto-close banner after duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, durationMs);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(timer);
    };
  }, [onClose, durationMs]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleClaim = () => {
    trackCtaClick();
    if (onClaimOffer) {
      onClaimOffer();
    }
    handleClose();
  };

  // Find URL in text
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = message.message.match(urlRegex) || [];
  const primaryUrl = urls[0];

  const metadata = message.metadata || {};
  const imageUrl = metadata.imageUrl;
  const textWithoutUrl = message.message.replace(urlRegex, '').trim();

  const cardContent = (
    <div className="relative w-full max-w-[340px] sm:max-w-[360px] bg-gradient-to-br from-indigo-950/95 via-[#121424]/95 to-[#0f172a]/95 backdrop-blur-xl border border-indigo-500/30 shadow-[0_0_40px_rgba(99,102,241,0.25)] rounded-2xl overflow-hidden transition-all duration-300">
      
      {/* Animated top accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 animate-pulse" />

      {/* Cut / Close Button */}
      <button 
        onClick={handleClose}
        className="absolute top-3 right-3 z-20 flex items-center gap-1 text-white/80 hover:text-white bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full px-2 py-1 border border-white/15 transition-all hover:scale-105 shadow-md"
        title="Cut / Dismiss Banner"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider pl-0.5">Cut</span>
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Image Preview (Proportional, Not Stretched) */}
      {imageUrl && (
        <div className="w-full bg-black/50 border-b border-white/10 p-2.5 flex justify-center items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={imageUrl} 
            alt="Promotion"
            className="w-full max-h-36 object-contain rounded-lg"
          />
        </div>
      )}

      {/* Body Content */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-1.5 text-indigo-400 font-bold tracking-wider text-[10px] uppercase">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-400" />
          Special Offer Unlocked
        </div>
        
        <p className="text-white text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line line-clamp-3">
          {textWithoutUrl || "Exclusive offer available now! Don't miss out."}
        </p>

        {primaryUrl && (
          <a
            href={primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClaim}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-sm py-3 px-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] border border-emerald-400/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ShoppingCart className="w-4 h-4 animate-bounce" />
            CLAIM OFFER NOW
          </a>
        )}
      </div>
    </div>
  );

  if (mode === 'sidebar') {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      }`}>
        {cardContent}
      </div>
    );
  }

  // Overlay mode (Fullscreen / Mobile Floating)
  return (
    <div className={`absolute bottom-6 right-6 z-[60] transition-all duration-300 transform ${
      isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-6 opacity-0 scale-95 pointer-events-none'
    }`}>
      {cardContent}
    </div>
  );
}
