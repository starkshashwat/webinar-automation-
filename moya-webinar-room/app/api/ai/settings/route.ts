import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getAISettings } from '@/lib/ai/responder';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await getAISettings();

  // Mask API key for client-side presentation
  const maskedApiKey = settings.api_key 
    ? `${settings.api_key.substring(0, 4)}...${settings.api_key.substring(settings.api_key.length - 4)}` 
    : (process.env.AI_API_KEY ? 'Configured in .env (Hidden)' : '');

  return NextResponse.json({
    settings: {
      ...settings,
      has_api_key: Boolean(settings.api_key || process.env.AI_API_KEY),
      masked_api_key: maskedApiKey,
      api_key: undefined, // Never send raw secret key to client
    }
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      ai_name, 
      provider, 
      api_base_url,
      api_key, 
      model, 
      system_instructions, 
      ignore_rules,
      pre_pitch_prompt,
      post_pitch_prompt,
      is_enabled_globally 
    } = body;

    const adminSupabase = createAdminClient();
    const existing = await getAISettings();

    const updatePayload: any = {
      ai_name: ai_name || existing.ai_name,
      provider: provider || (existing.provider === 'google' ? 'nvidia' : (existing.provider || 'nvidia')),
      api_base_url: api_base_url !== undefined ? api_base_url : (existing.api_base_url || 'https://integrate.api.nvidia.com/v1'),
      model: model || ((existing.model && !existing.model.includes('gemini')) ? existing.model : 'meta/llama-3.1-8b-instruct'),
      system_instructions: system_instructions || existing.system_instructions,
      ignore_rules: ignore_rules !== undefined ? ignore_rules : existing.ignore_rules,
      pre_pitch_prompt: pre_pitch_prompt !== undefined ? pre_pitch_prompt : existing.pre_pitch_prompt,
      post_pitch_prompt: post_pitch_prompt !== undefined ? post_pitch_prompt : existing.post_pitch_prompt,
      is_enabled_globally: is_enabled_globally !== undefined ? is_enabled_globally : existing.is_enabled_globally,
      updated_at: new Date().toISOString(),
    };

    // Only update API key if a new one is provided (not empty or masked placeholder)
    if (api_key && !api_key.includes('...')) {
      updatePayload.api_key = api_key.trim();
    }

    const { data: updated, error } = await adminSupabase
      .from('ai_settings')
      .upsert({
        id: existing.id || '00000000-0000-0000-0000-000000000001',
        ...updatePayload
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    console.error('[AI Settings API Error]:', err);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
