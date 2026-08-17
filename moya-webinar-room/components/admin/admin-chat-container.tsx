'use client';

import { useState } from 'react';
import { ChatPanel } from '@/components/chat/chat-panel';
import { ManualMessage } from '@/components/admin/manual-message';
import { X, Lock, Radio } from 'lucide-react';

export function AdminChatContainer({ 
  sessionId, 
  status 
}: { 
  sessionId: string; 
  status: 'WAITING' | 'LIVE' | 'ENDED';
}) {
  const [replyTarget, setReplyTarget] = useState<{ id: string, name: string } | null>(null);

  return (
    <div className="flex flex-col h-full bg-[#121419]">
      <div className="flex-1 min-h-0 overflow-hidden">
        <ChatPanel 
          sessionId={sessionId} 
          status={status} 
          isAdmin={true} 
          onReply={(id, name) => setReplyTarget({ id, name })} 
        />
      </div>
      
      <div className="p-3.5 border-t border-zinc-800 bg-[#0E0F12] flex flex-col gap-2 shrink-0">
        {replyTarget ? (
          <div className="flex items-center justify-between bg-purple-950/40 border border-purple-500/40 text-purple-200 px-3.5 py-2 rounded-xl text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>
                Sending <strong>Private Whisper</strong> to <strong className="text-white font-semibold">{replyTarget.name}</strong>
              </span>
            </div>
            <button 
              onClick={() => setReplyTarget(null)}
              className="text-purple-400 hover:text-white bg-purple-500/20 hover:bg-purple-500/30 px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" />
              Switch to Public Broadcast
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Radio className="w-3 h-3 text-blue-400 animate-pulse" />
              Public Broadcast Mode
            </span>
            <span>Click &quot;Reply Privately&quot; on any attendee message to whisper</span>
          </div>
        )}
        <ManualMessage 
          sessionId={sessionId} 
          targetAttendeeId={replyTarget?.id || null} 
          targetAttendeeName={replyTarget?.name || null}
        />
      </div>
    </div>
  );
}
