import { NextResponse } from 'next/server';
import { defaultWebinarProvider } from '@/lib/webinar/provider';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await defaultWebinarProvider.endWebinar(id);
    return NextResponse.json({ success: true, status: 'ENDED' });
  } catch (err: any) {
    console.error('[End Webinar Error]:', err);
    return NextResponse.json({ error: err?.message || 'Failed to end webinar' }, { status: 500 });
  }
}
