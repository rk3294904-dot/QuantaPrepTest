import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'primary' | 'accent' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';

const tones: Record<Tone, string> = {
  primary: 'bg-primary-50 text-primary-800 ring-primary-200 dark:bg-primary-900/40 dark:text-primary-200 dark:ring-primary-800',
  accent: 'bg-accent-50 text-accent-800 ring-accent-200 dark:bg-accent-900/40 dark:text-accent-200 dark:ring-accent-800',
  secondary: 'bg-secondary-50 text-secondary-800 ring-secondary-200 dark:bg-secondary-900/40 dark:text-secondary-200 dark:ring-secondary-800',
  success: 'bg-success-50 text-success-700 ring-success-100 dark:bg-success-600/15 dark:text-success-500 dark:ring-success-600/30',
  warning: 'bg-warning-50 text-warning-700 ring-warning-100 dark:bg-warning-600/15 dark:text-warning-500 dark:ring-warning-600/30',
  error: 'bg-error-50 text-error-600 ring-error-100 dark:bg-error-600/15 dark:text-error-500 dark:ring-error-600/30',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
