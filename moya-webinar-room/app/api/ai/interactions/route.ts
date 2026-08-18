export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const webinar_id = searchParams.get('webinar_id');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const adminSupabase = createAdminClient();

  let query = adminSupabase
    .from('ai_interactions')
    .select('*, webinars(title)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (webinar_id) {
    query = query.eq('webinar_id', webinar_id);
  }

  const { data: interactions, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Calculate summary statistics
  let statsQuery = adminSupabase.from('ai_interactions').select('status, response_mode');
  if (webinar_id) {
    statsQuery = statsQuery.eq('webinar_id', webinar_id);
  }

  const { data: allStats } = await statsQuery;
  const statsList = allStats || [];

  const totalMessages = statsList.length;
  const answeredCount = statsList.filter((s) => s.status === 'processed').length;
  const ignoredCount = statsList.filter((s) => s.status === 'ignored').length;
  const failedCount = statsList.filter((s) => s.status === 'failed').length;
  const privateCount = statsList.filter((s) => s.status === 'processed' && s.response_mode === 'private').length;
  const publicCount = statsList.filter((s) => s.status === 'processed' && s.response_mode === 'public').length;

  return NextResponse.json({
    interactions: interactions || [],
    stats: {
      total_messages: totalMessages,
      answered: answeredCount,
      ignored: ignoredCount,
      failed: failedCount,
      private_responses: privateCount,
      public_responses: publicCount,
    }
  });
}
