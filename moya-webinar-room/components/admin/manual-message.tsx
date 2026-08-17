'use client';

import { useState } from 'react';
import { Send, Lock } from 'lucide-react';

export function ManualMessage({ 
  sessionId, 
  targetAttendeeId,
  targetAttendeeName
}: { 
  sessionId: string; 
  targetAttendeeId?: string | null;
  targetAttendeeName?: string | null;
}) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: message.trim(),
          sender_name: 'HOST',
          message_type: 'HOST',
          target_attendee_id: targetAttendeeId || null,
        })
      });
      if (res.ok) {
        setMessage('');
      } else {
        const data = await res.json();
        console.error('Failed to send message:', data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const isPrivate = Boolean(targetAttendeeId);

  return (
    <form onSubmit={handleSend} className="flex gap-2.5">
      <div className="relative flex-1">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            isPrivate 
              ? `Whisper privately to ${targetAttendeeName || 'attendee'}...` 
              : "Broadcast message to all attendees in the room..."
          }
          className={`w-full rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none transition-all placeholder:text-zinc-600 disabled:opacity-50 ${
            isPrivate 
              ? 'bg-purple-950/20 border border-purple-500/40 focus:border-purple-400 focus:ring-1 focus:ring-purple-400' 
              : 'bg-[#090A0C] border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700'
          }`}
          disabled={sending}
        />
      </div>
      <button 
        type="submit" 
        disabled={!message.trim() || sending}
        className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shrink-0 shadow-lg disabled:opacity-50 disabled:shadow-none ${
          isPrivate
            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/25'
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
        }`}
      >
        {isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
        <span>{isPrivate ? 'Whisper' : 'Broadcast'}</span>
      </button>
    </form>
  );
}
