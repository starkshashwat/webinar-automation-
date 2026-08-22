export type DomainType = 'ADMIN' | 'ATTENDEE' | 'CUSTOM' | 'DEFAULT';

interface DomainCacheEntry {
  isCustom: boolean;
  timestamp: number;
}

// In-memory cache for edge middleware (persists across some requests in the same isolate)
const domainCache = new Map<string, DomainCacheEntry>();
const CACHE_TTL = 60 * 1000; // 60 seconds

/**
 * Classifies a hostname into one of the core domain types.
 * Connects directly to Supabase REST API for custom domain verification
 * to stay lightweight and edge-compatible.
 */
export async function classifyHostname(hostname: string): Promise<DomainType> {
  const adminHost = process.env.ADMIN_HOSTNAME || 'webinar.mechanismofya.com';
  const attendeeHost = process.env.ATTENDEE_HOSTNAME || 'live.mechanismofya.com';

  if (hostname === adminHost) return 'ADMIN';
  if (hostname === attendeeHost) return 'ATTENDEE';

  // Allow localhost or vercel default preview domains to function as DEFAULT (no restrictions)
  if (hostname.includes('localhost') || hostname.includes('vercel.app')) {
    return 'DEFAULT';
  }

  // Check custom domains with Cache to prevent database load
  const now = Date.now();
  const cached = domainCache.get(hostname);
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.isCustom ? 'CUSTOM' : 'DEFAULT';
  }

  // If not cached, verify via Supabase REST API
  const isCustom = await verifyCustomDomain(hostname);
  domainCache.set(hostname, { isCustom, timestamp: now });

  return isCustom ? 'CUSTOM' : 'DEFAULT';
}

async function verifyCustomDomain(hostname: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return false;

  try {
    // Lightweight REST call to check if domain exists and is verified
    const res = await fetch(`${supabaseUrl}/rest/v1/custom_domains?domain=eq.${hostname}&status=eq.VERIFIED&select=id`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      // Use Next.js native fetch cache as a secondary layer
      next: { revalidate: 60 }
    });
    
    if (!res.ok) return false;
    
    const data = await res.json();
    return data && data.length > 0;
  } catch (e) {
    console.error('[Domain Resolver] Error verifying custom domain:', e);
    return false;
  }
}
