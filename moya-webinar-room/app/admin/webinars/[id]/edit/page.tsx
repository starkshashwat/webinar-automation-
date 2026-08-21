'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/admin-header';
import { ArrowLeft, Video, Calendar, Bot, Trash2, Lock, Sparkles, Clock, Tag, MessageSquare, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function EditWebinarPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: webinarId } = use(params);

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [webinar, setWebinar] = useState<any>(null);

  useEffect(() => {
    if (!webinarId) return;

    fetch(`/api/webinars/${webinarId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.webinar) {
          setWebinar(data.webinar);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [webinarId]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this webinar? All sessions, attendee registrations, and chat messages for this webinar will be permanently removed.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/webinars/${webinarId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/admin/webinars');
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || 'Failed to delete'}`);
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting webinar');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C] text-zinc-100">
        <AdminHeader />
        <main className="flex-1 flex items-center justify-center text-zinc-500">
          Loading webinar configuration...
        </main>
      </div>
    );
  }

  if (!webinar) {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C] text-zinc-100">
        <AdminHeader />
        <main className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
          <p>Webinar not found.</p>
          <Link href="/admin/webinars" className="text-blue-400 hover:underline text-sm">
            Return to Webinars
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C] text-zinc-100">
      <AdminHeader />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/webinars"
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>{webinar.title}</span>
                </h1>
                <p className="text-zinc-400 text-sm">Webinar Configuration & Policy Status</p>
              </div>
            </div>

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete Webinar'}
            </button>
          </div>

          {/* POLICY NOTICE: Immutable Settings Banner */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 shadow-xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-sm font-bold text-amber-300">Webinar Settings are Locked (Policy Active)</h3>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                To preserve schedule accuracy, registered attendee tokens, and AI broadcaster queues, webinar configuration cannot be edited after creation. If you need to make changes, please <strong>delete this webinar</strong> and create a new one.
              </p>
            </div>
          </div>

          {/* READ-ONLY CONFIGURATION VIEW */}
          <div className="bg-[#121419] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
            
            {/* 1. Basic Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Webinar Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/40 p-4 rounded-xl border border-zinc-800/60 text-sm">
                <div>
                  <span className="text-xs text-zinc-500 uppercase font-semibold">Title</span>
                  <div className="font-semibold text-white mt-0.5">{webinar.title}</div>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 uppercase font-semibold">Join URL Slug</span>
                  <div className="font-mono text-zinc-300 mt-0.5">/webinar/{webinar.slug}</div>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 uppercase font-semibold">Course Checkout URL</span>
                  <div className="font-mono text-blue-400 truncate mt-0.5">{webinar.course_url || 'None'}</div>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 uppercase font-semibold">Short Token (Masked Link)</span>
                  <div className="font-mono text-emerald-400 mt-0.5">/w/{webinar.short_token || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* 2. Stream & Schedule */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                Schedule & Stream Video
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-black/40 p-4 rounded-xl border border-zinc-800/60 text-sm">
                <div>
                  <span className="text-xs text-zinc-500 uppercase font-semibold">Schedule Type</span>
                  <div className="font-semibold text-white mt-0.5 uppercase">{webinar.schedule_type}</div>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 uppercase font-semibold">Start Time</span>
                  <div className="font-semibold text-purple-300 mt-0.5">
                    {webinar.scheduled_start ? new Date(webinar.scheduled_start).toLocaleString() : webinar.daily_start_time}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 uppercase font-semibold">Duration</span>
                  <div className="font-semibold text-white mt-0.5">
                    {webinar.duration_minutes || webinar.recording_duration || 60}m {webinar.duration_seconds || 0}s
                  </div>
                </div>
                <div className="md:col-span-3">
                  <span className="text-xs text-zinc-500 uppercase font-semibold">Video Source URL</span>
                  <div className="font-mono text-zinc-300 truncate mt-0.5">{webinar.recording_url || webinar.video_url}</div>
                </div>
              </div>
            </div>

            {/* 3. Pitch & AI Broadcaster Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-400" />
                Course Pitch & Offer Setup
              </h3>
              <div className="bg-black/40 p-4 rounded-xl border border-zinc-800/60 text-sm space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-zinc-500 uppercase font-semibold">Pitch Status</span>
                    <div className="font-semibold text-white mt-0.5">
                      {webinar.course_pitch_enabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 uppercase font-semibold">Pitch Unlock Time</span>
                    <div className="font-semibold text-purple-400 mt-0.5">
                      {webinar.course_pitch_delay_minutes || 0}m {webinar.course_pitch_delay_seconds || 0}s from start
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 uppercase font-semibold">Display Mode</span>
                    <div className="font-semibold text-emerald-400 mt-0.5">
                      {webinar.ai_cta_broadcast_type || 'CHAT'}
                    </div>
                  </div>
                </div>

                {webinar.course_pitch_enabled && (
                  <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-zinc-500">Banner Duration:</span> <strong className="text-white">{webinar.ai_cta_banner_duration_seconds || 30}s</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500">Banner Delay:</span> <strong className="text-white">{webinar.ai_cta_banner_delay_seconds || 0}s</strong>
                    </div>
                    <div>
                      <span className="text-zinc-500">Banner Interval:</span> <strong className="text-white">{webinar.ai_cta_banner_interval_minutes || 5}m</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <Link
                href="/admin/webinars"
                className="px-5 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Back to Webinars
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-102 flex items-center gap-2 shadow-lg shadow-rose-600/20"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting...' : 'Delete to Re-create'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
