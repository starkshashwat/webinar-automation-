'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  MousePointerClick, 
  CheckCircle2, 
  Tv, 
  Flame, 
  History,
  Layers,
  ArrowRight
} from 'lucide-react';

export function AttendeeJourneyModal({
  email,
  phone,
  initialName,
  onClose
}: {
  email?: string;
  phone?: string;
  initialName?: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadTimeline() {
      if (!email && !phone) return;
      try {
        const query = new URLSearchParams();
        if (email) query.set('email', email);
        if (phone) query.set('phone', phone);

        const res = await fetch(`/api/analytics/attendee-timeline?${query.toString()}`);
        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error('Failed to load timeline:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTimeline();
  }, [email, phone]);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#121419] border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {data?.attendee?.name || initialName || 'Attendee Journey'}
                {data?.totalWebinarsJoined > 1 && (
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Repeat Attendee 🔥 ({data.totalWebinarsJoined} Webinars)
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-0.5">
                {(email || data?.attendee?.email) && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-zinc-500" />
                    {email || data?.attendee?.email}
                  </span>
                )}
                {(phone || data?.attendee?.phone) && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-zinc-500" />
                    {phone || data?.attendee?.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 p-2 rounded-xl border border-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              Loading attendee lifetime timeline...
            </div>
          ) : (
            <>
              {/* Lifetime Metrics Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-black/30 border border-zinc-800/80 p-3.5 rounded-2xl">
                  <div className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                    <Tv className="w-3 h-3 text-blue-400" />
                    Webinars Joined
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {data?.totalWebinarsJoined || 0}
                    <span className="text-xs font-normal text-zinc-500 ml-1">/ {data?.totalWebinarsRegistered || 0}</span>
                  </div>
                </div>

                <div className="bg-black/30 border border-zinc-800/80 p-3.5 rounded-2xl">
                  <div className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    Lifetime Watch Time
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {formatDuration(data?.totalWatchTimeSeconds || 0)}
                  </div>
                </div>

                <div className="bg-black/30 border border-zinc-800/80 p-3.5 rounded-2xl">
                  <div className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                    <MousePointerClick className="w-3 h-3 text-purple-400" />
                    CTA Offer Clicks
                  </div>
                  <div className="text-xl font-bold text-white mt-1">
                    {data?.totalCtaClicks || 0}
                  </div>
                </div>

                <div className="bg-black/30 border border-zinc-800/80 p-3.5 rounded-2xl">
                  <div className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" />
                    Lead Quality
                  </div>
                  <div className="text-sm font-bold text-orange-400 mt-1.5">
                    {data?.totalCtaClicks > 0 ? 'HIGH INTENT 🔥' : data?.totalWatchTimeSeconds > 900 ? 'ENGAGED 🌟' : 'CASUAL 👀'}
                  </div>
                </div>
              </div>

              {/* Chronological Timeline */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Webinar Attendance Journey Timeline
                </div>

                {(!data?.timeline || data.timeline.length === 0) ? (
                  <div className="text-center py-8 text-zinc-500 text-xs bg-black/20 rounded-2xl border border-zinc-800">
                    No timeline records found for this attendee.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                    {data.timeline.map((item: any, idx: number) => {
                      const totalSecs = item.expectedDurationMinutes * 60;
                      const percentage = Math.min(100, Math.round((item.watchTimeSeconds / (totalSecs || 3600)) * 100));

                      return (
                        <div key={item.registrationId} className="relative group">
                          {/* Dot on timeline */}
                          <div className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[#121419] ${
                            item.hasAttended ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-zinc-600'
                          }`} />

                          <div className="bg-black/40 border border-zinc-800/80 rounded-2xl p-4 space-y-3 hover:border-zinc-700 transition-colors">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                  {item.webinarTitle}
                                </h4>
                                <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                  <Calendar className="w-3 h-3 text-zinc-500" />
                                  Joined: {formatDate(item.joinedAt || item.registeredAt)}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                {item.ctaClicks > 0 && (
                                  <span className="bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <MousePointerClick className="w-3 h-3" />
                                    Clicked CTA ({item.ctaClicks})
                                  </span>
                                )}
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  item.hasAttended 
                                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}>
                                  {item.hasAttended ? 'ATTENDED' : 'REGISTERED ONLY'}
                                </span>
                              </div>
                            </div>

                            {/* Watch Time Progress Bar */}
                            {item.hasAttended && (
                              <div className="space-y-1.5 pt-1 border-t border-zinc-800/60">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-zinc-400">Watch Time Spent:</span>
                                  <span className="font-mono font-bold text-zinc-200">
                                    {formatDuration(item.watchTimeSeconds)} ({percentage}% watched)
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full" 
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-black/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
