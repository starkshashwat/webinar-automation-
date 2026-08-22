'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { type ChatMessage } from '@/types/chat';
import { ChatMessageItem } from './chat-message';
import { ChatInput } from './chat-input';
import { ArrowDown, MessageSquare, Reply, Lock } from 'lucide-react';

export function ChatPanel({ 
  sessionId, 
  webinarId,
  status,
  isOverlay = false,
  isAdmin = false,
  onReply
}: { 
  sessionId: string; 
  webinarId?: string;
  status: 'WAITING' | 'LIVE' | 'ENDED';
  isOverlay?: boolean;
  isAdmin?: boolean;
  onReply?: (attendeeId: string, name: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [newMsgIds, setNewMsgIds] = useState<Set<string>>(new Set());
  const [supabase] = useState(() => createClient());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [attendeeName, setAttendeeName] = useState('Anonymous');
  const [attendeeId, setAttendeeId] = useState<string | null>(null);

  const dismissNew = (id: string) => {
    setNewMsgIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const dismissAllNew = () => {
    setNewMsgIds(new Set());
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let storedName = webinarId ? localStorage.getItem(`moya_attendee_name_${webinarId}`) : null;
      let storedId = webinarId ? localStorage.getItem(`moya_attendee_${webinarId}`) : null;

      // Fallback: search any registered attendee in localStorage
      if (!storedName || !storedId) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('moya_attendee_name_') && !storedName) {
            storedName = localStorage.getItem(key);
          }
          if (key && key.startsWith('moya_attendee_') && !key.startsWith('moya_attendee_name_') && !storedId) {
            storedId = localStorage.getItem(key);
          }
        }
      }

      if (storedName) setAttendeeName(storedName);
      if (storedId) setAttendeeId(storedId);
    }
  }, [webinarId]);

  const scrollToBottom = (force = false) => {
    if (!scrollContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    
    if (force || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setHasNewMessages(false);
    } else {
      setHasNewMessages(true);
    }
  };

  useEffect(() => {
    scrollToBottom(true);
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 20) {
      setHasNewMessages(false);
      dismissAllNew();
    }
  };

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      
      if (data) {
        setMessages(data as ChatMessage[]);
      }
    };

    fetchMessages();

    const uniqueChannelName = `chat-${sessionId}-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setNewMsgIds((prev) => new Set(prev).add(newMessage.id));
          setMessages((prev) => [...prev, newMessage]);

          // Auto-clear badge after 6 seconds
          setTimeout(() => {
            setNewMsgIds((prev) => {
              const next = new Set(prev);
              next.delete(newMessage.id);
              return next;
            });
          }, 6000);
        }
      )
      .subscribe();

    // Subscribe to private messages if we have a private channel ID
    let privateChannel: ReturnType<typeof supabase.channel> | null = null;
    const privateChannelId = webinarId ? localStorage.getItem(`moya_private_channel_${webinarId}`) : null;
    if (privateChannelId) {
      privateChannel = supabase
        .channel(`private-chat-${privateChannelId}`)
        .on(
          'broadcast',
          { event: 'message' },
          (payload) => {
            if (payload.payload) {
              const pMsg = payload.payload as ChatMessage;
              setNewMsgIds((prev) => new Set(prev).add(pMsg.id));
              setMessages((prev) => [...prev, pMsg]);

              setTimeout(() => {
                setNewMsgIds((prev) => {
                  const next = new Set(prev);
                  next.delete(pMsg.id);
                  return next;
                });
              }, 6000);
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(channel);
      if (privateChannel) supabase.removeChannel(privateChannel);
    };
  }, [sessionId, supabase, webinarId]);

  const handleSend = async (text: string) => {
    const senderName = isAdmin ? 'HOST' : attendeeName;
    const msgType = isAdmin ? 'HOST' : 'ATTENDEE';
    
    const res = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        message: text,
        sender_name: senderName,
        message_type: msgType,
        attendee_id: attendeeId || null,
        registration_id: attendeeId || null,
      })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error('Failed to send message:', data);
    }
  };

  // Strict privacy and display filtering rules
  const visibleMessages = messages.filter(msg => {
    // Parse metadata safely (handles both JSON string and object from Postgres)
    const meta = typeof msg.metadata === 'string' 
      ? (() => { try { return JSON.parse(msg.metadata); } catch { return {}; } })() 
      : (msg.metadata || {});

    // 1. Flashcard / Banner messages MUST NEVER be rendered as chat bubbles in the chat log
    if (msg.message_type === 'CTA' && (meta.type === 'BANNER' || meta.display_type === 'BANNER')) {
      return false;
    }

    // 2. Host sees all valid chat messages
    if (isAdmin) return true;

    // 3. Broadcasts (SYSTEM and In-Chat CTA announcements) are visible to all attendees
    if (['SYSTEM', 'CTA'].includes(msg.message_type)) {
      return true;
    }

    // 3. Attendee messages: Attendees only see their OWN messages in their private room
    if (msg.message_type === 'ATTENDEE') {
      const isSelf = 
        (attendeeId && (msg.attendee_id === attendeeId || msg.registration_id === attendeeId)) ||
        (attendeeName && msg.sender_name?.trim().toLowerCase() === attendeeName?.trim().toLowerCase());
      return Boolean(isSelf);
    }

    // 4. Host & AI messages:
    if (['AI', 'HOST'].includes(msg.message_type)) {
      // If message is marked as a PRIVATE reply:
      if (msg.target_attendee_id) {
        // ONLY the targeted recipient attendee can see it
        const isTarget = 
          (attendeeId && msg.target_attendee_id === attendeeId) ||
          (attendeeName && msg.target_attendee_id?.trim().toLowerCase() === attendeeName?.trim().toLowerCase());
        return Boolean(isTarget);
      }
      // If it's a general public broadcast announcement (target_attendee_id is null):
      return true;
    }

    return false;
  });

  return (
    <div className={`flex h-full min-h-0 flex-col ${isOverlay ? 'bg-transparent' : 'bg-[#121419]'}`}>
      {!isOverlay && (
        <div className="px-5 py-3.5 border-b border-zinc-800 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <h2 className="font-bold text-white tracking-wide text-xs uppercase">
              {isAdmin ? 'Host & Attendee Live Chat' : 'Live Chat'}
            </h2>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">
            {visibleMessages.length} msg{visibleMessages.length === 1 ? '' : 's'}
          </span>
        </div>
      )}
      
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto overflow-x-hidden ${isOverlay ? 'p-2 space-y-1.5' : 'p-4 space-y-2'} custom-scrollbar relative`}
        style={isOverlay ? { maskImage: 'linear-gradient(to bottom, transparent, black 10%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%)' } : {}}
      >
        {visibleMessages.length === 0 ? (
          <div className="text-sm text-zinc-500 text-center mt-8 h-full flex flex-col items-center justify-center p-4">
            <MessageSquare className="w-8 h-8 mb-3 opacity-20" />
            <p className="font-medium text-zinc-400">Live chat is ready.</p>
            <p className="text-xs text-zinc-600 mt-1">Attendee questions and private messages will stream here in real time.</p>
          </div>
        ) : (
          visibleMessages.map((msg, idx) => {
            const isAttendeeMsg = msg.message_type === 'ATTENDEE';
            const targetId = msg.attendee_id || msg.registration_id || msg.sender_name;

            return (
              <div key={msg.id} className="message-enter relative group">
                <ChatMessageItem 
                  message={msg} 
                  isAdmin={isAdmin} 
                  isNew={isAdmin && newMsgIds.has(msg.id)}
                  onDismissNew={() => dismissNew(msg.id)}
                  webinarId={webinarId}
                  attendeeId={attendeeId}
                />
                
                {/* 1-Click Private Reply Button for Admin */}
                {isAdmin && isAttendeeMsg && (
                  <div className="mt-1 flex items-center justify-end">
                    <button 
                      onClick={() => onReply && onReply(targetId, msg.sender_name)}
                      className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                      title={`Reply privately to ${msg.sender_name}`}
                    >
                      <Lock className="w-3 h-3 text-purple-400" />
                      <Reply className="w-3 h-3" />
                      Reply Privately to {msg.sender_name}
                    </button>
                  </div>
                )}

                {!isOverlay && idx < visibleMessages.length - 1 && <div className="h-px bg-zinc-800/40 my-1 mx-2" />}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
        
        {hasNewMessages && (
          <div className="sticky bottom-2 left-0 right-0 flex justify-center z-10">
            <button 
              onClick={() => scrollToBottom(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)] flex items-center gap-2 transition-all active:scale-95 animate-bounce"
            >
              <ArrowDown className="w-4 h-4" />
              New messages
            </button>
          </div>
        )}
      </div>
      
      {!isAdmin && (
        <div className={`p-4 shrink-0 ${isOverlay ? '' : 'border-t border-zinc-800 bg-[#0E0F12]'}`}>
          <ChatInput status={status} onSend={handleSend} isOverlay={isOverlay} />
        </div>
      )}
    </div>
  );
}
