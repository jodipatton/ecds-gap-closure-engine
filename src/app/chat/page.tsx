'use client';

import { useState } from 'react';
import { Card } from '@/components/ui';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  tools?: Array<{ name: string; args: any; result: any }>;
  mode?: string;
}

const SUGGESTIONS = [
  'Which measures have the most open gaps?',
  'What is the gap-closure impact if we connect to Epic?',
  'Tell me about HBD.',
  'Who is missing clinical data for HBD?',
  'Summarize the engagement queue.'
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    const next: Msg = { role: 'user', content: text };
    const updated = [...messages, next];
    setMessages(updated);
    setInput('');
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userText: text,
          messages: updated.slice(0, -1).map((m) => ({ role: m.role, content: m.content }))
        })
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? 'chat error');
      setMessages([
        ...updated,
        { role: 'assistant', content: j.reply, tools: j.toolInvocations, mode: j.mode }
      ]);
    } catch (err: any) {
      setMessages([...updated, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Agent chat</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Ask grounded questions about measures, gaps, the engagement queue, and EHR-platform impact.
          With <code className="text-xs bg-slate-100 px-1 rounded">OPENAI_API_KEY</code> set, the agent uses
          OpenAI tool calling against the engine. Without it, it falls back to a deterministic tool router
          so the demo still works.
        </p>
      </div>

      <Card>
        <div className="text-xs text-slate-500 mb-2">Try one:</div>
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="rounded border border-slate-200 bg-slate-50 px-3 py-1 text-xs hover:bg-slate-100">
              {s}
            </button>
          ))}
        </div>
      </Card>

      <Card className="min-h-[220px] space-y-4">
        {messages.length === 0 && <p className="text-sm text-slate-500">No messages yet.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`text-sm ${m.role === 'user' ? 'text-ink' : 'text-slate-800'}`}>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {m.role}{m.mode && <span className="ml-2 text-slate-400">via {m.mode}</span>}
            </div>
            <div className="mt-1 whitespace-pre-wrap">{m.content}</div>
            {m.tools && m.tools.length > 0 && (
              <details className="mt-2 text-xs text-slate-500">
                <summary>Tool calls ({m.tools.length})</summary>
                <pre className="mt-2 max-h-48 overflow-auto bg-slate-50 p-2 rounded">{JSON.stringify(m.tools, null, 2)}</pre>
              </details>
            )}
          </div>
        ))}
      </Card>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the agent…"
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Thinking…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
