import { type ChatMessage } from '@/types/chat';
import { Bot, Crown, Rocket, Lock } from 'lucide-react';
import { trackCtaClick } from '@/lib/analytics/tracker';

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
          onClick={(e) => {
            e.stopPropagation();
            trackCtaClick();
          }}
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
  isAdmin = false,
  isNew = false,
  onDismissNew
}: { 
  message: ChatMessage;
  isAdmin?: boolean;
  isNew?: boolean;
  onDismissNew?: () => void;
}) {
  const isAI = message.message_type === 'AI';
  const isHost = message.message_type === 'HOST';
  const isCTA = message.message_type === 'CTA';
  const isSystem = message.message_type === 'SYSTEM';
  const isPrivate = Boolean(message.target_attendee_id);

  // Strictly show NEW MESSAGE badge and highlights only in the Host / Admin panel
  const showNewIndicator = isAdmin && isNew;

  const newBadge = showNewIndicator ? (
    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-lg shadow-blue-500/50 uppercase tracking-widest animate-pulse shrink-0">
      ● New message
    </span>
  ) : null;

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
      <div 
        onMouseEnter={onDismissNew}
        onClick={onDismissNew}
        className={`flex flex-col gap-1.5 my-2 bg-[#121124]/95 backdrop-blur-md border-l-4 border-l-indigo-500 border border-indigo-500/40 p-3 rounded-r-xl shadow-xl overflow-hidden transition-all ${
          showNewIndicator ? 'ring-2 ring-indigo-400/80 shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-pulse' : ''
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Rocket className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="font-bold text-sm tracking-wide text-indigo-300">MOYA</span>
          {newBadge}
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
      <div 
        onMouseEnter={onDismissNew}
        onClick={onDismissNew}
        className={`flex flex-col gap-1.5 my-2 p-3 rounded-xl border backdrop-blur-md shadow-xl overflow-hidden transition-all ${
          showPrivateBadge 
            ? 'bg-[#1e102d]/95 border-purple-500/50 text-purple-100' 
            : 'bg-[#0f172a]/95 border-blue-500/40 text-zinc-100'
        } ${showNewIndicator ? 'ring-2 ring-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse' : ''}`}
      >
        <div className="flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1.5 font-bold min-w-0">
            <Bot className={`w-4 h-4 shrink-0 ${showPrivateBadge ? 'text-purple-400' : 'text-blue-400'}`} />
            <span className={`truncate ${showPrivateBadge ? 'text-purple-300' : 'text-blue-300'}`}>
              {message.sender_name || 'MOYA AI'}
            </span>
            {newBadge}
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
      <div 
        onMouseEnter={onDismissNew}
        onClick={onDismissNew}
        className={`flex flex-col gap-1.5 my-2 p-3 rounded-xl border bg-[#1a1408]/95 backdrop-blur-md border-amber-500/60 shadow-xl overflow-hidden transition-all ${
          showNewIndicator ? 'ring-2 ring-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-pulse' : ''
        }`}
      >
        <div className="flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1.5 font-bold text-amber-400 min-w-0">
            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{displayName}</span>
            {newBadge}
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
    <div 
      onMouseEnter={onDismissNew}
      onClick={onDismissNew}
      className={`flex flex-col gap-1 my-1.5 p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 shadow-lg overflow-hidden transition-all ${
        showNewIndicator ? 'ring-2 ring-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse' : ''
      }`}
    >
      <div className="flex items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-zinc-100 truncate">{message.sender_name}</span>
          {newBadge}
        </div>
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
