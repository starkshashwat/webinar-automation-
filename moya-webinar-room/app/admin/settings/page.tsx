'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AdminHeader } from '@/components/admin/admin-header';
import { 
  Globe, 
  Plus, 
  Check, 
  Copy, 
  RefreshCw, 
  Trash2, 
  Star, 
  ShieldCheck, 
  AlertCircle, 
  Lock,
  ImageIcon,
  Save,
  Sparkles
} from 'lucide-react';
import { type CustomDomain } from '@/types/webinar';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Branding states
  const [brandName, setBrandName] = useState('MOYA Live');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [savingBranding, setSavingBranding] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState(false);

  const fetchDomainsAndSettings = async () => {
    try {
      const res = await fetch('/api/settings/domain');
      const data = await res.json();
      if (res.ok) {
        if (data.domains) setDomains(data.domains);
        if (data.platformSettings) {
          setBrandName(data.platformSettings.brand_name ?? 'MOYA Live');
          setLogoUrl(data.platformSettings.logo_url ?? '');
          setFaviconUrl(data.platformSettings.favicon_url ?? '');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin/login');
        return;
      }
      fetchDomainsAndSettings();
    }
    checkAuth();
  }, [router]);

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBranding(true);
    setBrandingSuccess(false);

    try {
      const res = await fetch('/api/settings/domain', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_platform_settings: true,
          brand_name: brandName.trim(),
          logo_url: logoUrl.trim() || null,
          favicon_url: faviconUrl.trim() || null,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save branding');
      }

      setBrandingSuccess(true);
      setTimeout(() => setBrandingSuccess(false), 4000);

      // Update favicon live in document
      if (faviconUrl.trim()) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'shortcut icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = faviconUrl.trim();
      }
    } catch (err: any) {
      alert(err.message || 'Error saving branding');
    } finally {
      setSavingBranding(false);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setAddingDomain(true);
    setError(null);
    try {
      const res = await fetch('/api/settings/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          domain: newDomain,
          logo_url: logoUrl || undefined,
          favicon_url: faviconUrl || undefined
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add domain');
      }
      setNewDomain('');
      fetchDomainsAndSettings();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAddingDomain(false);
    }
  };

  const handleVerifyDns = async (domainId: string) => {
    setVerifyingId(domainId);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/settings/domain/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId }),
      });
      const data = await res.json();
      setVerifyResult({
        id: domainId,
        success: data.verified === true,
        message: data.message || (data.verified ? 'Domain verified successfully!' : 'DNS records not verified yet.')
      });
      fetchDomainsAndSettings();
    } catch (err: any) {
      setVerifyResult({
        id: domainId,
        success: false,
        message: err.message || 'DNS verification request failed.'
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const res = await fetch('/api/settings/domain', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_primary: true }),
      });
      if (res.ok) {
        fetchDomainsAndSettings();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteDomain = async (id: string) => {
    if (!confirm('Are you sure you want to remove this domain?')) return;
    try {
      const res = await fetch(`/api/settings/domain?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchDomainsAndSettings();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const primaryDomain = domains.find(d => d.is_primary && d.status === 'VERIFIED') || null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C] text-zinc-100">
      <AdminHeader />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
                <Globe className="w-6 h-6 text-blue-500" />
                Custom Domains & Brand Settings
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                Configure your own branded custom domain, header logo, favicon, and secure masked attendee rooms.
              </p>
            </div>

            {primaryDomain && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Domain: {primaryDomain.domain}
              </div>
            )}
          </div>

          {/* SECTION 1: Brand Logo & Favicon Synchronization */}
          <div className="bg-[#121419] border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">Brand Logo & Favicon Customization</h2>
                  <p className="text-xs text-zinc-400">These branding assets sync automatically across the Admin Panel and Attendee Webinar Rooms.</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full hidden sm:inline-block">
                Live Synced
              </span>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Brand Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Brand / Platform Name</label>
                  <input
                    type="text"
                    placeholder="e.g. MOYA Academy"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors font-medium"
                  />
                </div>

                {/* Logo URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Header Logo URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/logo.png"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors font-mono text-xs"
                    />
                    {logoUrl && (
                      <div className="w-10 h-10 shrink-0 bg-black/80 border border-zinc-700 rounded-xl flex items-center justify-center p-1 overflow-hidden" title="Logo Preview">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Favicon URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Browser Favicon URL</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/favicon.ico"
                      value={faviconUrl}
                      onChange={(e) => setFaviconUrl(e.target.value)}
                      className="w-full bg-black/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors font-mono text-xs"
                    />
                    {faviconUrl && (
                      <div className="w-10 h-10 shrink-0 bg-black/80 border border-zinc-700 rounded-xl flex items-center justify-center p-1.5 overflow-hidden" title="Favicon Preview">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={faviconUrl} alt="Favicon" className="w-5 h-5 object-contain" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                {brandingSuccess ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                    <Check className="w-4 h-4" />
                    Brand settings saved & synchronized!
                  </div>
                ) : (
                  <span className="text-[11px] text-zinc-500">Supports HTTPS image URLs (PNG, SVG, ICO, JPG, WebP)</span>
                )}

                <button
                  type="submit"
                  disabled={savingBranding}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all hover:scale-102 flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                >
                  {savingBranding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Branding
                </button>
              </div>
            </form>
          </div>

          {/* SECTION 2: Add New Custom Domain */}
          <div className="bg-[#121419] border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              Connect a Custom Domain
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Enter the domain or subdomain where you want attendees to join your webinars (e.g. <span className="font-mono text-zinc-300">live.yourbrand.com</span> or <span className="font-mono text-zinc-300">events.company.io</span>).
            </p>

            <form onSubmit={handleAddDomain} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="live.yourdomain.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={addingDomain || !newDomain.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-102 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-blue-600/20"
              >
                {addingDomain ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Add Domain
              </button>
            </form>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* SECTION 3: Domain List & DNS Verification */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-zinc-200">Connected Domains ({domains.length})</h2>

            {loading ? (
              <div className="text-center py-12 text-zinc-600 text-sm">Loading domains...</div>
            ) : domains.length === 0 ? (
              <div className="bg-[#121419]/60 border border-dashed border-zinc-800 rounded-2xl p-8 text-center space-y-2">
                <Globe className="w-8 h-8 text-zinc-600 mx-auto" />
                <div className="text-sm font-medium text-zinc-300">No custom domains added yet</div>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  By default, attendee links use your standard hosting domain. Add a custom domain above to white-label your webinar room.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {domains.map((dom) => (
                  <div 
                    key={dom.id}
                    className="bg-[#121419] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6 transition-all"
                  >
                    {/* Domain Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          dom.status === 'VERIFIED' 
                            ? 'bg-emerald-500 ring-4 ring-emerald-500/20' 
                            : dom.status === 'FAILED' 
                            ? 'bg-rose-500 ring-4 ring-rose-500/20' 
                            : 'bg-amber-500 ring-4 ring-amber-500/20 animate-pulse'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-bold text-white tracking-wide">{dom.domain}</span>
                            {dom.is_primary && (
                              <span className="bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-blue-400" />
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            Status: <span className={
                              dom.status === 'VERIFIED' ? 'text-emerald-400 font-semibold' : 
                              dom.status === 'FAILED' ? 'text-rose-400 font-semibold' : 'text-amber-400 font-semibold'
                            }>{dom.status}</span>
                            {dom.verified_at && ` • Verified on ${new Date(dom.verified_at).toLocaleDateString()}`}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {dom.status === 'VERIFIED' && !dom.is_primary && (
                          <button
                            onClick={() => handleSetPrimary(dom.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors flex items-center gap-1.5"
                          >
                            <Star className="w-3.5 h-3.5" />
                            Set as Primary
                          </button>
                        )}

                        <button
                          onClick={() => handleVerifyDns(dom.id)}
                          disabled={verifyingId === dom.id}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${verifyingId === dom.id ? 'animate-spin' : ''}`} />
                          {verifyingId === dom.id ? 'Checking DNS...' : 'Verify DNS'}
                        </button>

                        <button
                          onClick={() => handleDeleteDomain(dom.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Domain"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Verification Result Message Alert */}
                    {verifyResult && verifyResult.id === dom.id && (
                      <div className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                        verifyResult.success
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}>
                        {verifyResult.success ? (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div>{verifyResult.message}</div>
                      </div>
                    )}

                    {/* DNS Configuration Instructions & Copy Table */}
                    <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-zinc-800/60">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                          Required DNS Records (Add in your Cloudflare / DNS Provider)
                        </label>
                        <span className="text-[10px] text-zinc-500">Configure either CNAME or TXT record</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse font-mono">
                          <thead>
                            <tr className="text-zinc-500 border-b border-zinc-800">
                              <th className="pb-2 font-medium">Type</th>
                              <th className="pb-2 font-medium">Name / Host</th>
                              <th className="pb-2 font-medium">Value / Target</th>
                              <th className="pb-2 font-medium text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60">
                            {/* Record 1: CNAME */}
                            <tr className="hover:bg-zinc-900/30">
                              <td className="py-2.5 font-bold text-purple-400">CNAME</td>
                              <td className="py-2.5 text-zinc-300">{dom.domain.split('.')[0] || '@'}</td>
                              <td className="py-2.5 text-zinc-300 font-semibold">{dom.cname_target}</td>
                              <td className="py-2.5 text-right">
                                <button
                                  onClick={() => copyToClipboard(dom.cname_target, `${dom.id}-cname`)}
                                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] inline-flex items-center gap-1 transition-colors"
                                >
                                  {copiedKey === `${dom.id}-cname` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  Copy
                                </button>
                              </td>
                            </tr>

                            {/* Record 2: TXT Verification */}
                            <tr className="hover:bg-zinc-900/30">
                              <td className="py-2.5 font-bold text-blue-400">TXT</td>
                              <td className="py-2.5 text-zinc-300">_moya-challenge.{dom.domain}</td>
                              <td className="py-2.5 text-zinc-300 truncate max-w-[200px]">{dom.txt_challenge}</td>
                              <td className="py-2.5 text-right">
                                <button
                                  onClick={() => copyToClipboard(dom.txt_challenge, `${dom.id}-txt`)}
                                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] inline-flex items-center gap-1 transition-colors"
                                >
                                  {copiedKey === `${dom.id}-txt` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  Copy
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 4: URL Masking & Security Overview Card */}
          <div className="bg-[#121419] border border-zinc-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Cryptographic Join Link Masking (Active)</h3>
                <p className="text-xs text-zinc-400">Attendees receive random 8-character token links that never leak internal names or assets.</p>
              </div>
            </div>

            <div className="bg-black/50 p-4 rounded-xl border border-zinc-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans font-semibold">Attendee Invite URL Format</span>
                <div className="text-emerald-400 font-semibold text-sm">
                  {primaryDomain ? `https://${primaryDomain.domain}` : typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com'}/w/<span className="text-purple-400">9xK2mP8L</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-sans">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Zero DB / Video Source Leak
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
