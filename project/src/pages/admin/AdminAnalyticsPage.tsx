import { useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Test } from '@/lib/types';
import { listAllTests } from '@/services/testService';
import { countTestAttempts, getTestAnalytics } from '@/services/adminService';
import { Badge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/Feedback';

const COUNTED_TESTS = 20;

export function AdminAnalyticsPage() {
  const testsQuery = useQuery({ queryKey: ['admin', 'tests'], queryFn: listAllTests });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const tests = testsQuery.data ?? [];
  const counted = tests.slice(0, COUNTED_TESTS);
  const countQueries = useQueries({
    queries: counted.map((test) => ({
      queryKey: ['admin', 'attempt-count', test.id],
      queryFn: () => countTestAttempts(test.id),
    })),
  });

  const selected = tests.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description={`Attempt counts cover the ${COUNTED_TESTS} most recent tests. Select a test to see its average score and most-missed questions, based on its latest 200 submissions.`}
      />

      {testsQuery.isLoading ? (
        <Skeleton className="h-72" />
      ) : testsQuery.isError ? (
        <ErrorState onRetry={() => void testsQuery.refetch()} />
      ) : tests.length === 0 ? (
        <EmptyState icon={BarChart3} title="No tests yet" description="Analytics appear once tests have attempts." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <section className="surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Test</th>
                    <th className="px-5 py-3 text-right font-semibold">Attempts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {tests.map((test) => {
                    const countIndex = counted.findIndex((c) => c.id === test.id);
                    const countResult = countIndex >= 0 ? countQueries[countIndex] : undefined;
                    return (
                      <tr
                        key={test.id}
                        onClick={() => setSelectedId(test.id)}
                        className={cn(
                          'cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40',
                          selectedId === test.id && 'bg-primary-50/60 dark:bg-primary-900/30',
                        )}
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{test.title}</p>
                          <div className="mt-1">
                            <Badge tone={test.status === 'published' ? 'success' : 'warning'}>{test.status}</Badge>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold text-slate-800 dark:text-slate-200">
                          {countResult === undefined ? (
                            <span className="text-slate-400">-</span>
                          ) : countResult.isLoading ? (
                            <Skeleton className="ml-auto h-4 w-10" />
                          ) : countResult.isError ? (
                            <span className="text-error-600 dark:text-error-500">Error</span>
                          ) : (
                            countResult.data
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <TestDetail test={selected} />
        </div>
      )}
    </div>
  );
}

function TestDetail({ test }: { test: Test | null }) {
  const analyticsQuery = useQuery({
    queryKey: ['admin', 'analytics', test?.id],
    queryFn: () => getTestAnalytics(test?.id ?? ''),
    enabled: Boolean(test),
  });

  if (!test) {
    return (
      <EmptyState icon={BarChart3} title="Pick a test" description="Choose a test on the left to see how students are doing." />
    );
  }

  if (analyticsQuery.isLoading) return <Skeleton className="h-96" />;
  if (analyticsQuery.isError) return <ErrorState onRetry={() => void analyticsQuery.refetch()} />;

  const data = analyticsQuery.data;
  if (!data) return null;

  return (
    <section className="surface space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{test.title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Based on the latest {data.sampleSize} submitted attempts</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Average score</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {data.averageScore === null ? '-' : data.averageScore.toFixed(1)}
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400"> / {test.totalMarks}</span>
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Average score rate</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {data.averageScore === null || test.totalMarks <= 0 ? '-' : `${Math.round((data.averageScore / test.totalMarks) * 100)}%`}
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Most-missed questions</h3>
        {data.mostMissed.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            No wrong answers recorded yet.
          </p>
        ) : (
          <ol className="space-y-2">
            {data.mostMissed.map((item, index) => (
              <li key={item.questionId} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-error-50 text-xs font-bold text-error-600 dark:bg-error-600/15 dark:text-error-500">
                  {index + 1}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-200">{item.text}</p>
                <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{item.misses} wrong</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
