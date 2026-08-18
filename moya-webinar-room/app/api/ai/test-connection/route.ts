export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAIProvider } from '@/lib/ai/providers';
import { type AISettings } from '@/types/ai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { provider, api_base_url, api_key, model } = body;

    const settings: AISettings = {
      id: 'test',
      ai_name: 'test',
      system_instructions: 'test',
      is_enabled_globally: true,
      provider: provider || 'google',
      api_base_url: api_base_url || null,
      api_key: api_key,
      model: model || '',
    };

    const aiProvider = getAIProvider(settings);
    const result = await aiProvider.testConnection(settings);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[AI Test Connection Error]:', err);
    return NextResponse.json({ success: false, message: 'Invalid request format or server error' }, { status: 400 });
  }
}
