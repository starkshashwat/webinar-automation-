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
          className="text-blue-400 underline font-semibold hover:text-blue-300 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
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
      <div className="flex justify-center my-2">
        <span className="text-xs text-zinc-500 bg-zinc-800/50 px-3 py-1 rounded-full">
          {message.message}
        </span>
      </div>
    );
  }

  if (isCTA) {
    return (
      <div className="flex flex-col gap-1.5 my-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-l-4 border-l-indigo-500 p-3 rounded-r-xl shadow-sm">
        <div className="flex items-center gap-1.5">
          <Rocket className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-sm tracking-wide text-indigo-400">MOYA</span>
          <span className="text-xs text-zinc-500 ml-auto">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap leading-relaxed text-zinc-200 font-medium">
          {renderMessageWithLinks(message.message)}
        </p>
      </div>
    );
  }

  if (isAI && isAdmin) {
    const showPrivateBadge = isAdmin && isPrivate;
    return (
      <div className={`flex flex-col gap-1.5 my-2 p-3 rounded-xl border ${
        showPrivateBadge 
          ? 'bg-purple-950/20 border-purple-500/30 text-purple-200 shadow-sm' 
          : 'bg-blue-500/5 border-blue-500/20 text-zinc-200'
      }`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-bold">
            <Bot className={`w-4 h-4 ${showPrivateBadge ? 'text-purple-400' : 'text-blue-400'}`} />
            <span className={showPrivateBadge ? 'text-purple-400' : 'text-blue-400'}>
              {message.sender_name || 'MOYA AI'}
            </span>
            {showPrivateBadge && (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                <Lock className="w-2.5 h-2.5" /> Private Reply
              </span>
            )}
          </div>
          <span className="text-zinc-500 font-mono">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap leading-relaxed text-zinc-200">
          {renderMessageWithLinks(message.message)}
        </p>
      </div>
    );
  }

  if (isHost || (isAI && !isAdmin)) {
    const showPrivateBadge = isAdmin && isPrivate;
    const displayName = isHost ? message.sender_name : 'Host';
    return (
      <div className={`flex flex-col gap-1.5 my-2 p-3 rounded-xl border ${
        showPrivateBadge 
          ? 'bg-amber-950/20 border-amber-500/30' 
          : 'bg-amber-500/5 border-amber-500/20'
      }`}>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-amber-400">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>{displayName}</span>
            {showPrivateBadge && (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                <Lock className="w-2.5 h-2.5" /> Private Whisper
              </span>
            )}
          </div>
          <span className="text-zinc-500 font-mono">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap leading-relaxed text-zinc-200">
          {renderMessageWithLinks(message.message)}
        </p>
      </div>
    );
  }



  // ATTENDEE MESSAGE
  return (
    <div className="flex flex-col gap-1 my-2 p-2 rounded-lg hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-200">{message.sender_name}</span>
        <span className="text-zinc-500 font-mono">
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <p className="text-sm whitespace-pre-wrap leading-relaxed text-zinc-300">
        {renderMessageWithLinks(message.message)}
      </p>
    </div>
  );
}
