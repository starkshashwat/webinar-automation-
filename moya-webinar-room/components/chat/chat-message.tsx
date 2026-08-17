import { type ChatMessage } from '@/types/chat';
import { Bot, Crown, Rocket, Lock } from 'lucide-react';

const renderMessageWithLinks = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a 
          key={i} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors break-all inline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return <span key={i} className="break-words">{part}</span>;
  });
};

export function ChatMessageItem({ 
  message, 
  isAdmin = false 
}: { 
  message: ChatMessage;
  isAdmin?: boolean;
}) {
  const isAI = message.message_type === 'AI';
  const isHost = message.message_type === 'HOST';
  const isCTA = message.message_type === 'CTA';
  const isSystem = message.message_type === 'SYSTEM';
  const isPrivate = Boolean(message.target_attendee_id);

  if (isSystem) {
    return (
      <div className="flex justify-center my-1.5">
        <span className="text-xs text-zinc-300 bg-black/80 backdrop-blur-md border border-zinc-700/50 px-3 py-1 rounded-full shadow-md">
          {message.message}
        </span>
      </div>
    );
  }

  if (isCTA) {
    return (
      <div className="flex flex-col gap-1.5 my-2 bg-[#121124]/95 backdrop-blur-md border-l-4 border-l-indigo-500 border border-indigo-500/40 p-3 rounded-r-xl shadow-xl overflow-hidden">
        <div className="flex items-center gap-1.5">
          <Rocket className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="font-bold text-sm tracking-wide text-indigo-300">MOYA</span>
          <span className="text-xs text-zinc-400 font-mono ml-auto shrink-0">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-zinc-100 font-medium">
          {renderMessageWithLinks(message.message)}
        </p>
      </div>
    );
  }

  if (isAI && isAdmin) {
    const showPrivateBadge = isAdmin && isPrivate;
    return (
      <div className={`flex flex-col gap-1.5 my-2 p-3 rounded-xl border backdrop-blur-md shadow-xl overflow-hidden ${
        showPrivateBadge 
          ? 'bg-[#1e102d]/95 border-purple-500/50 text-purple-100' 
          : 'bg-[#0f172a]/95 border-blue-500/40 text-zinc-100'
      }`}>
        <div className="flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1.5 font-bold min-w-0">
            <Bot className={`w-4 h-4 shrink-0 ${showPrivateBadge ? 'text-purple-400' : 'text-blue-400'}`} />
            <span className={`truncate ${showPrivateBadge ? 'text-purple-300' : 'text-blue-300'}`}>
              {message.sender_name || 'MOYA AI'}
            </span>
            {showPrivateBadge && (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full font-semibold shrink-0">
                <Lock className="w-2.5 h-2.5" /> Private
              </span>
            )}
          </div>
          <span className="text-zinc-400 font-mono text-[11px] shrink-0">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-zinc-100">
          {renderMessageWithLinks(message.message)}
        </p>
      </div>
    );
  }

  if (isHost || (isAI && !isAdmin)) {
    const showPrivateBadge = isAdmin && isPrivate;
    const displayName = isHost ? message.sender_name : 'Host';
    return (
      <div className="flex flex-col gap-1.5 my-2 p-3 rounded-xl border bg-[#1a1408]/95 backdrop-blur-md border-amber-500/60 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1.5 font-bold text-amber-400 min-w-0">
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{displayName}</span>
            {showPrivateBadge && (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded-full font-semibold shrink-0">
                <Lock className="w-2.5 h-2.5" /> Whisper
              </span>
            )}
          </div>
          <span className="text-zinc-400 font-mono text-[11px] shrink-0">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-zinc-100 font-normal">
          {renderMessageWithLinks(message.message)}
        </p>
      </div>
    );
  }

  // ATTENDEE MESSAGE
  return (
    <div className="flex flex-col gap-1 my-1.5 p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 shadow-lg overflow-hidden">
      <div className="flex items-center justify-between text-xs gap-2">
        <span className="font-semibold text-zinc-100 truncate">{message.sender_name}</span>
        <span className="text-zinc-400 font-mono text-[11px] shrink-0">
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed text-zinc-200">
        {renderMessageWithLinks(message.message)}
      </p>
    </div>
  );
}
