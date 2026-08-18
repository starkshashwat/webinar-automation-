export const runtime = 'edge';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Rocket, ArrowLeft, Users, Clock, PlayCircle, Filter } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function WebinarReportPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data: webinar } = await supabase
    .from('webinars')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!webinar) {
    return <div>Webinar not found</div>;
  }

  // Analytics queries would go here
  // For V1 MVP we fetch registrations and attendance mapping
  const { data: registrations } = await supabase
    .from('webinar_registrations')
    .select('*')
    .eq('webinar_id', webinar.id);
    
  const { data: attendance } = await supabase
    .from('attendance_sessions')
    .select('*, webinar_registrations!inner(webinar_id)')
    .eq('webinar_registrations.webinar_id', webinar.id);

  // Group attendance by registration ID
  const attendanceMap = new Map();
  attendance?.forEach(session => {
    const regId = session.registration_id;
    if (!attendanceMap.has(regId)) {
      attendanceMap.set(regId, {
        totalWatchSeconds: 0,
        joinedAt: session.joined_at,
        lastHeartbeat: session.last_heartbeat_at,
        sessionsCount: 0
      });
    }
    const current = attendanceMap.get(regId);
    current.totalWatchSeconds += session.watch_time_seconds || 0;
    current.sessionsCount += 1;
    if (new Date(session.joined_at) < new Date(current.joinedAt)) current.joinedAt = session.joined_at;
    if (new Date(session.last_heartbeat_at) > new Date(current.lastHeartbeat)) current.lastHeartbeat = session.last_heartbeat_at;
  });

  const totalRegistrations = registrations?.length || 0;
  const uniqueAttendees = attendanceMap.size;
  const durationSec = (webinar.duration_minutes || 60) * 60;
  
  // Funnel calculations
  let t5 = 0, t15 = 0, t30 = 0, t45 = 0, completed = 0;
  attendanceMap.forEach(data => {
    const sec = data.totalWatchSeconds;
    if (sec >= 5 * 60) t5++;
    if (sec >= 15 * 60) t15++;
    if (sec >= 30 * 60) t30++;
    if (sec >= 45 * 60) t45++;
    if (sec >= durationSec * 0.9) completed++;
  });

  const totalWatchTimeSeconds = Array.from(attendanceMap.values()).reduce((acc, curr) => acc + curr.totalWatchSeconds, 0);
  const avgWatchMinutes = uniqueAttendees > 0 ? ((totalWatchTimeSeconds / 60) / uniqueAttendees).toFixed(1) : '0';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C]">
      <header className="bg-[#121419] border-b border-zinc-800 px-6 py-4 flex justify-between items-center shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Rocket className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide">WEBINAR REPORT</h1>
            <p className="text-xs text-zinc-400 font-medium">{webinar.title}</p>
          </div>
        </div>
        <Link href={`/admin/webinars`} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          Back to Webinars
        </Link>
      </header>

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
              <div className="text-zinc-400 text-sm font-semibold mb-1">Registrations</div>
              <div className="text-3xl font-bold text-white">{totalRegistrations}</div>
            </div>
            <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
              <div className="text-zinc-400 text-sm font-semibold mb-1">Attendees</div>
              <div className="text-3xl font-bold text-white">{uniqueAttendees}</div>
              <div className="text-xs text-zinc-500 mt-1">{totalRegistrations ? Math.round((uniqueAttendees/totalRegistrations)*100) : 0}% attendance rate</div>
            </div>
            <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
              <div className="text-zinc-400 text-sm font-semibold mb-1">Avg Watch Time</div>
              <div className="text-3xl font-bold text-white">{avgWatchMinutes}m</div>
            </div>
            <div className="bg-[#121419] border border-zinc-800 p-5 rounded-2xl shadow-xl">
              <div className="text-zinc-400 text-sm font-semibold mb-1">Completion Rate</div>
              <div className="text-3xl font-bold text-white">{uniqueAttendees ? Math.round((completed/uniqueAttendees)*100) : 0}%</div>
            </div>
          </div>

          {/* Retention Funnel */}
          <div className="bg-[#121419] border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <h3 className="text-white font-bold text-lg mb-6">Viewer Retention Funnel</h3>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex-1 w-full text-center p-4 bg-zinc-800/20 rounded-xl border border-zinc-800/50">
                <div className="text-2xl font-bold text-white mb-1">{totalRegistrations}</div>
                <div className="text-xs font-bold text-zinc-500 uppercase">Registered</div>
              </div>
              <div className="text-zinc-600 font-bold hidden md:block">→</div>
              <div className="flex-1 w-full text-center p-4 bg-zinc-800/30 rounded-xl border border-zinc-800/50">
                <div className="text-2xl font-bold text-blue-400 mb-1">{uniqueAttendees}</div>
                <div className="text-xs font-bold text-blue-500/70 uppercase">Joined</div>
              </div>
              <div className="text-zinc-600 font-bold hidden md:block">→</div>
              <div className="flex-1 w-full text-center p-4 bg-zinc-800/40 rounded-xl border border-zinc-800/50">
                <div className="text-2xl font-bold text-indigo-400 mb-1">{t15}</div>
                <div className="text-xs font-bold text-indigo-500/70 uppercase">15 Min</div>
              </div>
              <div className="text-zinc-600 font-bold hidden md:block">→</div>
              <div className="flex-1 w-full text-center p-4 bg-zinc-800/50 rounded-xl border border-zinc-800/50">
                <div className="text-2xl font-bold text-violet-400 mb-1">{t30}</div>
                <div className="text-xs font-bold text-violet-500/70 uppercase">30 Min</div>
              </div>
              <div className="text-zinc-600 font-bold hidden md:block">→</div>
              <div className="flex-1 w-full text-center p-4 bg-zinc-800/60 rounded-xl border border-zinc-800/50">
                <div className="text-2xl font-bold text-emerald-400 mb-1">{completed}</div>
                <div className="text-xs font-bold text-emerald-500/70 uppercase">Completed</div>
              </div>
            </div>
          </div>

          {/* Attendee Table */}
          <div className="bg-[#121419] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">Attendee Details</h3>
              <button className="text-sm font-medium text-zinc-400 hover:text-white flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider bg-black/20">
                    <th className="p-4 font-semibold">User</th>
                    <th className="p-4 font-semibold">Email</th>
                    <th className="p-4 font-semibold">First Joined</th>
                    <th className="p-4 font-semibold text-right">Watch Time</th>
                    <th className="p-4 font-semibold text-right">% Watched</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {registrations?.map(reg => {
                    const data = attendanceMap.get(reg.id);
                    if (!data) return null;
                    const pct = Math.min(100, Math.round((data.totalWatchSeconds / durationSec) * 100));
                    let status = 'Attended';
                    if (pct >= 90) status = 'Completed';
                    else if (pct <= 10) status = 'Bounced';
                    else status = 'Partial';

                    return (
                      <tr key={reg.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-medium text-white">{reg.name}</td>
                        <td className="p-4 text-sm text-zinc-400">{reg.email}</td>
                        <td className="p-4 text-sm text-zinc-300">{new Date(data.joinedAt).toLocaleTimeString()}</td>
                        <td className="p-4 text-sm text-zinc-300 text-right">{Math.floor(data.totalWatchSeconds / 60)} min</td>
                        <td className="p-4 text-sm font-bold text-right text-indigo-400">{pct}%</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                            status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' :
                            status === 'Bounced' ? 'bg-red-500/10 text-red-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
