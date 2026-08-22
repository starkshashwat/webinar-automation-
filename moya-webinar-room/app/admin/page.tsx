'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Users, Clock, PlayCircle, Bot, Calendar, ArrowRight, Filter, Repeat, Radio } from 'lucide-react';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/admin-header';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Raw Data State
  const [allWebinars, setAllWebinars] = useState<any[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<any[]>([]);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [allAiInteractions, setAllAiInteractions] = useState<any[]>([]);

  // Filter State: 'all' | 'daily' | webinar_id
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin/login');
        return;
      }

      try {
        const [webinarsRes, regsRes, attendanceRes, aiRes] = await Promise.all([
          supabase
            .from('webinars')
            .select('id, title, status, scheduled_start, schedule_type, daily_start_time, duration_minutes, created_at')
            .order('created_at', { ascending: false }),
          supabase
            .from('webinar_registrations')
            .select('id, webinar_id, name, email, phone, created_at'),
          supabase
            .from('attendance_sessions')
            .select('id, registration_id, session_id, watch_time_seconds, joined_at'),
          supabase
            .from('ai_interactions')
            .select('id, webinar_id, status, response_mode')
            .limit(1000),
        ]);

        setAllWebinars(webinarsRes.data || []);
        setAllRegistrations(regsRes.data || []);
        setAllAttendance(attendanceRes.data || []);
        setAllAiInteractions(aiRes.data || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  // Computed Filtered Metrics
  const {
    filteredWebinars,
    totalRegistrations,
    uniqueLeadCount,
    uniqueAttendeeCount,
    totalWatchHours,
    avgWatchMinutes,
    aiAnswered,
    aiIgnored
  } = useMemo(() => {
    // 1. Filter Webinars
    let filteredW = allWebinars;
    if (selectedFilter === 'daily') {
      filteredW = allWebinars.filter(w => w.schedule_type === 'daily');
    } else if (selectedFilter !== 'all') {
      filteredW = allWebinars.filter(w => w.id === selectedFilter);
    }

    const filteredWebinarIds = new Set(filteredW.map(w => w.id));

    // 2. Filter Registrations
    const filteredRegs = allRegistrations.filter(r => filteredWebinarIds.has(r.webinar_id));
    const filteredRegIds = new Set(filteredRegs.map(r => r.id));
    const regMap = new Map<string, any>(filteredRegs.map(r => [r.id, r]));

    // Deduplicate unique leads across registrations (by clean 10-digit phone or email)
    const uniqueLeadKeys = new Set<string>();
    filteredRegs.forEach(r => {
      const cleanPhone = r.phone ? r.phone.replace(/[^0-9]/g, '').slice(-10) : null;
      const cleanEmail = r.email ? r.email.trim().toLowerCase() : null;
      const key = cleanPhone || cleanEmail || r.id;
      uniqueLeadKeys.add(key);
    });

    // 3. Filter Attendance & Compute Unique Viewers
    const filteredAtt = allAttendance.filter(a => filteredRegIds.has(a.registration_id));
    const uniqueViewerKeys = new Set<string>();
    let totalWatchSecs = 0;

    filteredAtt.forEach(a => {
      totalWatchSecs += (a.watch_time_seconds || 0);
      const reg = regMap.get(a.registration_id);
      if (reg) {
        const cleanPhone = reg.phone ? reg.phone.replace(/[^0-9]/g, '').slice(-10) : null;
        const cleanEmail = reg.email ? reg.email.trim().toLowerCase() : null;
        const key = cleanPhone || cleanEmail || reg.id;
        uniqueViewerKeys.add(key);
      } else {
        uniqueViewerKeys.add(a.registration_id);
      }
    });

    const uniqueAttendeeCount = uniqueViewerKeys.size;
    const totalWatchHours = (totalWatchSecs / 3600).toFixed(1);
    const avgWatchMinutes = uniqueAttendeeCount > 0 ? Math.round((totalWatchSecs / uniqueAttendeeCount) / 60) : 0;

    // 4. Filter AI stats
    const filteredAi = selectedFilter === 'all'
      ? allAiInteractions
      : allAiInteractions.filter(i => filteredWebinarIds.has(i.webinar_id));

    const aiAnswered = filteredAi.filter(s => s.status === 'processed').length;
    const aiIgnored = filteredAi.filter(s => s.status === 'ignored').length;

    return {
      filteredWebinars: filteredW,
      totalRegistrations: filteredRegs.length,
      uniqueLeadCount: uniqueLeadKeys.size,
      uniqueAttendeeCount,
      totalWatchHours,
      avgWatchMinutes,
      aiAnswered,
      aiIgnored
    };
  }, [allWebinars, allRegistrations, allAttendance, allAiInteractions, selectedFilter]);

  // Pre-calculate per-webinar registration and attendance counts for the list
  const webinarStatsMap = useMemo(() => {
    const map = new Map<string, { regs: number; attendees: number }>();
    allWebinars.forEach(w => {
      const wRegs = allRegistrations.filter(r => r.webinar_id === w.id);
      const wRegIds = new Set(wRegs.map(r => r.id));
      const wAtt = allAttendance.filter(a => wRegIds.has(a.registration_id));
      const uniqueAtt = new Set(wAtt.map(a => a.registration_id)).size;
      map.set(w.id, { regs: wRegs.length, attendees: uniqueAtt });
    });
    return map;
  }, [allWebinars, allRegistrations, allAttendance]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C] text-zinc-100">
      <AdminHeader />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header & Interactive Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#121419] p-5 rounded-2xl border border-zinc-800 shadow-xl">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Webinar Control Center</h2>
              <p className="text-zinc-400 text-sm">Real-time status, audience engagement, and automation health</p>
            </div>

            {/* Filter Selector */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <Filter className="w-4 h-4 text-blue-400" />
                <span>Filter:</span>
              </div>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="bg-black/60 border border-zinc-700/80 hover:border-zinc-600 text-white text-xs font-medium rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-inner"
              >
                <option value="all">🌐 All Webinars (Combined Overview)</option>
                <option value="daily">🔄 Daily Recurring Webinars Only</option>
                <optgroup label="Specific Webinars">
                  {allWebinars.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.schedule_type === 'daily' ? '🔄 [Daily]' : '📅 [One-Time]'} {w.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Registrations Card with Unique Leads Subtext */}
            <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Users className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold text-sm">Total Registrations</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {uniqueLeadCount} Unique
                </span>
              </div>
              <div className="text-3xl font-bold text-white">{loading ? '...' : totalRegistrations}</div>
              <div className="text-xs text-zinc-400 mt-1">
                {uniqueLeadCount} unique contact{uniqueLeadCount === 1 ? '' : 's'} registered
              </div>
            </div>
            
            {/* Unique Attendees Card */}
            <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-zinc-400">
                  <PlayCircle className="w-5 h-5 text-indigo-500" />
                  <span className="font-semibold text-sm">Unique Attendees</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {totalRegistrations > 0 ? Math.round((uniqueAttendeeCount / totalRegistrations) * 100) : 0}% Show
                </span>
              </div>
              <div className="text-3xl font-bold text-white">{loading ? '...' : uniqueAttendeeCount}</div>
              <div className="text-xs text-zinc-400 mt-1">
                Distinct live stream viewers
              </div>
            </div>

            {/* Total Watch Time Card */}
            <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Clock className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold text-sm">Total Watch Time</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ~{avgWatchMinutes}m avg
                </span>
              </div>
              <div className="text-3xl font-bold text-white">{loading ? '...' : `${totalWatchHours}h`}</div>
              <div className="text-xs text-zinc-400 mt-1">
                Average {avgWatchMinutes} mins per attendee
              </div>
            </div>

            {/* AI Operator Card */}
            <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Bot className="w-5 h-5 text-purple-500" />
                  <span className="font-semibold text-sm">AI Answered</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Active
                </span>
              </div>
              <div className="text-3xl font-bold text-white">{loading ? '...' : aiAnswered}</div>
              <div className="text-xs text-zinc-500 mt-1">{aiIgnored} greetings/emojis ignored</div>
            </div>
          </div>

          {/* Filtered Webinars Overview & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#121419] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span>
                    {selectedFilter === 'all' ? 'All Webinars' : selectedFilter === 'daily' ? 'Daily Automation Webinars' : 'Selected Webinar'}
                  </span>
                  <span className="text-xs text-zinc-500 font-normal">({filteredWebinars.length})</span>
                </h3>
                <Link href="/admin/webinars" className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  View Full List <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="divide-y divide-zinc-800/50">
                {filteredWebinars.map((w) => {
                  const stats = webinarStatsMap.get(w.id) || { regs: 0, attendees: 0 };
                  const isDaily = w.schedule_type === 'daily';

                  return (
                    <div key={w.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.01] transition-colors rounded-xl px-2 -mx-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-white text-sm">{w.title}</h4>
                          {isDaily ? (
                            <span className="inline-flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <Repeat className="w-3 h-3" /> Daily at {w.daily_start_time || '10:00'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-medium px-2 py-0.5 rounded-full">
                              One-Time
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-400">
                          <span>
                            {w.scheduled_start ? new Date(w.scheduled_start).toLocaleString() : 'Not scheduled'}
                          </span>
                          <span>•</span>
                          <span className="text-zinc-300 font-medium">
                            {stats.regs} Regs ({stats.attendees} Joined)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          w.status === 'LIVE' ? 'bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1' :
                          w.status === 'ENDED' ? 'bg-zinc-800 text-zinc-400' :
                          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {w.status === 'LIVE' && <Radio className="w-3 h-3 animate-pulse" />}
                          {w.status}
                        </span>

                        <Link
                          href={`/admin/webinars/${w.id}/report`}
                          className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                        >
                          Report
                        </Link>

                        <Link
                          href={`/admin/webinars/${w.id}`}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
                        >
                          Host Studio
                        </Link>
                      </div>
                    </div>
                  );
                })}
                {!filteredWebinars.length && !loading && (
                  <p className="text-sm text-zinc-500 py-8 text-center">No webinars match the selected filter.</p>
                )}
              </div>
            </div>

            {/* AI Operator Shortcuts */}
            <div className="bg-[#121419] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Bot className="w-4 h-4 text-purple-400" />
                AI Operator Controls
              </h3>
              <p className="text-xs text-zinc-400">
                Configure your AI assistant persona, update knowledge base FAQs, and manage approved resource URLs.
              </p>

              <div className="space-y-2.5 pt-2">
                <Link
                  href="/admin/ai/operator"
                  className="w-full flex items-center justify-between p-3 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl text-sm font-medium transition-colors text-zinc-200"
                >
                  <span>Live AI Monitor</span>
                  <ArrowRight className="w-4 h-4 text-zinc-400" />
                </Link>
                <Link
                  href="/admin/ai/settings"
                  className="w-full flex items-center justify-between p-3 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl text-sm font-medium transition-colors text-zinc-200"
                >
                  <span>AI Behavior & Instructions</span>
                  <ArrowRight className="w-4 h-4 text-zinc-400" />
                </Link>
                <Link
                  href="/admin/ai/knowledge"
                  className="w-full flex items-center justify-between p-3 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl text-sm font-medium transition-colors text-zinc-200"
                >
                  <span>Knowledge Base</span>
                  <ArrowRight className="w-4 h-4 text-zinc-400" />
                </Link>
                <Link
                  href="/admin/ai/resources"
                  className="w-full flex items-center justify-between p-3 bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl text-sm font-medium transition-colors text-zinc-200"
                >
                  <span>Approved Resources & URLs</span>
                  <ArrowRight className="w-4 h-4 text-zinc-400" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
