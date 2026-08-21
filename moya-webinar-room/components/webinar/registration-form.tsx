'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function RegistrationForm({ 
  webinarId, 
  onRegistered 
}: { 
  webinarId: string; 
  onRegistered: (attendee: any) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<{ logo_url?: string | null; brand_name?: string | null }>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    fetch('/api/settings/domain')
      .then(res => res.json())
      .then(data => {
        const logo = data.primaryDomain?.logo_url ?? data.platformSettings?.logo_url;
        const favicon = data.primaryDomain?.favicon_url ?? data.platformSettings?.favicon_url;
        const name = data.platformSettings?.brand_name ?? 'MOYA Live';
        setBranding({ logo_url: logo, brand_name: name });

        if (favicon) {
          let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'shortcut icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = favicon;
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/attendees/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webinar_id: webinarId,
          ...formData
        })
      });

      if (res.ok) {
        const { attendee } = await res.json();
        // Save to localStorage (persists across tabs/closes, keyed per webinar)
        localStorage.setItem(`moya_attendee_${webinarId}`, attendee.id);
        localStorage.setItem(`moya_attendee_name_${webinarId}`, attendee.display_name);
        if (attendee.private_channel_id) {
          localStorage.setItem(`moya_private_channel_${webinarId}`, attendee.private_channel_id);
        }
        onRegistered(attendee);
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#090A0C] p-4">
      <Card className="w-full max-w-md bg-[#121419] border-zinc-800 text-white shadow-2xl">
        <CardHeader className="text-center space-y-3 pb-2">
          {branding.logo_url && (
            <div className="flex justify-center mb-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={branding.logo_url} 
                alt={branding.brand_name || 'Logo'} 
                className="max-h-12 max-w-[180px] object-contain" 
              />
            </div>
          )}
          <CardTitle className="text-2xl font-bold tracking-tight">Join Webinar</CardTitle>
          <CardDescription className="text-zinc-400">Please enter your details to access the live room.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="John Doe"
                className="bg-black/50 border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email"
                type="email"
                required
                pattern="^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$"
                title="Please enter a valid email address."
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="john@example.com"
                className="bg-black/50 border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone"
                type="tel"
                required
                pattern="^\\+?[0-9\\-\\s()]{10,15}$"
                title="Please enter a valid phone number (10-15 digits)."
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+91 9876543210"
                className="bg-black/50 border-zinc-800"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-6 text-lg mt-4">
              {loading ? 'Registering...' : 'Enter Room'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
