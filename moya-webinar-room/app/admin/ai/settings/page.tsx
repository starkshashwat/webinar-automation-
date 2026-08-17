'use client';

import { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/admin-header';
import { Bot, Key, Cpu, Shield, Save, CheckCircle2 } from 'lucide-react';

export default function AISettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);
  
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<{ id: string }[]>([]);

  const [formData, setFormData] = useState({
    ai_name: 'MOYA Webinar Assistant',
    provider: 'google',
    api_base_url: 'https://generativelanguage.googleapis.com',
    api_key: '',
    model: 'gemini-flash-latest',
    system_instructions: '',
    is_enabled_globally: true,
    masked_api_key: '',
  });

  useEffect(() => {
    fetch('/api/ai/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.settings) {
          const s = data.settings;
            setFormData({
              ai_name: s.ai_name || 'MOYA Webinar Assistant',
              provider: s.provider || 'google',
              api_base_url: s.api_base_url || (s.provider === 'nvidia' ? 'https://integrate.api.nvidia.com/v1' : 'https://generativelanguage.googleapis.com'),
              api_key: '',
              model: s.model || 'gemini-flash-latest',
              system_instructions: s.system_instructions || '',
              is_enabled_globally: s.is_enabled_globally !== false,
              masked_api_key: s.masked_api_key || '',
            });
        }
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load AI settings');
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess(true);
      if (formData.api_key) {
        setFormData((prev) => ({
          ...prev,
          masked_api_key: `${prev.api_key.substring(0, 4)}...${prev.api_key.substring(prev.api_key.length - 4)}`,
          api_key: '',
        }));
      }
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value;
    if (newProvider === 'nvidia' || newProvider === 'nvidia nim') {
      setFormData(prev => ({ 
        ...prev, 
        provider: newProvider, 
        api_base_url: 'https://integrate.api.nvidia.com/v1',
        model: ''
      }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        provider: 'google', 
        api_base_url: 'https://generativelanguage.googleapis.com',
        model: 'gemini-flash-latest'
      }));
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const res = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setConnectionStatus(data);
    } catch (err: any) {
      setConnectionStatus({ success: false, message: 'Network error or server unreachable' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleFetchModels = async () => {
    setFetchingModels(true);
    try {
      const res = await fetch('/api/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.models) {
        setAvailableModels(data.models);
      } else {
        alert(data.error || 'Failed to fetch models');
      }
    } catch (err) {
      alert('Network error while fetching models');
    } finally {
      setFetchingModels(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-[#090A0C] text-zinc-100">
        <AdminHeader />
        <div className="flex-1 flex items-center justify-center text-zinc-500">Loading AI settings...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C] text-zinc-100">
      <AdminHeader />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2.5">
              <Bot className="w-6 h-6 text-purple-400" />
              AI Operator Configuration
            </h2>
            <p className="text-zinc-400 text-sm">
              Configure assistant personality, instructions, API provider, and model parameters
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Settings updated successfully!
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-[#121419] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
            {/* Global Master Switch */}
            <div className="flex items-center justify-between p-4 bg-zinc-900/80 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-600/20 text-purple-400 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-white">Global AI Operator Master Switch</div>
                  <div className="text-xs text-zinc-400">Master kill-switch for all live webinars</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.is_enabled_globally}
                onChange={(e) => setFormData({ ...formData, is_enabled_globally: e.target.checked })}
                className="w-5 h-5 rounded text-purple-600 bg-zinc-900 border-zinc-700 focus:ring-0 cursor-pointer"
              />
            </div>

            {/* Persona */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-200">AI Assistant Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MOYA Webinar Assistant"
                  value={formData.ai_name}
                  onChange={(e) => setFormData({ ...formData, ai_name: e.target.value })}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Provider & API Key */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                LLM Provider & Credentials
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">Provider</label>
                  <select
                    value={formData.provider}
                    onChange={handleProviderChange}
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors text-sm"
                  >
                    <option value="google">Google Gemini</option>
                    <option value="nvidia">NVIDIA NIM</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200">API Base URL</label>
                  <input
                    type="text"
                    value={formData.api_base_url}
                    onChange={(e) => setFormData({ ...formData, api_base_url: e.target.value })}
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-zinc-200 flex items-center justify-between">
                    <span>Model</span>
                    {formData.provider === 'nvidia' && (
                      <button 
                        type="button" 
                        onClick={handleFetchModels}
                        disabled={fetchingModels}
                        className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
                      >
                        {fetchingModels ? 'Fetching...' : 'Fetch Models'}
                      </button>
                    )}
                  </label>
                  
                  {availableModels.length > 0 ? (
                    <select
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
                    >
                      <option value="">Select a model...</option>
                      {availableModels.map(m => (
                        <option key={m.id} value={m.id}>{m.id}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="gemini-flash-latest or nvidia/..."
                      className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
                    />
                  )}
                </div>


              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-200 flex items-center justify-between">
                  <span>API Key</span>
                  {formData.masked_api_key && (
                    <span className="text-xs text-emerald-400 font-mono">Active: {formData.masked_api_key}</span>
                  )}
                </label>
                <input
                  type="password"
                  placeholder={formData.masked_api_key ? 'Enter new key to replace existing' : 'AIzaSy... or sk-...'}
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors font-mono text-sm"
                />
                <p className="text-xs text-zinc-500">
                  Stored securely in database. Never sent to browser client side.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="flex-1">
                  {connectionStatus && (
                    <div className={`text-sm font-medium flex items-center gap-2 ${connectionStatus.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      <CheckCircle2 className={`w-4 h-4 ${connectionStatus.success ? 'text-emerald-400' : 'hidden'}`} />
                      {connectionStatus.message}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm transition-colors border border-zinc-700"
                >
                  {testingConnection ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </div>

            <div className="h-px bg-zinc-800" />

            {/* System Instructions */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-zinc-200">System Instructions & Behavior</label>
              <textarea
                rows={6}
                required
                value={formData.system_instructions}
                onChange={(e) => setFormData({ ...formData, system_instructions: e.target.value })}
                className="w-full bg-black/60 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-purple-500 transition-colors text-sm font-sans leading-relaxed"
                placeholder="Enter system prompt and response rules..."
              />
              <p className="text-xs text-zinc-500">
                The AI combines these instructions with active webinar knowledge and approved resource links.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/20 transition-all hover:scale-102 flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save AI Configuration'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
