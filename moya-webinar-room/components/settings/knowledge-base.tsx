'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type KnowledgeBaseEntry } from '@/types/ai';

export function KnowledgeBase({ webinarId }: { webinarId: string }) {
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/knowledge-base?webinar_id=${webinarId}`)
      .then(res => res.json())
      .then(data => {
        if (data.knowledge_base) setEntries(data.knowledge_base);
        setLoading(false);
      });
  }, [webinarId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setSaving(true);
    
    try {
      const res = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webinar_id: webinarId, question, answer })
      });
      const data = await res.json();
      if (data.entry) {
        setEntries([...entries, data.entry]);
        setQuestion('');
        setAnswer('');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Knowledge Base (FAQs & Objections)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input 
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Question or Objection"
            required
            className="flex-1"
          />
          <Input 
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Approved Answer"
            required
            className="flex-1"
          />
          <Button type="submit" disabled={saving}>Add</Button>
        </form>

        {loading ? (
          <p>Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">No knowledge base entries yet.</p>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => (
              <div key={entry.id} className="border p-3 rounded-md text-sm">
                <p className="font-semibold text-primary mb-1">Q: {entry.question}</p>
                <p className="text-muted-foreground">A: {entry.answer}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
