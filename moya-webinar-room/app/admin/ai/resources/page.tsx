'use client';

import { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/admin-header';
import { Link as LinkIcon, Plus, Trash2, CheckCircle, XCircle, Edit3, ExternalLink } from 'lucide-react';
import { type AIResource } from '@/types/ai';

export default function ResourcesPage() {
  const [resources, setResources] = useState<AIResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const fetchResources = async () => {
    try {
      const res = await fetch('/api/ai/resources');
      const data = await res.json();
      if (data.resources) {
        setResources(data.resources);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load resources');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          url: url.trim(),
          active: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add resource');

      setName('');
      setDescription('');
      setUrl('');
      fetchResources();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (resource: AIResource) => {
    try {
      await fetch('/api/ai/resources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: resource.id, active: !resource.active }),
      });
      setResources((prev) =>
        prev.map((r) => (r.id === resource.id ? { ...r, active: !r.active } : r))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      await fetch(`/api/ai/resources?id=${id}`, { method: 'DELETE' });
      setResources((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (resource: AIResource) => {
    setEditingId(resource.id);
    setEditName(resource.name);
    setEditDescription(resource.description || '');
    setEditUrl(resource.url);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await fetch('/api/ai/resources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          name: editName.trim(),
          description: editDescription.trim() || null,
          url: editUrl.trim(),
        }),
      });
      setEditingId(null);
      fetchResources();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#090A0C] text-zinc-100">
      <AdminHeader />

      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2.5">
              <LinkIcon className="w-6 h-6 text-emerald-400" />
              Approved Resources & URLs
            </h2>
            <p className="text-zinc-400 text-sm">
              The AI selects from these registered URLs when attendees ask for links. The AI is strictly prohibited from inventing URLs.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* Add Form */}
          <form onSubmit={handleAdd} className="bg-[#121419] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              Add Approved Resource URL
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">Resource Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MOYA Enrollment Page"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300">Approved Target URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://moya.com/enroll"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors text-sm font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">Description / When to share</label>
              <input
                type="text"
                placeholder="e.g. Share this link when attendees ask how to register, course price link, or checkout"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all hover:scale-102 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {saving ? 'Adding...' : 'Add Approved Resource'}
              </button>
            </div>
          </form>

          {/* List of Resources */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Approved Resources ({resources.length})
            </h3>

            {loading ? (
              <div className="p-8 text-center text-zinc-500 bg-[#121419] rounded-2xl border border-zinc-800">
                Loading resources...
              </div>
            ) : resources.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 bg-[#121419] rounded-2xl border border-zinc-800">
                No approved resources configured yet. Add your enrollment links, bonus sheets, or support URLs above.
              </div>
            ) : (
              resources.map((resource) => (
                <div
                  key={resource.id}
                  className={`bg-[#121419] border rounded-2xl p-5 shadow-lg transition-all ${
                    resource.active ? 'border-zinc-800' : 'border-zinc-800/40 opacity-60'
                  }`}
                >
                  {editingId === resource.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-black/80 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                        />
                        <input
                          type="url"
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          className="w-full bg-black/80 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
                        />
                      </div>
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full bg-black/80 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(resource.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2.5">
                          <h4 className="font-bold text-white text-sm">{resource.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              resource.active
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-zinc-800 text-zinc-500'
                            }`}
                          >
                            {resource.active ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        {resource.description && (
                          <p className="text-xs text-zinc-400">{resource.description}</p>
                        )}
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 mt-1 break-all"
                        >
                          {resource.url}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleActive(resource)}
                          className={`p-2 rounded-lg transition-colors ${
                            resource.active
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-zinc-500 hover:bg-zinc-800'
                          }`}
                          title={resource.active ? 'Disable' : 'Enable'}
                        >
                          {resource.active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => startEdit(resource)}
                          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(resource.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
