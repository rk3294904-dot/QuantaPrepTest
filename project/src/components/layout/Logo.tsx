import { Sigma } from 'lucide-react';
import { Link } from 'react-router-dom';
import { APP_NAME } from '@/lib/constants';

export function Logo({ to = '/', compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link to={to} className="group flex items-center gap-2.5" aria-label={`${APP_NAME} home`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-700 text-white shadow-sm transition group-hover:bg-primary-800 group-hover:rotate-3">
        <Sigma className="h-5 w-5" aria-hidden />
      </span>
      {!compact && <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{APP_NAME}</span>}
    </Link>
  );
}
