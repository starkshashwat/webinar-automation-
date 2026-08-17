'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function WebinarSettings({ initialData }: { initialData?: any }) {
  const [loading, setLoading] = useState(false);
  
  const formatDatetimeLocal = (isoString?: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    return localDate.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    video_url: initialData?.recording_url || initialData?.video_url || '',
    course_url: initialData?.course_url || '',
    schedule_type: initialData?.schedule_type || 'one_time',
    scheduled_start: formatDatetimeLocal(initialData?.scheduled_start),
    daily_start_time: initialData?.daily_start_time || '11:00',
    duration_minutes: initialData?.recording_duration || initialData?.duration_minutes || 60,
    ai_enabled: initialData?.ai_enabled !== false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const url = initialData ? `/api/webinars/${initialData.id}` : '/api/webinars';
      const method = initialData ? 'PUT' : 'POST';
      
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
        ...formData,
        recording_url: formData.video_url,
        recording_duration: formData.duration_minutes,
        scheduled_start: finalScheduledStart,
      };
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        if (!initialData) {
          window.location.href = '/admin/webinars';
        } else {
          alert('Saved successfully');
        }
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-[#121419] border-zinc-800 text-white rounded-2xl shadow-xl">
      <CardHeader>
        <CardTitle>{initialData ? 'Webinar Configuration' : 'Create Webinar'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input 
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="MOYA YouTube Automation Masterclass"
              className="bg-black/50 border-zinc-800"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Room URL Slug</Label>
              <Input 
                required
                value={formData.slug}
                onChange={(e) => setFormData({...formData, slug: e.target.value})}
                placeholder="moya-youtube-automation"
                className="bg-black/50 border-zinc-800 font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Course Enrollment URL</Label>
              <Input 
                value={formData.course_url}
                onChange={(e) => setFormData({...formData, course_url: e.target.value})}
                placeholder="https://example.com/checkout"
                className="bg-black/50 border-zinc-800"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Video Stream / Recording URL</Label>
            <Input 
              value={formData.video_url}
              onChange={(e) => setFormData({...formData, video_url: e.target.value})}
              placeholder="https://www.youtube.com/watch?v=... or direct MP4"
              className="bg-black/50 border-zinc-800"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Schedule Type</Label>
              <select
                value={formData.schedule_type}
                onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
                className="w-full bg-black/50 border border-zinc-800 rounded-md p-2 text-sm text-white focus:outline-none"
              >
                <option value="one_time">One-Time</option>
                <option value="daily">Daily Recurring</option>
              </select>
            </div>
            {formData.schedule_type === 'one_time' ? (
              <div className="space-y-2">
                <Label>Start Date & Time</Label>
                <Input 
                  type="datetime-local"
                  value={formData.scheduled_start}
                  onChange={(e) => setFormData({...formData, scheduled_start: e.target.value})}
                  className="bg-black/50 border-zinc-800 [color-scheme:dark]"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Daily Start Time</Label>
                <Input 
                  type="time"
                  value={formData.daily_start_time}
                  onChange={(e) => setFormData({...formData, daily_start_time: e.target.value})}
                  className="bg-black/50 border-zinc-800 [color-scheme:dark]"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Duration (Minutes)</Label>
              <Input 
                type="number"
                min="1"
                required
                value={formData.duration_minutes}
                onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value) || 60})}
                className="bg-black/50 border-zinc-800"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="ai_toggle_settings"
              checked={formData.ai_enabled}
              onChange={(e) => setFormData({ ...formData, ai_enabled: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 bg-zinc-900 border-zinc-700"
            />
            <label htmlFor="ai_toggle_settings" className="text-sm font-medium text-zinc-300 cursor-pointer">
              Enable AI Webinar Operator for this webinar
            </label>
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
