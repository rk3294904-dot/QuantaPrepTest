import { auth } from '@/lib/firebase';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const FALLBACK_ERROR = 'The assistant is unavailable right now. Please try again.';

export async function sendAiMessage(messages: ChatMessage[]): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in again to use the assistant.');

  const idToken = await user.getIdToken();
  const res = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ messages }),
  });

  const data: unknown = await res.json().catch(() => null);
  const reply = (data as { reply?: unknown } | null)?.reply;
  if (!res.ok || typeof reply !== 'string') {
    const error = (data as { error?: unknown } | null)?.error;
    throw new Error(typeof error === 'string' ? error : FALLBACK_ERROR);
  }
  return reply;
}
