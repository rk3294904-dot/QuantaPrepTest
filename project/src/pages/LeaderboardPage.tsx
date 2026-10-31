import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Medal } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { LEADERBOARD_LIMIT } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getTest } from '@/services/testService';
import { listTopEntries } from '@/services/leaderboardService';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/Feedback';

export function LeaderboardPage() {
  const { testId = '' } = useParams();
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? '';

  const testQuery = useQuery({ queryKey: ['test', testId], queryFn: () => getTest(testId), enabled: Boolean(testId) });
  const entriesQuery = useQuery({
    queryKey: ['leaderboard', testId],
    queryFn: () => listTopEntries(testId),
    enabled: Boolean(testId),
  });

  const header = (
    <PageHeader
      eyebrow="Quanta Rank"
      title={testQuery.data?.title ?? 'Leaderboard'}
      description={`Top ${LEADERBOARD_LIMIT} students by first-attempt score. Ties share a rank.`}
      actions={
        <Link to={`/tests/${testId}`}>
          <Button variant="outline">Back to test</Button>
        </Link>
      }
    />
  );

  if (entriesQuery.isLoading || testQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
        {header}
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (entriesQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {header}
        <div className="mt-8"><ErrorState onRetry={() => void entriesQuery.refetch()} /></div>
      </div>
    );
  }

  const entries = entriesQuery.data ?? [];
  let currentRank = 0;
  let previousScore: number | null = null;
  const ranked = entries.map((entry, index) => {
    if (entry.score !== previousScore) {
      currentRank = index + 1;
      previousScore = entry.score;
    }
    return { ...entry, rank: currentRank };
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      {header}
      {ranked.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={Trophy} title="No ranks yet" description="Be the first to finish this test and claim the top spot." />
        </div>
      ) : (
        <div className="surface mt-8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Rank</th>
                  <th className="px-6 py-3 font-semibold">Student</th>
                  <th className="px-6 py-3 text-right font-semibold">Score</th>
                  <th className="px-6 py-3 text-right font-semibold">Accuracy</th>
                  <th className="px-6 py-3 text-right font-semibold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ranked.map((entry) => {
                  const isMe = entry.id === uid;
                  return (
                    <tr key={entry.id} className={cn('transition', isMe ? 'bg-primary-50 dark:bg-primary-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40')}>
                      <td className="px-6 py-4">
                        <span className={cn('inline-flex min-w-8 items-center gap-1 font-bold', entry.rank <= 3 ? 'text-secondary-700 dark:text-secondary-300' : 'text-slate-700 dark:text-slate-300')}>
                          {entry.rank <= 3 && <Medal className="h-4 w-4" aria-hidden />}
                          {entry.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {entry.photoURL ? (
                            <img src={entry.photoURL} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                              {entry.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {entry.name}
                            {isMe && <span className="ml-2 text-xs font-semibold text-primary-700 dark:text-primary-300">(you)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-900 dark:text-slate-100">{entry.score}</td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">{entry.accuracy}%</td>
                      <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-400">{Math.round(entry.timeTaken / 60)} min</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
