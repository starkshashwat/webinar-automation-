'use client';

import { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/admin-header';
import { BookOpen, Plus, Trash2, CheckCircle, XCircle, Edit3, X, Check } from 'lucide-react';
import { type AIKnowledge } from '@/types/ai';

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<AIKnowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for creating new entry
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const fetchKnowledge = async () => {
    try {
      const res = await fetch('/api/ai/knowledge');
      const data = await res.json();
      if (data.knowledge) {
        setEntries(data.knowledge);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load knowledge base');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
          active: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add entry');

      setNewTitle('');
      setNewContent('');
      fetchKnowledge();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (entry: AIKnowledge) => {
    try {
      await fetch('/api/ai/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id, active: !entry.active }),
      });
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, active: !e.active } : e))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge entry?')) return;
    try {
      await fetch(`/api/ai/knowledge?id=${id}`, { method: 'DELETE' });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (entry: AIKnowledge) => {
    setEditingId(entry.id);
    setEditTitle(entry.title);
    setEditContent(entry.content);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await fetch('/api/ai/knowledge', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          title: editTitle.trim(),
          content: editContent.trim(),
        }),
      });
      setEditingId(null);
      fetchKnowledge();
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
              <BookOpen className="w-6 h-6 text-blue-400" />
              AI Knowledge Base
            </h2>
            <p className="text-zinc-400 text-sm">
              Approved program facts, FAQs, and course details. The AI operator relies strictly on this information.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* Add New Entry Form */}
          <form onSubmit={handleAdd} className="bg-[#121419] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              Add Knowledge Entry
            </h3>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">Topic / Question Title</label>
              <input
                type="text"
                required
                placeholder="e.g. MOYA 1.0 Curriculum Overview or Refund Policy"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-300">Knowledge Content / Approved Answer</label>
              <textarea
                rows={3}
                required
                placeholder="e.g. MOYA 1.0 is a 6-week YouTube automation program covering niche selection, scriptwriting, and monetization..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full bg-black/60 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors text-sm leading-relaxed"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 transition-all hover:scale-102 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                {saving ? 'Adding...' : 'Add to Knowledge Base'}
              </button>
            </div>
          </form>

          {/* List of Entries */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Configured Knowledge Entries ({entries.length})
            </h3>

            {loading ? (
              <div className="p-8 text-center text-zinc-500 bg-[#121419] rounded-2xl border border-zinc-800">
                Loading knowledge entries...
              </div>
            ) : entries.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 bg-[#121419] rounded-2xl border border-zinc-800">
                No knowledge base entries added yet. Use the form above to add facts and FAQs.
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`bg-[#121419] border rounded-2xl p-5 shadow-lg transition-all ${
                    entry.active ? 'border-zinc-800' : 'border-zinc-800/40 opacity-60'
                  }`}
                >
                  {editingId === entry.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-black/80 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm"
                      />
                      <textarea
                        rows={3}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-black/80 border border-zinc-700 rounded-lg p-3 text-white text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(entry.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2.5">
                          <h4 className="font-bold text-white text-sm">{entry.title}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              entry.active
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-zinc-800 text-zinc-500'
                            }`}
                          >
                            {entry.active ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed">{entry.content}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleToggleActive(entry)}
                          className={`p-2 rounded-lg transition-colors ${
                            entry.active
                              ? 'text-emerald-400 hover:bg-emerald-500/10'
                              : 'text-zinc-500 hover:bg-zinc-800'
                          }`}
                          title={entry.active ? 'Disable' : 'Enable'}
                        >
                          {entry.active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => startEdit(entry)}
                          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
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
