'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Settings, Eye, Bot, Copy, Check, BarChart3 } from 'lucide-react';
import Link from 'next/link';

function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/webinar/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      <Link
        href={`/webinar/${slug}`}
        target="_blank"
        className="px-2.5 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
        title="Open Attendee Room"
      >
        <Eye className="w-3.5 h-3.5" />
        Room
      </Link>
      <div className="w-px h-4 bg-zinc-800" />
      <button
        onClick={handleCopy}
        className="px-2.5 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center gap-1.5 text-xs font-medium"
        title="Copy Link"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        Copy Link
      </button>
    </div>
  );
}

export function WebinarList({ initialWebinars }: { initialWebinars: any[] }) {
  const [webinars, setWebinars] = useState(initialWebinars);
  const supabase = createClient();

  // Periodic scheduler ping to automatically detect time-expired webinars
  useEffect(() => {
    const runSchedulerSync = () => {
      fetch('/api/cron/webinar-scheduler', { method: 'POST' }).catch(() => {});
    };

    runSchedulerSync();
    const interval = setInterval(runSchedulerSync, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('webinars-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'webinars' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setWebinars((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setWebinars((prev) =>
              prev.map((w) => (w.id === payload.new.id ? { ...w, ...payload.new } : w))
            );
          } else if (payload.eventType === 'DELETE') {
            setWebinars((prev) => prev.filter((w) => w.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (!webinars?.length) {
    return (
      <div className="p-8 text-center text-zinc-500">
        No webinars found. Click "Create Webinar" above to schedule your first session.
      </div>
    );
  }

  return (
    <div className="bg-[#121419] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Webinar</th>
              <th className="p-4 font-semibold">Schedule</th>
              <th className="p-4 font-semibold">Type</th>
              <th className="p-4 font-semibold">AI Operator</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-sm">
            {webinars.map((w) => {
              const isEnded = (() => {
                const dbStatus = (w.status || '').toUpperCase();
                if (dbStatus === 'ENDED') return true;
                if (w.schedule_type !== 'daily' && w.scheduled_start) {
                  const durationMins = w.recording_duration || w.duration_minutes || 60;
                  const durationMs = durationMins * 60 * 1000;
                  const startTime = new Date(w.scheduled_start).getTime();
                  if (Date.now() >= startTime + durationMs) {
                    return true;
                  }
                }
                return false;
              })();

              const isLive = !isEnded && (w.status || '').toUpperCase() === 'LIVE';
              const displayStatus = isEnded ? 'ENDED' : w.status;
              
              return (
                <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-white">{w.title}</div>
                    <div className="text-xs text-zinc-500 font-mono mt-0.5">/webinar/{w.slug}</div>
                  </td>
                  <td className="p-4 text-zinc-300">
                    {w.schedule_type === 'daily' ? (
                      <span className="text-purple-400 font-medium">
                        Daily at {w.daily_start_time || '11:00 AM'}
                      </span>
                    ) : w.scheduled_start ? (
                      new Date(w.scheduled_start).toLocaleString()
                    ) : (
                      <span className="text-zinc-500">Not scheduled</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-300">
                      {w.schedule_type === 'daily' ? 'Daily' : 'One Time'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      w.ai_enabled !== false 
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                        : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      <Bot className="w-3.5 h-3.5" />
                      {w.ai_enabled !== false ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      isLive 
                        ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                        : isEnded
                        ? 'bg-zinc-800 text-zinc-400' 
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                      {displayStatus}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2 flex items-center justify-end">
                    {isEnded ? (
                      <Link
                        href={`/admin/webinars/${w.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-colors"
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        Analytics
                      </Link>
                    ) : (
                      <>
                        <CopyLinkButton slug={w.slug} />
                        <Link
                          href={`/admin/webinars/${w.id}/edit`}
                          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Edit
                        </Link>
                        <Link
                          href={`/admin/webinars/${w.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
                        >
                          Host Dashboard
                        </Link>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
