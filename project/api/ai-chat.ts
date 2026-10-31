export const config = { runtime: 'edge' };

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const IDENTITY_LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';
const MAX_HISTORY = 12;
const MAX_MESSAGE_CHARS = 2000;

const SYSTEM_PROMPT = `You are Quanta AI, the study companion inside QuantaPrep, an exam practice platform.
Explain concepts clearly and patiently, help students understand their mistakes, suggest topics to revise, and create practice prompts.
Keep answers concise and well organized. Write math with LaTeX inside $...$ for inline formulas or $$...$$ for display formulas.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function isSignedInUser(idToken: string): Promise<boolean> {
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) return false;
  const res = await fetch(`${IDENTITY_LOOKUP_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  return res.ok;
}

function parseMessages(payload: unknown): ChatMessage[] | null {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { messages?: unknown }).messages)) {
    return null;
  }
  const raw = (payload as { messages: unknown[] }).messages;
  const messages: ChatMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== 'user' && role !== 'assistant') return null;
    if (typeof content !== 'string') return null;
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > MAX_MESSAGE_CHARS) return null;
    messages.push({ role, content: trimmed });
  }
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') return null;
  return messages.slice(-MAX_HISTORY);
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return json({ error: 'The AI assistant is not configured yet.' }, 503);
  }

  const idToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!idToken || !(await isSignedInUser(idToken))) {
    return json({ error: 'Please sign in again to use the assistant.' }, 401);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  const messages = parseMessages(payload);
  if (!messages) {
    return json({ error: 'Invalid request.' }, 400);
  }

  let upstream: Response;
  try {
    upstream = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Title': 'QuantaPrep',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      }),
    });
  } catch {
    return json({ error: 'The assistant is unavailable right now. Please try again.' }, 502);
  }

  if (!upstream.ok) {
    return json({ error: 'The assistant is unavailable right now. Please try again.' }, 502);
  }

  const data = (await upstream.json().catch(() => null)) as {
    choices?: { message?: { content?: unknown } }[];
  } | null;
  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== 'string' || !reply.trim()) {
    return json({ error: 'The assistant returned an empty answer. Please try again.' }, 502);
  }

  return json({ reply }, 200);
}
