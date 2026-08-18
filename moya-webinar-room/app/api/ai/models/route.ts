export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAISettings } from '@/lib/ai/responder';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    let { provider, api_base_url, api_key } = body;

    if (!api_key) {
      // Use existing key if none provided in request
      const existing = await getAISettings();
      api_key = existing.api_key || process.env.AI_API_KEY;
    }

    if (!api_key) {
      return NextResponse.json({ error: 'API key is required to fetch models' }, { status: 400 });
    }

    if (provider === 'nvidia' || provider === 'nvidia nim') {
      const baseUrl = api_base_url || 'https://integrate.api.nvidia.com/v1';
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return NextResponse.json({ models: data.data || [] });
    }

    // Default empty array for providers that don't support dynamic listing yet
    return NextResponse.json({ models: [] });
  } catch (err: any) {
    console.error('[AI Fetch Models Error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch models' }, { status: 500 });
  }
}
