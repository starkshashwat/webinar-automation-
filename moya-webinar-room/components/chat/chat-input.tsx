'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';

export function ChatInput({ 
  status, 
  onSend,
  isOverlay = false
}: { 
  status: 'WAITING' | 'LIVE' | 'ENDED';
  onSend: (message: string) => Promise<void>;
  isOverlay?: boolean;
}) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending || status !== 'LIVE') return;

    setIsSending(true);
    try {
      await onSend(message.trim());
      setMessage('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={status !== 'LIVE' || isSending}
        placeholder={status === 'LIVE' ? 'Ask a question...' : 'Chat is closed'}
        className={`flex-1 rounded-full border px-4 py-2 text-sm shadow-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors ${
          isOverlay 
            ? 'bg-black/60 border-white/10 text-white focus-visible:bg-black/80' 
            : 'bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:border-zinc-700'
        }`}
      />
      <button 
        type="submit" 
        disabled={!message.trim() || status !== 'LIVE' || isSending}
        className={`flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-95 disabled:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed ${
          isOverlay
            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'
            : 'bg-zinc-800 hover:bg-zinc-700 text-blue-400'
        }`}
      >
        <Send className="h-4 w-4 ml-0.5" />
        <span className="sr-only">Send</span>
      </button>
    </form>
  );
}
