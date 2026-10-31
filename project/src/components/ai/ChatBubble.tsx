import { Bot, User } from 'lucide-react';
import { MathText } from '@/components/ui/MathText';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/services/aiService';

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex items-end gap-3 animate-fade-up', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' : 'bg-primary-700 text-white',
        )}
        aria-hidden
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%]',
          isUser
            ? 'rounded-br-md bg-primary-700 text-white'
            : 'rounded-bl-md border border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100',
        )}
      >
        <MathText text={message.content} />
      </div>
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="flex items-end gap-3" role="status" aria-label="Quanta AI is typing">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-700 text-white" aria-hidden>
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-slate-200 bg-slate-50 px-4 py-3.5 dark:border-slate-800 dark:bg-slate-800">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500"
            style={{ animationDelay: `${dot * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
