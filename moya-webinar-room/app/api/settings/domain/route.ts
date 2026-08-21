import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAdminClient();
    const [domainsRes, platformRes] = await Promise.all([
      supabase.from('custom_domains').select('*').order('created_at', { ascending: false }),
      supabase.from('platform_settings').select('*').eq('id', 'default').maybeSingle(),
    ]);

    if (domainsRes.error) {
      return NextResponse.json({ error: domainsRes.error.message }, { status: 500 });
    }

    const domains = domainsRes.data || [];
    const primaryDomain = domains.find((d) => d.is_primary && d.status === 'VERIFIED') || null;
    const platformSettings = platformRes.data || {
      id: 'default',
      logo_url: primaryDomain?.logo_url || null,
      favicon_url: primaryDomain?.favicon_url || null,
      brand_name: 'MOYA Live'
    };

    return NextResponse.json({ 
      domains, 
      primaryDomain,
      platformSettings
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { domain, logo_url, favicon_url } = body;

    if (!domain || typeof domain !== 'string') {
      return NextResponse.json({ error: 'Valid domain name is required.' }, { status: 400 });
    }

    // Clean up domain: strip http://, https://, trailing slashes, spaces
    domain = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '');

    if (!domain.includes('.') || domain.length < 3) {
      return NextResponse.json({ error: 'Please enter a valid domain (e.g. live.mycompany.com)' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if domain already exists
    const { data: existing } = await supabase
      .from('custom_domains')
      .select('id')
      .eq('domain', domain)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'This domain has already been added.' }, { status: 400 });
    }

    const txtChallenge = `moya-verify-${crypto.randomBytes(6).toString('hex')}`;
    const cnameTarget = process.env.NEXT_PUBLIC_APP_CNAME_TARGET || 'cname.moya.live';

    const { data: created, error } = await supabase
      .from('custom_domains')
      .insert([{
        domain,
        txt_challenge: txtChallenge,
        cname_target: cnameTarget,
        status: 'PENDING',
        is_primary: false,
        logo_url: logo_url || null,
        favicon_url: favicon_url || null,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, domain: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, is_primary, logo_url, favicon_url, brand_name, update_platform_settings } = body;
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    // 1. If updating global platform settings
    if (update_platform_settings) {
      const { data: updatedSettings, error } = await supabase
        .from('platform_settings')
        .upsert({
          id: 'default',
          logo_url: logo_url !== undefined ? logo_url : undefined,
          favicon_url: favicon_url !== undefined ? favicon_url : undefined,
          brand_name: brand_name !== undefined ? brand_name : undefined,
          updated_at: nowIso
        })
        .select()
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, platformSettings: updatedSettings });
    }

    // 2. If updating domain specific settings
    if (!id) {
      return NextResponse.json({ error: 'Domain ID is required.' }, { status: 400 });
    }

    const updates: any = { updated_at: nowIso };
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (favicon_url !== undefined) updates.favicon_url = favicon_url;

    if (is_primary !== undefined) {
      if (is_primary) {
        // Unset all other domains as primary
        await supabase
          .from('custom_domains')
          .update({ is_primary: false })
          .neq('id', id);

        updates.is_primary = true;
      } else {
        updates.is_primary = false;
      }
    }

    const { data, error } = await supabase
      .from('custom_domains')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, domain: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Domain ID is required.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from('custom_domains')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
