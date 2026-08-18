'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Users, Clock, PlayCircle, Bot, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/admin-header';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalRegistrations: 0,
    uniqueAttendees: 0,
    totalWatchHours: '0.0',
    aiAnswered: 0,
    aiIgnored: 0,
  });
  const [recentWebinars, setRecentWebinars] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin/login');
        return;
      }

      try {
        const [regCountRes, attendanceRes, webinarsRes, aiRes] = await Promise.all([
          supabase.from('webinar_registrations').select('*', { count: 'exact', head: true }),
          supabase.from('attendance_sessions').select('watch_time_seconds, registration_id'),
          supabase.from('webinars').select('id, title, status, scheduled_start, ai_enabled').order('created_at', { ascending: false }).limit(5),
          supabase.from('ai_interactions').select('status, response_mode').limit(500),
        ]);

        const totalRegistrations = regCountRes.count || 0;
        const attendance = attendanceRes.data || [];
        const uniqueAttendees = new Set(attendance.map(a => a.registration_id)).size;
        const totalWatchTimeSeconds = attendance.reduce((acc, curr) => acc + (curr.watch_time_seconds || 0), 0);
        const totalWatchHours = (totalWatchTimeSeconds / 3600).toFixed(1);

        const aiStats = aiRes.data || [];
        const aiAnswered = aiStats.filter(s => s.status === 'processed').length;
        const aiIgnored = aiStats.filter(s => s.status === 'ignored').length;

        setMetrics({
          totalRegistrations,
          uniqueAttendees,
          totalWatchHours,
          aiAnswered,
          aiIgnored,
        });
        setRecentWebinars(webinarsRes.data || []);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C] text-zinc-100">
      <AdminHeader />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Webinar Control Center</h2>
            <p className="text-zinc-400 text-sm">Real-time status, audience engagement, and AI operator health</p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center gap-3 mb-2 text-zinc-400">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="font-semibold text-sm">Total Registrations</span>
              </div>
              <div className="text-3xl font-bold text-white">{loading ? '...' : metrics.totalRegistrations}</div>
            </div>
            
            <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center gap-3 mb-2 text-zinc-400">
                <PlayCircle className="w-5 h-5 text-indigo-500" />
                <span className="font-semibold text-sm">Unique Attendees</span>
              </div>
              <div className="text-3xl font-bold text-white">{loading ? '...' : metrics.uniqueAttendees}</div>
            </div>

            <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center gap-3 mb-2 text-zinc-400">
                <Clock className="w-5 h-5 text-emerald-500" />
                <span className="font-semibold text-sm">Total Watch Time</span>
              </div>
              <div className="text-3xl font-bold text-white">{loading ? '...' : `${metrics.totalWatchHours}h`}</div>
            </div>

            <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
              <div className="flex items-center gap-3 mb-2 text-zinc-400">
                <Bot className="w-5 h-5 text-purple-500" />
                <span className="font-semibold text-sm">AI Questions Answered</span>
              </div>
              <div className="text-3xl font-bold text-white">{loading ? '...' : metrics.aiAnswered}</div>
              <div className="text-xs text-zinc-500 mt-1">{metrics.aiIgnored} greetings/emojis ignored</div>
            </div>
          </div>

          {/* Quick Actions & Recent Webinars */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#121419] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  Recent Webinars
                </h3>
                <Link href="/admin/webinars" className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="divide-y divide-zinc-800/50">
                {recentWebinars.map((w) => (
                  <div key={w.id} className="py-3.5 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-white text-sm">{w.title}</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {w.scheduled_start ? new Date(w.scheduled_start).toLocaleString() : 'Not scheduled'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        w.status === 'LIVE' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        w.status === 'ENDED' ? 'bg-zinc-800 text-zinc-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {w.status}
                      </span>
                      <Link
                        href={`/admin/webinars/${w.id}`}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Host Room
                      </Link>
                    </div>
                  </div>
                ))}
                {!recentWebinars.length && !loading && (
                  <p className="text-sm text-zinc-500 py-6 text-center">No webinars created yet.</p>
                )}
              </div>
            </div>

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
