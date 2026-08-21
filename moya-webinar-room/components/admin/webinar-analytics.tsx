'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Users, Clock, MousePointerClick, Download, BarChart3, ArrowLeft, History } from 'lucide-react';
import Link from 'next/link';
import { AttendeeJourneyModal } from './attendee-journey-modal';

export function WebinarAnalytics({ webinar, session }: { webinar: any; session: any }) {
  const [loading, setLoading] = useState(true);
  const [selectedAttendee, setSelectedAttendee] = useState<{ email?: string; phone?: string; name?: string } | null>(null);
  const [metrics, setMetrics] = useState({
    totalRegistrations: 0,
    totalAttendees: 0,
    avgWatchTimeSeconds: 0,
    totalCtaClicks: 0
  });
  const [attendees, setAttendees] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      // 1. Fetch Registrations
      const { data: regs } = await supabase
        .from('webinar_registrations')
        .select('*')
        .eq('webinar_id', webinar.id);

      const registrations = regs || [];

      // 2. Fetch Attendance Sessions (if session is available, we use that, but to be safe we fetch all for this webinar's registrations)
      const regIds = registrations.map(r => r.id);
      
      let attSessions: any[] = [];
      if (regIds.length > 0) {
        const { data } = await supabase
          .from('attendance_sessions')
          .select('*')
          .in('registration_id', regIds);
        attSessions = data || [];
      }

      // 3. Fetch Conversions
      let conversions: any[] = [];
      if (regIds.length > 0) {
        const { data } = await supabase
          .from('webinar_conversions')
          .select('*')
          .in('registration_id', regIds);
        conversions = data || [];
      }

      // Calculate Metrics
      const totalRegistrations = registrations.length;
      
      const uniqueAttendees = new Set(attSessions.map(s => s.registration_id));
      const totalAttendees = uniqueAttendees.size;

      const totalWatchTime = attSessions.reduce((sum, s) => sum + (s.watch_time_seconds || 0), 0);
      const avgWatchTimeSeconds = totalAttendees > 0 ? totalWatchTime / totalAttendees : 0;

      const ctaClicks = conversions.filter(c => c.event_type === 'CTA_CLICK');
      const totalCtaClicks = ctaClicks.length;

      setMetrics({
        totalRegistrations,
        totalAttendees,
        avgWatchTimeSeconds,
        totalCtaClicks
      });

      // Build Attendee Table Data
      const tableData = registrations.map(reg => {
        const mySessions = attSessions.filter(s => s.registration_id === reg.id);
        const myConversions = conversions.filter(c => c.registration_id === reg.id);
        
        const watchTime = mySessions.reduce((sum, s) => sum + (s.watch_time_seconds || 0), 0);
        const clicks = myConversions.filter(c => c.event_type === 'CTA_CLICK').length;
        const joinTime = mySessions.length > 0 ? new Date(Math.min(...mySessions.map(s => new Date(s.joined_at).getTime()))) : null;

        return {
          ...reg,
          watchTime,
          clicks,
          joinTime
        };
      }).sort((a, b) => b.watchTime - a.watchTime);

      setAttendees(tableData);
      setLoading(false);
    }

    loadData();
  }, [webinar.id, supabase]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mb-4"></div>
        <div className="text-zinc-500">Generating analytics report...</div>
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/webinars"
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-white">{webinar.title}</h2>
                <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md text-xs font-bold uppercase">Ended</span>
              </div>
              <p className="text-zinc-400 text-sm">Post-Webinar Performance Analytics</p>
            </div>
          </div>
          
          <button className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors text-sm">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-zinc-400 font-medium text-sm">Total Registered</h3>
            </div>
            <div className="text-3xl font-bold text-white">{metrics.totalRegistrations}</div>
          </div>

          <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-zinc-400 font-medium text-sm">Total Attendees</h3>
            </div>
            <div className="text-3xl font-bold text-white">
              {metrics.totalAttendees} 
              <span className="text-sm font-medium text-zinc-500 ml-2">
                ({metrics.totalRegistrations > 0 ? Math.round((metrics.totalAttendees / metrics.totalRegistrations) * 100) : 0}% show rate)
              </span>
            </div>
          </div>

          <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-zinc-400 font-medium text-sm">Avg Watch Time</h3>
            </div>
            <div className="text-3xl font-bold text-white">{formatTime(metrics.avgWatchTimeSeconds)}</div>
          </div>

          <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <MousePointerClick className="w-5 h-5" />
              </div>
              <h3 className="text-zinc-400 font-medium text-sm">Total CTA Clicks</h3>
            </div>
            <div className="text-3xl font-bold text-white">{metrics.totalCtaClicks}</div>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-[#121419] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-white">Attendee Breakdown</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Attendee</th>
                  <th className="p-4 font-semibold">Contact</th>
                  <th className="p-4 font-semibold">Joined At</th>
                  <th className="p-4 font-semibold">Watch Time</th>
                  <th className="p-4 font-semibold text-right">Actions Taken</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 text-sm">
                {attendees.map((attendee) => (
                  <tr key={attendee.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-white">{attendee.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">ID: {attendee.id.split('-')[0]}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-zinc-300">{attendee.email || '-'}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{attendee.phone || ''}</div>
                    </td>
                    <td className="p-4 text-zinc-300">
                      {attendee.joinTime ? attendee.joinTime.toLocaleString([], { hour: '2-digit', minute:'2-digit' }) : <span className="text-zinc-600">Did not join</span>}
                    </td>
                    <td className="p-4">
                      {attendee.watchTime > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {formatTime(attendee.watchTime)}
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      {attendee.clicks > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <MousePointerClick className="w-3.5 h-3.5" />
                          {attendee.clicks} Click{attendee.clicks > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-zinc-600 mr-2">-</span>
                      )}

                      <button
                        onClick={() => setSelectedAttendee({
                          email: attendee.email,
                          phone: attendee.phone,
                          name: attendee.name
                        })}
                        className="p-1.5 bg-zinc-800/80 hover:bg-purple-900/30 text-zinc-400 hover:text-purple-300 border border-zinc-700/60 hover:border-purple-500/40 rounded-lg text-xs font-medium flex items-center gap-1 transition-all shadow-sm"
                        title="View Cross-Webinar Attendance Timeline"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Timeline</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {attendees.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
                      No registrations found for this webinar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cross-Webinar Attendee Journey Modal */}
        {selectedAttendee && (
          <AttendeeJourneyModal
            email={selectedAttendee.email}
            phone={selectedAttendee.phone}
            initialName={selectedAttendee.name}
            onClose={() => setSelectedAttendee(null)}
          />
        )}

      </div>
    </main>
  );
}
