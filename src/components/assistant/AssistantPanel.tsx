'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ToolResultCard, type ToolInvocation } from './ToolResultCards';

export interface AssistantMsg {
  role: 'user' | 'assistant';
  content: string;
  tools?: ToolInvocation[];
  mode?: string;
}

export const HANDOFF_KEY = 'assistant-handoff';

// The dashboard's front door: a hero input that expands inline into a
// conversation. Past a few turns it hands off to /chat with history intact.
export function AssistantPanel({ suggestions }: { suggestions: string[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<AssistantMsg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

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

  function continueInChat() {
    try {
      sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
    router.push('/chat');
  }

  return (
    <section className="rounded-xl bg-ink p-6 text-white">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-300">
        <Sparkles size={14} aria-hidden />
        Ask the console
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Where's our biggest quality dollar opportunity?"
          className="flex-1 rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
        >
          {busy ? 'Thinking…' : 'Ask'}
          {!busy && <ArrowRight size={15} aria-hidden />}
        </button>
      </form>

      {messages.length === 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-200 transition hover:bg-white/10"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && (
        <div className="mt-4 max-h-[26rem] space-y-3 overflow-y-auto rounded-lg bg-white/5 p-4">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="text-sm font-medium text-sky-200">{m.content}</div>
            ) : (
              <div key={i} className="space-y-2">
                <div className="whitespace-pre-wrap text-sm text-slate-100">{m.content}</div>
                {m.tools?.map((t, j) => (
                  <div key={j} className="text-ink">
                    <ToolResultCard invocation={t} />
                  </div>
                ))}
                {m.tools && m.tools.length > 0 && (
                  <div className="text-[11px] text-slate-400">Grounded on {m.tools.length} tool call{m.tools.length > 1 ? 's' : ''}</div>
                )}
              </div>
            )
          )}
          <div className="pt-1">
            <button type="button" onClick={continueInChat} className="text-xs font-medium text-sky-300 hover:underline">
              Continue in the assistant →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
