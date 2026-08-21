import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import dns from 'dns';

export const dynamic = 'force-dynamic';

async function checkDnsWithGoogle(domain: string, type: 'TXT' | 'CNAME') {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`, {
      cache: 'no-store',
      headers: { Accept: 'application/dns-json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.Answer || !Array.isArray(data.Answer)) return [];
    return data.Answer.map((a: any) => a.data ? a.data.replace(/^"|"$/g, '').trim() : '').filter(Boolean);
  } catch (e) {
    return [];
  }
}

async function resolveTxtAsync(domain: string): Promise<string[]> {
  return new Promise((resolve) => {
    dns.resolveTxt(domain, (err, records) => {
      if (err || !records) {
        resolve([]);
      } else {
        const flat = records.map((r) => (Array.isArray(r) ? r.join('') : String(r)));
        resolve(flat);
      }
    });
  });
}

async function resolveCnameAsync(domain: string): Promise<string[]> {
  return new Promise((resolve) => {
    dns.resolveCname(domain, (err, addresses) => {
      if (err || !addresses) {
        resolve([]);
      } else {
        resolve(addresses);
      }
    });
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { domainId } = body;

    if (!domainId) {
      return NextResponse.json({ error: 'domainId is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: record, error } = await supabase
      .from('custom_domains')
      .select('*')
      .eq('id', domainId)
      .single();

    if (error || !record) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    const domain = record.domain;
    const txtChallenge = record.txt_challenge;
    const cnameTarget = record.cname_target.toLowerCase().replace(/\.$/, '');

    // 1. Check TXT Challenge on subdomain and root challenge
    const txtHost1 = `_moya-challenge.${domain}`;
    const txtHost2 = domain;

    const [localTxt1, localTxt2, googleTxt1, googleTxt2] = await Promise.all([
      resolveTxtAsync(txtHost1),
      resolveTxtAsync(txtHost2),
      checkDnsWithGoogle(txtHost1, 'TXT'),
      checkDnsWithGoogle(txtHost2, 'TXT'),
    ]);

    const allTxt = [...localTxt1, ...localTxt2, ...googleTxt1, ...googleTxt2];
    const txtMatched = allTxt.some((t) => t.includes(txtChallenge));

    // 2. Check CNAME Target
    const [localCname, googleCname] = await Promise.all([
      resolveCnameAsync(domain),
      checkDnsWithGoogle(domain, 'CNAME'),
    ]);

    const allCname = [...localCname, ...googleCname].map((c) => c.toLowerCase().replace(/\.$/, ''));
    const cnameMatched = allCname.some((c) => c.includes(cnameTarget) || cnameTarget.includes(c));

    const isVerified = txtMatched || cnameMatched;
    const nowIso = new Date().toISOString();

    if (isVerified) {
      const { data: updated } = await supabase
        .from('custom_domains')
        .update({
          status: 'VERIFIED',
          verified_at: nowIso,
          last_checked_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', domainId)
        .select()
        .single();

      return NextResponse.json({
        success: true,
        verified: true,
        message: 'DNS verification successful! Your domain is active and ready.',
        domain: updated,
        debug: { txtMatched, cnameMatched, foundTxt: allTxt, foundCname: allCname },
      });
    } else {
      await supabase
        .from('custom_domains')
        .update({
          status: 'FAILED',
          last_checked_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', domainId);

      return NextResponse.json({
        success: false,
        verified: false,
        message: 'DNS records could not be verified yet. Please ensure CNAME or TXT records are added in your DNS provider, and allow a few minutes for propagation.',
        debug: { txtMatched, cnameMatched, foundTxt: allTxt, foundCname: allCname },
      });
    }
  } catch (err: any) {
    console.error('[DNS Verification Error]', err);
    return NextResponse.json({ error: err.message || 'DNS verification check failed.' }, { status: 500 });
  }
}
