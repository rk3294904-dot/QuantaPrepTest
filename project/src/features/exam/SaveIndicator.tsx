import { CloudOff, Check, Loader2 } from 'lucide-react';
import type { SaveState } from '@/features/exam/useExamProgress';

export function SaveIndicator({ state, savedAt }: { state: SaveState; savedAt: Date | null }) {
  const time = savedAt ? savedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : null;

  if (state === 'error') {
    return (
      <span className="hidden items-center gap-1.5 text-xs font-medium text-error-600 md:inline-flex dark:text-error-500">
        <CloudOff className="h-4 w-4" /> Save failed, retrying
      </span>
    );
  }
  if (state === 'saving') {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-slate-500 md:inline-flex dark:text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving
      </span>
    );
  }
  if (state === 'saved' && time) {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-slate-500 md:inline-flex dark:text-slate-400">
        <Check className="h-3.5 w-3.5 text-accent-700" /> Saved {time}
      </span>
    );
  }
  return null;
}
