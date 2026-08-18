'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AdminHeader } from '@/components/admin/admin-header';
import { ArrowLeft, Video, Calendar, Bot, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function EditWebinarPage() {
  const router = useRouter();
  const params = useParams();
  const webinarId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    recording_url: '',
    recording_title: '',
    recording_duration: 60,
    schedule_type: 'one_time',
    scheduled_start: '',
    daily_start_time: '11:00',
    course_url: '',
    ai_enabled: true,
    course_pitch_enabled: false,
    course_pitch_delay_minutes: 45,
    ai_cta_broadcast_batch_size: 1,
    ai_cta_broadcast_interval_minutes: 5,
    ai_cta_broadcast_max_count: 3,
    ai_cta_broadcast_prompt: '',
    status: 'WAITING',
  });

  useEffect(() => {
    if (!webinarId) return;

    fetch(`/api/webinars/${webinarId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.webinar) {
          const w = data.webinar;
          const formatDatetime = (iso?: string | null) => {
            if (!iso) return '';
            const d = new Date(iso);
            const offset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offset).toISOString().slice(0, 16);
          };

          setFormData({
            title: w.title || '',
            slug: w.slug || '',
            description: w.description || '',
            recording_url: w.recording_url || w.video_url || '',
            recording_title: w.recording_title || w.title || '',
            recording_duration: w.recording_duration || w.duration_minutes || 60,
            schedule_type: w.schedule_type || 'one_time',
            scheduled_start: formatDatetime(w.scheduled_start),
            daily_start_time: w.daily_start_time || '11:00',
            course_url: w.course_url || '',
            ai_enabled: w.ai_enabled !== false,
            course_pitch_enabled: w.course_pitch_enabled === true,
            course_pitch_delay_minutes: w.course_pitch_delay_minutes ?? 45,
            ai_cta_broadcast_batch_size: w.ai_cta_broadcast_batch_size || 1,
            ai_cta_broadcast_max_count: w.ai_cta_broadcast_max_count || 3,
            ai_cta_broadcast_interval_minutes: w.ai_cta_broadcast_interval_minutes || 5,
            ai_cta_broadcast_prompt: w.ai_cta_broadcast_prompt || '',
            status: w.status || 'WAITING',
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load webinar data');
        setLoading(false);
      });
  }, [webinarId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let finalScheduledStart: string | null = null;

      if (formData.schedule_type === 'one_time' && formData.scheduled_start) {
        finalScheduledStart = new Date(formData.scheduled_start).toISOString();
      } else if (formData.schedule_type === 'daily' && formData.daily_start_time) {
        const [hours, minutes] = formData.daily_start_time.split(':').map(Number);
        const target = new Date();
        target.setHours(hours || 0, minutes || 0, 0, 0);
        if (target.getTime() < Date.now()) {
          target.setDate(target.getDate() + 1);
        }
        finalScheduledStart = target.toISOString();
      }

      const payload = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        video_url: formData.recording_url,
        recording_url: formData.recording_url,
        recording_title: formData.recording_title || formData.title,
        recording_duration: Number(formData.recording_duration) || 60,
        duration_minutes: Number(formData.recording_duration) || 60,
        schedule_type: formData.schedule_type,
        daily_start_time: formData.daily_start_time,
        scheduled_start: finalScheduledStart,
        course_url: formData.course_url,
        ai_enabled: formData.ai_enabled,
        course_pitch_enabled: formData.course_pitch_enabled,
        course_pitch_delay_minutes: Number(formData.course_pitch_delay_minutes),
        ai_cta_broadcast_batch_size: Number(formData.ai_cta_broadcast_batch_size) || 1,
        ai_cta_broadcast_interval_minutes: Number(formData.ai_cta_broadcast_interval_minutes) || 5,
        ai_cta_broadcast_max_count: Number(formData.ai_cta_broadcast_max_count) || 3,
        ai_cta_broadcast_prompt: formData.ai_cta_broadcast_prompt,
        status: formData.status,
      };

      const res = await fetch(`/api/webinars/${webinarId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update webinar');
      }

      router.push('/admin/webinars');
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this webinar? This cannot be undone.')) return;
    try {
      await fetch(`/api/webinars/${webinarId}`, { method: 'DELETE' });
      router.push('/admin/webinars');
    } catch (err) {
      alert('Failed to delete webinar');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-[#090A0C] text-zinc-100">
        <AdminHeader />
        <div className="flex-1 flex items-center justify-center text-zinc-500">Loading webinar details...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C] text-zinc-100">
      <AdminHeader />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/webinars"
                className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h2 className="text-2xl font-bold text-white">Edit Webinar</h2>
                <p className="text-zinc-400 text-sm">Update playback, timing, and AI configurations</p>
              </div>
            </div>

            <button
              onClick={handleDelete}
              className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {formData.status === 'ENDED' && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
              This webinar has ended and can no longer be edited.
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-[#121419] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
            <fieldset disabled={formData.status === 'ENDED'} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-200">Webinar Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">Slug</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
                  >
                    <option value="WAITING">WAITING</option>
                    <option value="LIVE">LIVE</option>
                    <option value="ENDED">ENDED</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-200">Course / Checkout URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/checkout"
                  value={formData.course_url}
                  onChange={(e) => setFormData({ ...formData, course_url: e.target.value })}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-200">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>
            </fieldset>

            <div className="h-px bg-zinc-800" />

            {/* Video recording */}
            <fieldset disabled={formData.status === 'ENDED'} className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                Video & Duration
              </h3>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-200">Video Stream / YouTube URL</label>
                <input
                  type="url"
                  required
                  value={formData.recording_url}
                  onChange={(e) => setFormData({ ...formData, recording_url: e.target.value })}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-200">Duration (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.recording_duration}
                  onChange={(e) => setFormData({ ...formData, recording_duration: parseInt(e.target.value) || 60 })}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </fieldset>

            <div className="h-px bg-zinc-800" />

            {/* Schedule */}
            <fieldset disabled={formData.status === 'ENDED'} className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                Schedule
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, schedule_type: 'one_time' })}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    formData.schedule_type === 'one_time'
                      ? 'bg-blue-600/10 border-blue-500 text-white'
                      : 'bg-black/40 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className="font-semibold text-sm">One-Time Webinar</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, schedule_type: 'daily' })}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    formData.schedule_type === 'daily'
                      ? 'bg-purple-600/10 border-purple-500 text-white'
                      : 'bg-black/40 border-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className="font-semibold text-sm">Daily Recurring</div>
                </button>
              </div>

              {formData.schedule_type === 'one_time' ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_start}
                    onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">Daily Start Time</label>
                  <input
                    type="time"
                    value={formData.daily_start_time}
                    onChange={(e) => setFormData({ ...formData, daily_start_time: e.target.value })}
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors [color-scheme:dark]"
                  />
                </div>
              )}
            </fieldset>

            <div className="h-px bg-zinc-800" />

            {/* AI Toggle */}
            <fieldset disabled={formData.status === 'ENDED'} className="flex flex-col gap-4 p-4 bg-zinc-900/60 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-600/20 text-purple-400 rounded-lg flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-white">Enable AI Webinar Operator</div>
                    <div className="text-xs text-zinc-400">AI monitors live chat for this webinar</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.ai_enabled}
                  onChange={(e) => setFormData({ ...formData, ai_enabled: e.target.checked })}
                  className="w-5 h-5 rounded text-blue-600 bg-zinc-900 border-zinc-700 focus:ring-0 cursor-pointer disabled:opacity-50"
                />
              </div>

              {formData.ai_enabled && (
                <div className="pt-4 border-t border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-white">Time-Gated Course Pitch</div>
                      <div className="text-xs text-zinc-400">Hide course sales info until a specific time during the webinar</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.course_pitch_enabled}
                      onChange={(e) => setFormData({ ...formData, course_pitch_enabled: e.target.checked })}
                      className="w-5 h-5 rounded text-purple-600 bg-zinc-900 border-zinc-700 focus:ring-0 cursor-pointer disabled:opacity-50"
                    />
                  </div>

                  {formData.course_pitch_enabled && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-black/40 p-3.5 rounded-xl border border-zinc-800/60 space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-200">Pitch Delay (Minutes)</label>
                          <div className="text-[11px] text-zinc-500">Wait time after webinar starts before pitch unlocks</div>
                          <input
                            type="number"
                            min="0"
                            value={formData.course_pitch_delay_minutes}
                            onChange={(e) => setFormData({ ...formData, course_pitch_delay_minutes: parseInt(e.target.value) || 0 })}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm font-medium disabled:opacity-50"
                          />
                        </div>

                        <div className="bg-black/40 p-3.5 rounded-xl border border-zinc-800/60 space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-200">Messages Sent at Once (Batch Size)</label>
                          <div className="text-[11px] text-zinc-500">Number of CTA messages sent in each wave (1-5)</div>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={formData.ai_cta_broadcast_batch_size}
                            onChange={(e) => setFormData({ ...formData, ai_cta_broadcast_batch_size: parseInt(e.target.value) || 1 })}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm font-medium disabled:opacity-50"
                          />
                        </div>

                        <div className="bg-black/40 p-3.5 rounded-xl border border-zinc-800/60 space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-200">Delay Between Broadcast Sets (Minutes)</label>
                          <div className="text-[11px] text-zinc-500">Wait time before broadcasting the next set of messages</div>
                          <input
                            type="number"
                            min="1"
                            max="60"
                            value={formData.ai_cta_broadcast_interval_minutes}
                            onChange={(e) => setFormData({ ...formData, ai_cta_broadcast_interval_minutes: parseInt(e.target.value) || 1 })}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm font-medium disabled:opacity-50"
                          />
                        </div>

                        <div className="bg-black/40 p-3.5 rounded-xl border border-zinc-800/60 space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-200">Total Max CTA Broadcasts</label>
                          <div className="text-[11px] text-zinc-500">Total maximum CTA messages to broadcast before stopping</div>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={formData.ai_cta_broadcast_max_count}
                            onChange={(e) => setFormData({ ...formData, ai_cta_broadcast_max_count: parseInt(e.target.value) || 1 })}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm font-medium disabled:opacity-50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 bg-black/40 p-3.5 rounded-xl border border-zinc-800/60">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-zinc-200">AI Broadcast Instructions & Custom Prompt</label>
                          <span className="text-[10px] text-purple-400 font-medium">Combines with your Course URL</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          Provide details about the course, bonuses, student results, and scarcity. The AI will craft dynamic, persuasive CTAs and always inject your entered payment URL into every message.
                        </p>
                        <textarea
                          rows={4}
                          placeholder="e.g. Highlight the fast-action bonuses for the first 10 students and emphasize the 30-day guarantee..."
                          value={formData.ai_cta_broadcast_prompt}
                          onChange={(e) => setFormData({ ...formData, ai_cta_broadcast_prompt: e.target.value })}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm leading-relaxed disabled:opacity-50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </fieldset>

            <div className="flex justify-end gap-3 pt-2">
              <Link
                href="/admin/webinars"
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 transition-colors"
              >
                {formData.status === 'ENDED' ? 'Go Back' : 'Cancel'}
              </Link>
              {formData.status !== 'ENDED' && (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all hover:scale-102 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
