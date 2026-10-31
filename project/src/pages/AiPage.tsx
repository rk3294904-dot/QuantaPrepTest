import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Bot, RotateCcw, Send, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { ChatBubble, TypingBubble } from '@/components/ai/ChatBubble';
import { sendAiMessage, type ChatMessage } from '@/services/aiService';

const MAX_INPUT_CHARS = 2000;

const SUGGESTIONS = [
  'Explain my last wrong answer step by step',
  'Which topics should I revise first?',
  'Give me 3 practice questions on percentages',
];

export function AiPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, pending]);

  async function handleSend(text: string) {
    const content = text.trim();
    if (!content || pending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setError(null);
    setPending(true);

    try {
      const reply = await sendAiMessage(nextMessages);
      setMessages((current) => [...current, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The assistant is unavailable right now. Please try again.');
    } finally {
      setPending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend(input);
    }
  }

  function handleReset() {
    setMessages([]);
    setError(null);
    setInput('');
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow="Quanta AI"
        title="Your AI study companion"
        description="Ask about concepts, mistakes, or topics. Quanta AI explains, quizzes, and points you to what to revise next."
        actions={
          messages.length > 0 && (
            <Button variant="outline" size="sm" icon={<RotateCcw className="h-4 w-4" />} onClick={handleReset} disabled={pending}>
              New chat
            </Button>
          )
        }
      />

      <section className="surface flex h-[65vh] min-h-[420px] flex-col overflow-hidden">
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6" aria-live="polite">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                <Sparkles className="h-7 w-7" aria-hidden />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">What would you like to work on?</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Pick a starting point or type your own question.</p>
              </div>
              <div className="grid w-full max-w-xl gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void handleSend(suggestion)}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-800 transition duration-200 hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-soft dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-primary-500"
                  >
                    <Bot className="h-4 w-4 shrink-0 text-primary-700 dark:text-primary-300" aria-hidden />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => <ChatBubble key={index} message={message} />)
          )}
          {pending && <TypingBubble />}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div role="alert" className="border-t border-error-500/20 bg-error-50 px-4 py-3 text-sm text-error-700 sm:px-6 dark:bg-error-600/10 dark:text-error-500">
            {error}
          </div>
        )}

        <form
          className="flex items-end gap-2 border-t border-slate-200 p-3 sm:p-4 dark:border-slate-800"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSend(input);
          }}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            maxLength={MAX_INPUT_CHARS}
            placeholder="Ask a question..."
            aria-label="Message Quanta AI"
            className="input-base max-h-40 min-h-11 resize-none"
          />
          <Button type="submit" disabled={!input.trim()} loading={pending} aria-label="Send message" className="h-11 w-11 shrink-0 p-0">
            {!pending && <Send className="h-4 w-4" aria-hidden />}
          </Button>
        </form>
      </section>
    </div>
  );
}
