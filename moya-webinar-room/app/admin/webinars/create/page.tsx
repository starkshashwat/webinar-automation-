'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/admin-header';
import { ArrowLeft, Bot, Video, Calendar, Clock, Link as LinkIcon, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function CreateWebinarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
  });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug === '' || prev.slug === prev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') ? slug : prev.slug,
      recording_title: prev.recording_title === '' || prev.recording_title === prev.title ? title : prev.recording_title,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let finalScheduledStart: string | null = null;

      if (formData.schedule_type === 'one_time' && formData.scheduled_start) {
        finalScheduledStart = new Date(formData.scheduled_start).toISOString();
      } else if (formData.schedule_type === 'daily' && formData.daily_start_time) {
        // Calculate today's session timestamp for daily schedule
        const [hours, minutes] = formData.daily_start_time.split(':').map(Number);
        const target = new Date();
        target.setHours(hours || 0, minutes || 0, 0, 0);
        // If time has passed today, schedule for next day
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
      };

      const res = await fetch('/api/webinars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create webinar');
      }

      router.push('/admin/webinars');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C] text-zinc-100">
      <AdminHeader />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/webinars"
              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h2 className="text-2xl font-bold text-white">Create New Webinar</h2>
              <p className="text-zinc-400 text-sm">Configure video playback, scheduling, and AI operator</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-[#121419] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Webinar Details
              </h3>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-200">
                  Webinar Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MOYA YouTube Automation Masterclass"
                  value={formData.title}
                  onChange={handleTitleChange}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">Room URL Slug</label>
                  <div className="flex items-center bg-black/60 border border-zinc-800 rounded-xl px-3 text-zinc-500 text-sm">
                    <span>/webinar/</span>
                    <input
                      type="text"
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full bg-transparent py-2.5 px-1 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">Course / Checkout URL</label>
                  <input
                    type="url"
                    placeholder="https://example.com/checkout"
                    value={formData.course_url}
                    onChange={(e) => setFormData({ ...formData, course_url: e.target.value })}
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-200">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of the masterclass..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
                />
              </div>
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Recording / Video Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                Pre-recorded Video
              </h3>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-200">
                  Video Stream / YouTube URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=... or direct .mp4 URL"
                  value={formData.recording_url}
                  onChange={(e) => setFormData({ ...formData, recording_url: e.target.value })}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">Recording Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Masterclass Video Recording"
                    value={formData.recording_title}
                    onChange={(e) => setFormData({ ...formData, recording_title: e.target.value })}
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
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
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Scheduling Type */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                Schedule Settings
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, schedule_type: 'one_time' })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.schedule_type === 'one_time'
                      ? 'bg-blue-600/10 border-blue-500 text-white'
                      : 'bg-black/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-semibold text-sm">One-Time Webinar</div>
                  <div className="text-xs text-zinc-500 mt-1">Specific date and time</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, schedule_type: 'daily' })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.schedule_type === 'daily'
                      ? 'bg-purple-600/10 border-purple-500 text-white'
                      : 'bg-black/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-semibold text-sm">Daily Recurring</div>
                  <div className="text-xs text-zinc-500 mt-1">Runs every day automatically</div>
                </button>
              </div>

              {formData.schedule_type === 'one_time' ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
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
                    required
                    value={formData.daily_start_time}
                    onChange={(e) => setFormData({ ...formData, daily_start_time: e.target.value })}
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors [color-scheme:dark]"
                  />
                </div>
              )}
            </div>

            <div className="h-px bg-zinc-800" />

            {/* AI Operator Switch */}
            <div className="flex items-center justify-between p-4 bg-zinc-900/60 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-600/20 text-purple-400 rounded-lg flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-white">Enable AI Webinar Operator</div>
                  <div className="text-xs text-zinc-400">AI monitors live chat, answers questions, and shares resources</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.ai_enabled}
                onChange={(e) => setFormData({ ...formData, ai_enabled: e.target.checked })}
                className="w-5 h-5 rounded text-blue-600 bg-zinc-900 border-zinc-700 focus:ring-0 cursor-pointer"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link
                href="/admin/webinars"
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all hover:scale-102 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create & Schedule'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
