export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  
  // Protect route
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/admin/login', request.url));

  try {
    const slug = 'webinar-' + Math.random().toString(36).substr(2, 9);
    
    const { data: webinar, error } = await supabase
      .from('webinars')
      .insert([{
        title: 'New Webinar',
        slug: slug,
        status: 'WAITING',
        type: 'LIVE'
      }])
      .select('id')
      .single();

    if (error) throw error;

    // Redirect to the settings page to configure the newly created webinar
    return NextResponse.redirect(new URL(`/admin/webinars/${webinar.id}/settings`, request.url), { status: 303 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create webinar' }, { status: 500 });
  }
}
