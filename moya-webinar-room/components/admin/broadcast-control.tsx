'use client';

import { useState, useEffect } from 'react';
import { type Webinar, type WebinarSession } from '@/types/webinar';
import { createClient } from '@/lib/supabase/client';
import { 
  Rocket, 
  Send, 
  Clock, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export function BroadcastControl({
  webinar,
  session,
}: {
  webinar: Webinar;
  session: WebinarSession | null;
}) {
  const supabase = createClient();
  const [broadcasting, setBroadcasting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ctaCount, setCtaCount] = useState<number>(0);
  const [lastCtaTime, setLastCtaTime] = useState<Date | null>(null);
  const [lastCtaSnippet, setLastCtaSnippet] = useState<string | null>(null);
  const [customAngle, setCustomAngle] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [nextBroadcastTime, setNextBroadcastTime] = useState<string>('');

  const isLive = (webinar.status === 'LIVE' || webinar.status === 'live') && (session?.status === 'LIVE' || session?.status === 'live' || !session);
  const isPitchEnabled = webinar.course_pitch_enabled;
  const pitchDelayMins = webinar.course_pitch_delay_minutes || 0;
  const pitchDelaySecs = webinar.course_pitch_delay_seconds || 0;
  const batchSize = webinar.ai_cta_broadcast_batch_size || 1;
  const intervalMins = webinar.ai_cta_broadcast_interval_minutes || 5;
  const maxCount = webinar.ai_cta_broadcast_max_count || 3;
  const endCondition = webinar.ai_cta_broadcast_end_condition || 'MAX_COUNT';

  // Resolve target course URL
  let resolvedUrl = webinar.course_url?.trim() || '';
  if (!resolvedUrl && webinar.ai_cta_broadcast_prompt) {
    const match = webinar.ai_cta_broadcast_prompt.match(/(https?:\/\/[^\s]+)/i);
    if (match) resolvedUrl = match[0].replace(/[),.;]+$/, '');
  }

  // Fetch current session's CTA messages
  const fetchCtaStats = async () => {
    if (!session?.id) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', session.id)
      .eq('message_type', 'CTA')
      .order('created_at', { ascending: false });

    if (data) {
      setCtaCount(data.length);
      if (data.length > 0) {
        setLastCtaTime(new Date(data[0].created_at));
        setLastCtaSnippet(data[0].message);
      }
    }
  };

  useEffect(() => {
    fetchCtaStats();

    if (!session?.id) return;
    const channel = supabase
      .channel(`broadcast-stats-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${session.id}`,
        },
        (payload: any) => {
          if (payload.new?.message_type === 'CTA') {
            fetchCtaStats();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  // Real-time timers calculation
  useEffect(() => {
    const updateTimers = () => {
      const isActuallyLive = (webinar.status === 'LIVE' || webinar.status === 'live');
      if (!isActuallyLive) {
        setTimeRemaining('Stream not live');
        setNextBroadcastTime('Waiting for stream start');
        return;
      }

      const effectiveStart = webinar.actual_start_at
        ? new Date(webinar.actual_start_at).getTime()
        : webinar.scheduled_start
        ? new Date(webinar.scheduled_start).getTime()
        : session?.started_at
        ? new Date(session.started_at).getTime()
        : webinar.started_at
        ? new Date(webinar.started_at).getTime()
        : Date.now();

      const unlockTime = effectiveStart + (pitchDelayMins * 60000) + (pitchDelaySecs * 1000);
      const now = Date.now();

      if (now < unlockTime) {
        const diffSecs = Math.max(0, Math.floor((unlockTime - now) / 1000));
        const mins = Math.floor(diffSecs / 60);
        const secs = diffSecs % 60;
        setTimeRemaining(`Unlocks in ${mins}m ${secs < 10 ? '0' : ''}${secs}s`);
        setNextBroadcastTime(`Starts at pitch unlock`);
      } else {
        setTimeRemaining('Unlocked & Active');
        
        if (endCondition === 'MAX_COUNT' && ctaCount >= maxCount) {
          setNextBroadcastTime('Max limit reached');
        } else if (lastCtaTime) {
          const nextRun = lastCtaTime.getTime() + intervalMins * 60000;
          const diffSecs = Math.floor((nextRun - now) / 1000);
          if (diffSecs <= 0) {
            setNextBroadcastTime('Next broadcast due now');
          } else {
            const mins = Math.floor(diffSecs / 60);
            const secs = diffSecs % 60;
            setNextBroadcastTime(`Next in ${mins}m ${secs < 10 ? '0' : ''}${secs}s`);
          }
        } else {
          setNextBroadcastTime('1st broadcast due now');
        }
      }
    };

    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [webinar.status, webinar.scheduled_start, webinar.started_at, session?.started_at, pitchDelayMins, pitchDelaySecs, lastCtaTime, ctaCount, maxCount, intervalMins, endCondition]);

  const handleManualBroadcast = async () => {
    setBroadcasting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/ai/broadcast/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webinar_id: webinar.id,
          instruction: customAngle.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to trigger broadcast');
      }

      setSuccessMessage('AI CTA broadcast message sent to live chat!');
      setCustomAngle('');
      fetchCtaStats();

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error triggering broadcast');
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="bg-[#121419] p-5 rounded-2xl border border-zinc-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white tracking-wide text-sm">AI CTA BROADCAST CONTROLLER</h3>
              <p className="text-xs text-zinc-400 font-medium">Automated & Manual Course Pitch Engine</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0">
            {!isPitchEnabled ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                Disabled
              </span>
            ) : !isLive ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                Waiting for Stream
              </span>
            ) : timeRemaining.includes('Unlocks in') ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Clock className="w-3 h-3 animate-pulse" />
                {timeRemaining}
              </span>
            ) : endCondition === 'MAX_COUNT' && ctaCount >= maxCount ? (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Completed ({ctaCount}/{maxCount})
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Pitch Active {endCondition === 'WEBINAR_END' ? '(Continuous)' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          <div className="bg-black/40 p-2.5 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-medium uppercase block">Total Sent</span>
            <span className="text-base font-bold text-white font-mono">
              {ctaCount}{' '}
              <span className="text-xs font-normal text-zinc-400">
                {endCondition === 'WEBINAR_END' ? '(Until webinar ends)' : `/ ${maxCount}`}
              </span>
            </span>
          </div>

          <div className="bg-black/40 p-2.5 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-medium uppercase block">Batch Size</span>
            <span className="text-base font-bold text-purple-400 font-mono">
              {batchSize} <span className="text-xs font-normal text-zinc-500">{batchSize === 1 ? 'msg' : 'msgs'}</span>
            </span>
          </div>

          <div className="bg-black/40 p-2.5 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-medium uppercase block">Interval Delay</span>
            <span className="text-base font-bold text-cyan-400 font-mono">
              {intervalMins} <span className="text-xs font-normal text-zinc-500">min</span>
            </span>
          </div>

          <div className="bg-black/40 p-2.5 rounded-xl border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 font-medium uppercase block">Next Wave</span>
            <span className="text-xs font-semibold text-zinc-300 block truncate mt-0.5">
              {nextBroadcastTime || 'Standby'}
            </span>
          </div>
        </div>

        {/* Target URL Display */}
        <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-3 mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider block">
              Active Payment / CTA Link
            </span>
            <span className="text-xs text-white font-mono truncate block hover:underline">
              {resolvedUrl || '(No URL set - using default checkout)'}
            </span>
          </div>
          {resolvedUrl && (
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors shrink-0"
              title="Open payment link"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Advanced Angle Input Toggle */}
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-medium transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showAdvanced ? 'Hide Custom Angle' : 'Custom One-Time Angle / Message Override'}
          </button>

          {showAdvanced && (
            <div className="mt-2 space-y-1.5">
              <input
                type="text"
                placeholder="e.g. Focus on the 5-minute flash discount and student case studies"
                value={customAngle}
                onChange={(e) => setCustomAngle(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Manual Broadcast Action Button */}
      <div className="pt-2">
        <button
          onClick={handleManualBroadcast}
          disabled={broadcasting || !isLive}
          className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {broadcasting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating & Broadcasting CTA...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              BROADCAST CTA NOW (1-CLICK)
            </>
          )}
        </button>
        {!isLive && (
          <p className="text-[10px] text-zinc-500 text-center mt-1.5">
            Start the webinar stream above to enable live broadcasting.
          </p>
        )}
      </div>
    </div>
  );
}
