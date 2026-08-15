'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button, Card, Input } from '@/components/ui';
import { HANDOFF_KEY, type AssistantMsg } from '@/components/assistant/AssistantPanel';
import { ToolResultCard } from '@/components/assistant/ToolResultCards';

const SUGGESTIONS: Array<{ group: string; items: string[] }> = [
  {
    group: 'Quality',
    items: ['Which measures have the most open gaps?', 'Tell me about HBD', 'Who is missing clinical data for HBD?']
  },
  {
    group: 'Economics',
    items: ['Show the value at stake in our VBC contracts', 'What is our RAF recapture opportunity?', 'What if we close 40 HBD gaps?']
  },
  {
    group: 'Action',
    items: ["Where's our biggest quality dollar opportunity?", 'Generate a payer roster', 'Summarize the engagement queue']
  },
  {
    group: 'Connectivity',
    items: ['What is the gap-closure impact if we connect to Epic?']
  }
];

export default function ChatPage() {
  const [messages, setMessages] = useState<AssistantMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const booted = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    // Pick up a dashboard-panel handoff, then a ?q= deep link.
    try {
      const handoff = sessionStorage.getItem(HANDOFF_KEY);
      if (handoff) {
        sessionStorage.removeItem(HANDOFF_KEY);
        setMessages(JSON.parse(handoff));
        return;
      }
    } catch {
      /* ignore */
    }
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) send(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    const updated: AssistantMsg[] = [...messages, { role: 'user', content: text }];
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
      setMessages([...updated, { role: 'assistant', content: j.reply, tools: j.toolInvocations, mode: j.mode }]);
    } catch (err) {
      setMessages([...updated, { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'chat failed'}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col space-y-5">
      <div>
        <h1 className="inline-flex items-center gap-2.5 text-[28px] font-semibold leading-tight tracking-tight text-ink">
          <Sparkles size={24} strokeWidth={1.75} className="text-accent" aria-hidden />
          Assistant
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Ask grounded questions about measures, gaps, risk (RAF), value-based contracts, rosters, and
          the engagement queue — every answer cites live engine data.
        </p>
      </div>

      {messages.length === 0 && (
        <Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SUGGESTIONS.map((g) => (
              <div key={g.group}>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.group}</div>
                <div className="flex flex-col items-start gap-1.5">
                  {g.items.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-left text-xs text-slate-700 transition hover:border-accent/40 hover:bg-accent/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex-1 space-y-4">
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="ml-auto max-w-xl rounded-xl bg-accent/10 px-4 py-2.5 text-sm font-medium text-ink">
              {m.content}
            </div>
          ) : (
            <div key={i} className="max-w-3xl space-y-2">
              <div className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800">
                {m.content}
              </div>
              {m.tools?.map((t, j) => <ToolResultCard key={j} invocation={t} />)}
              {m.tools && m.tools.length > 0 && (
                <div className="text-[11px] text-slate-400">
                  Grounded on {m.tools.length} tool call{m.tools.length > 1 ? 's' : ''}
                </div>
              )}
            </div>
          )
        )}
        {busy && <div className="text-sm text-slate-400">Thinking…</div>}
        <div ref={bottom} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-4 flex gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the console…"
          className="border-0 focus:ring-0"
        />
        <Button type="submit" disabled={busy}>
          {busy ? 'Thinking…' : 'Send'}
        </Button>
      </form>
    </div>
  );
}
