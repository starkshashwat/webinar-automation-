export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { processAIBroadcasts } from '@/lib/scheduler/ai-broadcaster';

export const dynamic = 'force-dynamic';

// This endpoint should be called by Vercel Cron or another external scheduler
// typically every 1 minute.
export async function GET(request: Request) {
  // Simple security check using a cron secret (if set)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const aiBroadcastsResult = await processAIBroadcasts();
    return NextResponse.json({ aiBroadcasts: aiBroadcastsResult });
  } catch (err) {
    console.error('Tick error:', err);
    return NextResponse.json({ error: 'Failed to process AI broadcasts' }, { status: 500 });
  }
}
