import { type WebinarStatus } from '@/types/webinar';

export function WebinarStatusIndicator({ status }: { status: WebinarStatus }) {
  if (status === 'LIVE') {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm font-semibold text-red-500 uppercase tracking-wide">Live</span>
      </div>
    );
  }

  if (status === 'WAITING') {
    return (
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
        <span className="text-sm font-medium text-yellow-500 uppercase tracking-wide">Waiting</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="h-2.5 w-2.5 rounded-full bg-gray-500" />
      <span className="text-sm font-medium text-gray-500 uppercase tracking-wide">Ended</span>
    </div>
  );
}
