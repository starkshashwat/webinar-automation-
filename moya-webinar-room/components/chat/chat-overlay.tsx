'use client';

import { ChatPanel } from './chat-panel';

export function ChatOverlay({
  sessionId,
  status
}: {
  sessionId: string;
  status: 'WAITING' | 'LIVE' | 'ENDED';
}) {
  return (
    <div className="w-full h-full flex flex-col justify-end p-2 sm:p-4 pb-14 sm:pb-16 pointer-events-none">
      {/* Container max-width and max-height with crisp glass styling */}
      <div className="w-full max-w-[380px] sm:max-w-[450px] h-[340px] sm:h-[420px] max-h-full pointer-events-auto flex flex-col">
        <ChatPanel sessionId={sessionId} status={status} isOverlay={true} />
      </div>
    </div>
  );
}
