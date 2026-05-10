import { NextResponse } from 'next/server';
import { chatTurn, type ChatMessage } from '@/lib/agent/chat';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { messages, userText } = (await req.json()) as { messages: ChatMessage[]; userText: string };
    const result = await chatTurn(messages ?? [], userText ?? '');
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'chat failed' }, { status: 500 });
  }
}
