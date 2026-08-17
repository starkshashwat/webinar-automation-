'use client';

import { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/admin-header';
import { createClient } from '@/lib/supabase/client';
import { 
  Bot, 
  Activity, 
  CheckCircle2, 
  EyeOff, 
  Lock, 
  AlertTriangle, 
  RefreshCw, 
  Power, 
  PowerOff,
  Radio
} from 'lucide-react';
import { type AIInteraction } from '@/types/ai';

export default function LiveAIOperatorMonitorPage() {
  const [interactions, setInteractions] = useState<AIInteraction[]>([]);
  const [stats, setStats] = useState({
    total_messages: 0,
    answered: 0,
    ignored: 0,
    failed: 0,
    private_responses: 0,
    public_responses: 0,
  });
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const supabase = createClient();

  const fetchMetricsAndFeed = async () => {
    try {
      const [intRes, setRes] = useState_requests();
      const [intData, setData] = await Promise.all([intRes, setRes]);
      
      if (intData.interactions) setInteractions(intData.interactions);
      if (intData.stats) setStats(intData.stats);
      if (setData.settings) setGlobalEnabled(setData.settings.is_enabled_globally !== false);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const useState_requests = () => {
    return [
      fetch('/api/ai/interactions?limit=50').then((r) => r.json()),
      fetch('/api/ai/settings').then((r) => r.json()),
    ];
  };

  useEffect(() => {
    fetchMetricsAndFeed();

    // Setup Supabase Realtime for live incoming AI decisions
    const channel = supabase
      .channel('ai-interactions-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_interactions',
        },
        (payload) => {
          const newInteraction = payload.new as AIInteraction;
          setInteractions((prev) => [newInteraction, ...prev]);

          // Update real-time stats
          setStats((prev) => ({
            ...prev,
            total_messages: prev.total_messages + 1,
            answered: newInteraction.status === 'processed' ? prev.answered + 1 : prev.answered,
            ignored: newInteraction.status === 'ignored' ? prev.ignored + 1 : prev.ignored,
            failed: newInteraction.status === 'failed' ? prev.failed + 1 : prev.failed,
            private_responses: newInteraction.response_mode === 'private' ? prev.private_responses + 1 : prev.private_responses,
            public_responses: newInteraction.response_mode === 'public' ? prev.public_responses + 1 : prev.public_responses,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const toggleGlobalAI = async () => {
    setToggling(true);
    const newState = !globalEnabled;
    try {
      await fetch('/api/ai/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ global: true, ai_enabled: newState }),
      });
      setGlobalEnabled(newState);
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C] text-zinc-100">
      <AdminHeader />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-6 h-6 text-purple-400" />
                  Live AI Operator Monitor
                </h2>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-purple-400" />
                  REALTIME
                </div>
              </div>
              <p className="text-zinc-400 text-sm mt-0.5">
                Real-time audit log of attendee inquiries, AI intent classification, and whisper replies
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchMetricsAndFeed}
                className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
                title="Refresh Metrics"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                onClick={toggleGlobalAI}
                disabled={toggling}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  globalEnabled
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700'
                }`}
              >
                {globalEnabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                {globalEnabled ? 'AI OPERATOR: ACTIVE' : 'AI OPERATOR: DISABLED'}
              </button>
            </div>
          </div>

          {/* Metrics Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
              <div className="text-xs font-semibold text-zinc-400 mb-1 flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-400" />
                Messages Processed
              </div>
              <div className="text-3xl font-bold text-white">{stats.total_messages}</div>
            </div>

            <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
              <div className="text-xs font-semibold text-zinc-400 mb-1 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Questions Answered
              </div>
              <div className="text-3xl font-bold text-emerald-400">{stats.answered}</div>
              <div className="text-[11px] text-zinc-500 mt-1">{stats.public_responses} Public Broadcasts</div>
            </div>

            <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
              <div className="text-xs font-semibold text-zinc-400 mb-1 flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-amber-400" />
                Ignored (Greetings/Emojis)
              </div>
              <div className="text-3xl font-bold text-amber-400">{stats.ignored}</div>
              <div className="text-[11px] text-zinc-500 mt-1">Noise pre-filtered</div>
            </div>

            <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
              <div className="text-xs font-semibold text-zinc-400 mb-1 flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-400" />
                Private Whispers
              </div>
              <div className="text-3xl font-bold text-purple-400">{stats.private_responses}</div>
              <div className="text-[11px] text-zinc-500 mt-1">Account & payment support</div>
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="bg-[#121419] border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm tracking-wide flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                Live AI Operator Stream
              </h3>
              <span className="text-xs text-zinc-500">Showing latest {interactions.length} interactions</span>
            </div>

            <div className="divide-y divide-zinc-800/60 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-12 text-center text-zinc-500">Connecting to live feed...</div>
              ) : interactions.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 space-y-2">
                  <Bot className="w-8 h-8 mx-auto text-zinc-600" />
                  <p className="text-sm">No AI interactions recorded yet.</p>
                  <p className="text-xs text-zinc-600">Messages sent by attendees in live webinars will appear here in real time.</p>
                </div>
              ) : (
                interactions.map((item) => (
                  <div key={item.id} className="p-5 hover:bg-white/[0.01] transition-colors space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{item.attendee_name || 'Attendee'}</span>
                        <span className="text-zinc-500">•</span>
                        <span className="text-zinc-400 font-mono">
                          {new Date(item.created_at).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.response_mode && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              item.response_mode === 'private'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : item.response_mode === 'public'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-zinc-800 text-zinc-500'
                            }`}
                          >
                            {item.response_mode === 'private' && '🔒 '}
                            {item.response_mode}
                          </span>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'processed'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : item.status === 'ignored'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Attendee Input */}
                    <div className="bg-black/50 p-3 rounded-xl border border-zinc-800/80 text-sm text-zinc-200">
                      <span className="text-xs text-zinc-500 font-medium block mb-1">Attendee Question:</span>
                      "{item.attendee_message}"
                    </div>

                    {/* AI Decision & Response */}
                    {item.response ? (
                      <div className="bg-purple-950/20 border border-purple-500/20 p-3 rounded-xl text-sm text-purple-200 space-y-1">
                        <div className="flex items-center justify-between text-xs text-purple-400 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5" />
                            AI Response ({item.confidence} Confidence)
                          </span>
                          {item.intent && <span className="font-mono text-[10px] uppercase">Intent: {item.intent}</span>}
                        </div>
                        <p className="leading-relaxed text-zinc-200">{item.response}</p>
                      </div>
                    ) : item.status === 'ignored' ? (
                      <div className="text-xs text-zinc-500 italic pl-1 flex items-center gap-1.5">
                        <EyeOff className="w-3 h-3 text-amber-400/60" />
                        Classified as noise/greeting — skipped to prevent chat pollution.
                      </div>
                    ) : item.error_message ? (
                      <div className="text-xs text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20 flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Error: {item.error_message}</span>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
