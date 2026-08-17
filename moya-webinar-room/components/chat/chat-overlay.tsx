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
    <div className="w-full h-full flex flex-col justify-end p-2 lg:p-4 pb-16 lg:pb-20">
      {/* Container max-width and max-height so it doesn't take the whole screen, just a corner or bottom area */}
      <div className="w-full sm:max-w-sm h-[300px] sm:h-[400px] max-h-full">
        <ChatPanel sessionId={sessionId} status={status} isOverlay={true} />
      </div>
    </div>
  );
}
