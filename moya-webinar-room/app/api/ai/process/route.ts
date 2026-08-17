import { NextResponse } from 'next/server';
import { processMessage } from '@/lib/ai/engine';

export async function POST(request: Request) {
  try {
    const { session_id, message_id } = await request.json();

    if (!session_id || !message_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Call engine, don't await response in terms of returning it to client,
    // although Next.js API routes might need to await it to prevent process early exit.
    await processMessage(session_id, message_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
