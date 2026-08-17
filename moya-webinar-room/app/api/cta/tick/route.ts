import { NextResponse } from 'next/server';
import { processCampaigns } from '@/lib/scheduler/campaign-runner';

// This endpoint should be called by Vercel Cron or another external scheduler
// typically every 1 minute.
export async function GET(request: Request) {
  // Simple security check using a cron secret (if set)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processCampaigns();
    return NextResponse.json(result);
  } catch (err) {
    console.error('Tick error:', err);
    return NextResponse.json({ error: 'Failed to process campaigns' }, { status: 500 });
  }
}
