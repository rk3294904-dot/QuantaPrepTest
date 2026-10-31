import { Link } from 'react-router-dom';
import { Clock, FileQuestion, Target } from 'lucide-react';
import type { Test } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

export const difficultyTone = {
  easy: 'success',
  medium: 'warning',
  hard: 'error',
} as const;

export function TestCard({ test }: { test: Test }) {
  return (
    <Link
      to={`/tests/${test.id}`}
      className="surface group flex flex-col gap-4 p-6 transition duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lift dark:hover:border-primary-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone={test.isPaid ? 'secondary' : 'success'}>{test.isPaid ? 'Premium' : 'Free'}</Badge>
          <Badge tone={difficultyTone[test.difficulty]}>{test.difficulty}</Badge>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{test.language}</span>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-900 transition group-hover:text-primary-700 dark:text-slate-100 dark:group-hover:text-primary-300">
          {test.title}
        </h3>
        {test.description && <p className="mt-1.5 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{test.description}</p>}
      </div>
      <dl className={cn('mt-auto grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800')}>
        <Stat icon={Clock} label="Duration" value={`${test.durationMinutes} min`} />
        <Stat icon={Target} label="Marks" value={String(test.totalMarks)} />
        <Stat icon={FileQuestion} label="Questions" value={String(test.questionCount)} />
      </dl>
    </Link>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="mt-0.5 truncate font-semibold text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}
