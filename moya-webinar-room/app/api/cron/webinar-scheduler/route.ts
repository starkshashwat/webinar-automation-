import { NextResponse } from 'next/server';
import { checkAndStartScheduledWebinars } from '@/lib/scheduler/webinar-scheduler';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await checkAndStartScheduledWebinars();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    console.error('[Webinar Scheduler Cron Error]:', error);
    return NextResponse.json({ success: false, error: error?.message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
