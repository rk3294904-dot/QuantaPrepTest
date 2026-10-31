import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList, FileText, Plus, Users } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { getPlatformCounts } from '@/services/adminService';
import { listRecentAttempts } from '@/services/attemptService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/Feedback';

export function AdminDashboardPage() {
  const countsQuery = useQuery({ queryKey: ['admin', 'counts'], queryFn: getPlatformCounts });
  const recentQuery = useQuery({ queryKey: ['admin', 'recent-attempts'], queryFn: () => listRecentAttempts(8) });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="A snapshot of students, content, and recent activity."
        actions={
          <Link to="/admin/tests/new">
            <Button icon={<Plus className="h-4 w-4" />}>New test</Button>
          </Link>
        }
      />

      {countsQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
      ) : countsQuery.isError ? (
        <ErrorState onRetry={() => void countsQuery.refetch()} />
      ) : (
        <section className="grid gap-4 sm:grid-cols-3">
          <CountCard icon={Users} label="Students" value={countsQuery.data?.users ?? 0} />
          <CountCard icon={ClipboardList} label="Tests" value={countsQuery.data?.tests ?? 0} />
          <CountCard icon={FileText} label="Attempts" value={countsQuery.data?.attempts ?? 0} />
        </section>
      )}

      <section className="surface overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Recent attempts</h2>
        </div>
        {recentQuery.isLoading ? (
          <div className="space-y-3 p-6"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : recentQuery.isError ? (
          <div className="p-6"><ErrorState onRetry={() => void recentQuery.refetch()} /></div>
        ) : (recentQuery.data ?? []).length === 0 ? (
          <div className="p-6"><EmptyState icon={FileText} title="No attempts yet" description="Attempts will appear here as students start tests." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Test</th>
                  <th className="px-6 py-3 font-semibold">Student</th>
                  <th className="px-6 py-3 font-semibold">Started</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(recentQuery.data ?? []).map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100">{attempt.testTitle}</td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{attempt.uid.slice(0, 10)}...</td>
                    <td className="px-6 py-3 text-slate-600 dark:text-slate-400">{formatDateTime(attempt.startedAt)}</td>
                    <td className="px-6 py-3">
                      <Badge tone={attempt.status === 'submitted' ? 'success' : 'warning'}>
                        {attempt.status === 'submitted' ? 'Submitted' : 'In progress'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function CountCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="surface flex items-center gap-4 p-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
