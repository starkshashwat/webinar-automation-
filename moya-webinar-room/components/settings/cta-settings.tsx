'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function CtaSettings({ webinarId }: { webinarId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: 'Main Campaign',
    start_delay_seconds: 600,
    interval_seconds: 300,
    messages: [
      { message: "Ready to get started?\nJoin here 👇\n{{COURSE_URL}}" }
    ]
  });

  useEffect(() => {
    // We could fetch existing campaign here, but for simplicity assuming we create/upsert it
    // I'll add a quick fetch to see if it exists
    fetch(`/api/campaigns?webinar_id=${webinarId}`)
      .then(res => res.json())
      .then(data => {
        if (data.campaign) {
          setFormData({
            name: data.campaign.name,
            start_delay_seconds: data.campaign.start_delay_seconds,
            interval_seconds: data.campaign.interval_seconds,
            messages: data.campaign.campaign_messages?.length > 0 
              ? data.campaign.campaign_messages 
              : formData.messages
          });
        }
        setLoading(false);
      });
  }, [webinarId]);

  const addMessage = () => {
    setFormData({
      ...formData,
      messages: [...formData.messages, { message: '' }]
    });
  };

  const updateMessage = (index: number, val: string) => {
    const newMsgs = [...formData.messages];
    newMsgs[index].message = val;
    setFormData({ ...formData, messages: newMsgs });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webinar_id: webinarId,
          ...formData
        })
      });
      if (res.ok) alert('Campaign saved successfully');
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading CTA settings...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>CTA Automation Settings</CardTitle>
        <CardDescription>Configure promotional messages that will be sent on a schedule.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Delay (seconds)</Label>
              <Input 
                type="number" 
                value={formData.start_delay_seconds}
                onChange={e => setFormData({...formData, start_delay_seconds: parseInt(e.target.value) || 0})}
              />
              <p className="text-xs text-muted-foreground">E.g., 600 = 10 minutes</p>
            </div>
            <div className="space-y-2">
              <Label>Interval (seconds)</Label>
              <Input 
                type="number" 
                value={formData.interval_seconds}
                onChange={e => setFormData({...formData, interval_seconds: parseInt(e.target.value) || 0})}
              />
              <p className="text-xs text-muted-foreground">E.g., 300 = 5 minutes</p>
            </div>
          </div>

          <div className="space-y-4">
            <Label>Messages Sequence</Label>
            {formData.messages.map((msg, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="font-bold pt-2">{idx + 1}.</span>
                <textarea 
                  className="flex-1 rounded-md border p-2 text-sm min-h-[80px]"
                  value={msg.message}
                  onChange={(e) => updateMessage(idx, e.target.value)}
                  placeholder="Enter message text... use {{COURSE_URL}}"
                />
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addMessage}>+ Add Message</Button>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Campaign'}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
