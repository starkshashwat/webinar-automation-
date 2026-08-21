'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminHeader } from '@/components/admin/admin-header';
import { ArrowLeft, Bot, Video, Calendar, Clock, Sparkles, MessageSquare, Tag, Zap } from 'lucide-react';
import Link from 'next/link';

export default function CreateWebinarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper for min date-time (at least 2 minutes from now)
  const getMinDateTimeLocal = () => {
    const d = new Date(Date.now() + 2 * 60 * 1000);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    recording_url: '',
    recording_title: '',
    duration_hours: 1,
    duration_minutes: 0,
    duration_seconds: 0,
    schedule_type: 'one_time',
    scheduled_start: getMinDateTimeLocal(),
    daily_start_time: '11:00',
    course_url: '',
    ai_enabled: true,
    course_pitch_enabled: false,
    pitch_delay_hours: 0,
    pitch_delay_minutes: 45,
    pitch_delay_seconds: 0,
    ai_cta_broadcast_batch_size: 1,
    ai_cta_broadcast_interval_minutes: 5,
    ai_cta_broadcast_max_count: 3,
    ai_cta_broadcast_prompt: `### AI Broadcast Instructions
When the Course Pitch unlocks, broadcast high-converting promotional CTAs to the public chat.
- Always include the exact payment/course link.
- Focus on value, student results, bonuses, and limited availability.`,
    ai_cta_broadcast_type: 'CHAT' as 'CHAT' | 'BANNER' | 'BOTH',
    ai_cta_broadcast_frequency: 'EXACT',
    ai_cta_broadcast_end_condition: 'MAX_COUNT',
    ai_cta_broadcast_image_url: '',
    ai_cta_broadcast_images: [] as string[],
    ai_cta_banner_duration_seconds: 30,
    ai_cta_banner_delay_seconds: 0,
    ai_cta_banner_interval_minutes: 5,
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

      if (formData.schedule_type === 'one_time') {
        if (!formData.scheduled_start) {
          throw new Error('Please select a scheduled start date and time.');
        }

        const scheduledTime = new Date(formData.scheduled_start).getTime();
        const minAllowedTime = Date.now() + 90 * 1000; // ~1.5 - 2 minutes minimum

        if (scheduledTime < minAllowedTime) {
          throw new Error('Scheduled start time must be at least 2 minutes in the future.');
        }

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

      if (!formData.course_url || !formData.course_url.trim()) {
        throw new Error('Course Checkout URL is required.');
      }

      const payload = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        video_url: formData.recording_url,
        recording_url: formData.recording_url,
        recording_title: formData.recording_title || formData.title,
        recording_duration: (Number(formData.duration_hours) * 60) + Number(formData.duration_minutes),
        duration_minutes: (Number(formData.duration_hours) * 60) + Number(formData.duration_minutes),
        duration_seconds: Number(formData.duration_seconds),
        schedule_type: formData.schedule_type,
        daily_start_time: formData.daily_start_time,
        scheduled_start: finalScheduledStart,
        course_url: formData.course_url,
        ai_enabled: formData.ai_enabled,
        course_pitch_enabled: formData.course_pitch_enabled,
        course_pitch_delay_minutes: (Number(formData.pitch_delay_hours) * 60) + Number(formData.pitch_delay_minutes),
        course_pitch_delay_seconds: Number(formData.pitch_delay_seconds),
        ai_cta_broadcast_type: formData.ai_cta_broadcast_type,
        ai_cta_broadcast_interval_minutes: formData.ai_cta_broadcast_interval_minutes,
        ai_cta_broadcast_batch_size: formData.ai_cta_broadcast_batch_size,
        ai_cta_broadcast_max_count: formData.ai_cta_broadcast_max_count,
        ai_cta_broadcast_prompt: formData.ai_cta_broadcast_prompt,
        ai_cta_broadcast_frequency: formData.ai_cta_broadcast_frequency,
        ai_cta_broadcast_end_condition: formData.ai_cta_broadcast_end_condition,
        ai_cta_broadcast_image_url: formData.ai_cta_broadcast_images?.[0] || formData.ai_cta_broadcast_image_url || null,
        ai_cta_broadcast_images: formData.ai_cta_broadcast_images,
        ai_cta_banner_duration_seconds: formData.ai_cta_banner_duration_seconds,
        ai_cta_banner_delay_seconds: formData.ai_cta_banner_delay_seconds,
        ai_cta_banner_interval_minutes: formData.ai_cta_banner_interval_minutes,
        status: 'WAITING',
      };

      const res = await fetch('/api/webinars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create webinar');
      }

      router.push('/admin/webinars');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C] text-zinc-100">
      <AdminHeader />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link
              href="/admin/webinars"
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Create New Webinar</h1>
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
                  <label className="block text-sm font-medium text-zinc-200">Course Checkout URL <span className="text-red-400">*</span></label>
                  <input
                    type="url"
                    required
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

              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-200">Video Duration (Hours, Minutes, Seconds) <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400">Hours</span>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={formData.duration_hours}
                      onChange={(e) => setFormData({ ...formData, duration_hours: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400">Minutes</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-zinc-400">Seconds</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={formData.duration_seconds}
                      onChange={(e) => setFormData({ ...formData, duration_seconds: parseInt(e.target.value) || 0 })}
                      className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Schedule Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                Schedule Settings (Min 2 Minutes in Future)
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
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-zinc-200">Start Date & Time (Minimum 2 min ahead)</label>
                    <span className="text-[11px] text-zinc-500 font-mono">Starts automatically</span>
                  </div>
                  <input
                    type="datetime-local"
                    required
                    min={getMinDateTimeLocal()}
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
            <div className="flex flex-col gap-4 p-4 bg-zinc-900/60 rounded-xl border border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-600/20 text-purple-400 rounded-lg flex items-center justify-center">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-white">Enable AI Webinar Operator</div>
                    <div className="text-xs text-zinc-400">AI monitors live chat, answers questions, and delivers offers</div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.ai_enabled}
                  onChange={(e) => setFormData({ ...formData, ai_enabled: e.target.checked })}
                  className="w-5 h-5 rounded text-blue-600 bg-zinc-900 border-zinc-700 focus:ring-0 cursor-pointer"
                />
              </div>
              
              {formData.ai_enabled && (
                <div className="pt-4 border-t border-zinc-800 space-y-5">
                  <div className="flex items-center justify-between bg-black/40 p-3.5 rounded-xl border border-zinc-800/80">
                    <div>
                      <div className="font-semibold text-sm text-white">Enable Course / Offer Pitch</div>
                      <div className="text-xs text-zinc-400">Unlock offers and promotions at a specific point in the webinar</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.course_pitch_enabled}
                      onChange={(e) => setFormData({ ...formData, course_pitch_enabled: e.target.checked })}
                      className="w-5 h-5 rounded text-purple-600 bg-zinc-900 border-zinc-700 focus:ring-0 cursor-pointer"
                    />
                  </div>

                  {formData.course_pitch_enabled && (
                    <div className="space-y-6 pt-2">
                      
                      {/* 1. TOPMOST SETTING: Pitch Unlock Time */}
                      <div className="bg-black/50 p-4 rounded-xl border border-purple-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-bold text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-400" />
                            1. Pitch Unlock Time (From Webinar Start)
                          </label>
                          <span className="text-[11px] text-purple-400 font-semibold bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                            Pitch Activation Point
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400">Specify exactly when the course pitch & promotion starts:</p>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase">Hours</span>
                            <input
                              type="number"
                              min="0"
                              value={formData.pitch_delay_hours}
                              onChange={(e) => setFormData({ ...formData, pitch_delay_hours: parseInt(e.target.value) || 0 })}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm font-medium"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase">Minutes</span>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={formData.pitch_delay_minutes}
                              onChange={(e) => setFormData({ ...formData, pitch_delay_minutes: parseInt(e.target.value) || 0 })}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm font-medium"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase">Seconds</span>
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={formData.pitch_delay_seconds}
                              onChange={(e) => setFormData({ ...formData, pitch_delay_seconds: parseInt(e.target.value) || 0 })}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 2. Pitch Display Mode Selector */}
                      <div className="bg-black/40 p-4 rounded-xl border border-zinc-800/60 space-y-3">
                        <label className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-blue-400" />
                          2. Pitch Display Mode (How to broadcast?)
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Option 1: Chat Only */}
                          <div
                            onClick={() => setFormData({ ...formData, ai_cta_broadcast_type: 'CHAT' })}
                            className={`cursor-pointer border rounded-xl p-3.5 flex flex-col gap-2 transition-all ${
                              formData.ai_cta_broadcast_type === 'CHAT'
                                ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500 text-white'
                                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-blue-400" />
                              <span className="font-bold text-sm">Chat Message Only</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 leading-tight">
                              Broadcasts promotional messages into the public chat log. No popup banners.
                            </p>
                          </div>

                          {/* Option 2: Banner Only */}
                          <div
                            onClick={() => setFormData({ ...formData, ai_cta_broadcast_type: 'BANNER' })}
                            className={`cursor-pointer border rounded-xl p-3.5 flex flex-col gap-2 transition-all ${
                              formData.ai_cta_broadcast_type === 'BANNER'
                                ? 'bg-purple-600/15 border-purple-500 ring-1 ring-purple-500 text-white'
                                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-purple-400" />
                              <span className="font-bold text-sm">Flash Banner Only</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 leading-tight">
                              Shows high-converting animated popups in corner. No chat messages.
                            </p>
                          </div>

                          {/* Option 3: Both */}
                          <div
                            onClick={() => setFormData({ ...formData, ai_cta_broadcast_type: 'BOTH' })}
                            className={`cursor-pointer border rounded-xl p-3.5 flex flex-col gap-2 transition-all ${
                              formData.ai_cta_broadcast_type === 'BOTH'
                                ? 'bg-emerald-600/15 border-emerald-500 ring-1 ring-emerald-500 text-white'
                                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-emerald-400" />
                              <span className="font-bold text-sm">Both Chat & Banner</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 leading-tight">
                              Broadcasts chat messages AND displays flash banners at their intervals.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 3. Conditional: FLASH BANNER SETTINGS (Active when BANNER or BOTH) */}
                      {(formData.ai_cta_broadcast_type === 'BANNER' || formData.ai_cta_broadcast_type === 'BOTH') && (
                        <div className="bg-purple-950/20 p-4 rounded-xl border border-purple-500/30 space-y-4 animate-in fade-in duration-300">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-purple-300 flex items-center gap-2">
                              <Tag className="w-4 h-4 text-purple-400" />
                              Flash Banner Custom Settings
                            </label>
                            <span className="text-[10px] text-purple-400 font-semibold bg-purple-500/20 px-2 py-0.5 rounded-full">
                              Popup Rules
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-zinc-300">Banner Display Duration (Seconds)</label>
                              <div className="text-[10px] text-zinc-500">How long banner stays on screen (e.g. 30s)</div>
                              <input
                                type="number"
                                min="5"
                                max="300"
                                value={formData.ai_cta_banner_duration_seconds}
                                onChange={(e) => setFormData({ ...formData, ai_cta_banner_duration_seconds: parseInt(e.target.value) || 30 })}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm font-medium"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-zinc-300">First Banner Delay (Seconds)</label>
                              <div className="text-[10px] text-zinc-500">Delay after pitch unlock before 1st banner (e.g. 0s or 60s)</div>
                              <input
                                type="number"
                                min="0"
                                max="3600"
                                value={formData.ai_cta_banner_delay_seconds}
                                onChange={(e) => setFormData({ ...formData, ai_cta_banner_delay_seconds: parseInt(e.target.value) || 0 })}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm font-medium"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-zinc-300">Banner Interval (Minutes)</label>
                              <div className="text-[10px] text-zinc-500">Time between next banner popup (e.g. 3 min)</div>
                              <input
                                type="number"
                                min="1"
                                max="60"
                                value={formData.ai_cta_banner_interval_minutes}
                                onChange={(e) => setFormData({ ...formData, ai_cta_banner_interval_minutes: parseInt(e.target.value) || 5 })}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm font-medium"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-2 border-t border-purple-500/20">
                            <label className="text-xs font-semibold text-zinc-300">Rotating Images (Image URLs separated by comma)</label>
                            <div className="text-[10px] text-zinc-500">Cycles through your images on every banner interval</div>
                            <input
                              type="text"
                              placeholder="https://example.com/banner1.jpg, https://example.com/banner2.jpg"
                              value={formData.ai_cta_broadcast_images?.join(', ') || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const arr = val.split(',').map(s => s.trim()).filter(s => s !== '');
                                setFormData({ ...formData, ai_cta_broadcast_images: arr });
                              }}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm font-medium"
                            />
                          </div>
                        </div>
                      )}

                      {/* 4. Conditional: CHAT BROADCAST SETTINGS (Active when CHAT or BOTH) */}
                      {(formData.ai_cta_broadcast_type === 'CHAT' || formData.ai_cta_broadcast_type === 'BOTH') && (
                        <div className="bg-blue-950/20 p-4 rounded-xl border border-blue-500/30 space-y-4 animate-in fade-in duration-300">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-bold text-blue-300 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-blue-400" />
                              Chat Broadcast Custom Settings
                            </label>
                            <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/20 px-2 py-0.5 rounded-full">
                              Chat Messages
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-zinc-300">Chat Broadcast Interval (Minutes)</label>
                              <div className="text-[10px] text-zinc-500">Time between chat CTA messages (e.g. 5 min)</div>
                              <input
                                type="number"
                                min="1"
                                max="60"
                                value={formData.ai_cta_broadcast_interval_minutes}
                                onChange={(e) => setFormData({ ...formData, ai_cta_broadcast_interval_minutes: parseInt(e.target.value) || 1 })}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm font-medium"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-zinc-300">Chat End Condition</label>
                              <div className="text-[10px] text-zinc-500">When should chat broadcasts stop?</div>
                              <select
                                value={formData.ai_cta_broadcast_end_condition}
                                onChange={(e) => setFormData({ ...formData, ai_cta_broadcast_end_condition: e.target.value })}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm font-medium"
                              >
                                <option value="MAX_COUNT">Stop after X Times</option>
                                <option value="WEBINAR_END">Run until Webinar Ends</option>
                              </select>
                            </div>
                          </div>

                          {formData.ai_cta_broadcast_end_condition === 'MAX_COUNT' && (
                            <div className="space-y-1.5 pt-2 border-t border-blue-500/20">
                              <label className="text-xs font-semibold text-zinc-300">Total Max Chat Messages</label>
                              <div className="text-[10px] text-zinc-500">Total number of chat messages sent before stopping</div>
                              <input
                                type="number"
                                min="1"
                                max="50"
                                value={formData.ai_cta_broadcast_max_count}
                                onChange={(e) => setFormData({ ...formData, ai_cta_broadcast_max_count: parseInt(e.target.value) || 1 })}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm font-medium"
                              />
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
              <Link
                href="/admin/webinars"
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-102 disabled:opacity-50 shadow-lg shadow-blue-600/20"
              >
                {loading ? 'Creating...' : 'Create Webinar'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
