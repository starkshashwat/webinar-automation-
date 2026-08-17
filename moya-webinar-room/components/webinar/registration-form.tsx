'use client';

import { useState } from 'react';
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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

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
        // Save to session storage
        sessionStorage.setItem('moya_attendee_id', attendee.id);
        sessionStorage.setItem('moya_attendee_name', attendee.display_name);
        if (attendee.private_channel_id) {
          sessionStorage.setItem('moya_private_channel_id', attendee.private_channel_id);
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
        <CardHeader className="text-center space-y-2">
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
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="john@example.com"
                className="bg-black/50 border-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input 
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+1 (555) 000-0000"
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
