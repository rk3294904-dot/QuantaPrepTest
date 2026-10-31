import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowUpRight, BookMarked, Clock, FileText, Flame, Play, Target, TrendingDown, TrendingUp, Zap, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime, percent } from '@/lib/utils';
import { listUserAttempts } from '@/services/attemptService';
import { listBookmarks } from '@/services/bookmarkService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/Feedback';

interface TopicRow {
  name: string;
  accuracy: number;
  attempted: number;
}

export function DashboardPage() {
  const { firebaseUser, profile } = useAuth();
  const uid = firebaseUser?.uid ?? '';

  const attemptsQuery = useQuery({
    queryKey: ['attempts', uid],
    queryFn: () => listUserAttempts(uid),
    enabled: Boolean(uid),
  });
  const bookmarksQuery = useQuery({
    queryKey: ['bookmarks', uid],
    queryFn: () => listBookmarks(uid),
    enabled: Boolean(uid),
  });

  const attempts = attemptsQuery.data ?? [];
  const submitted = attempts.filter((a) => a.status === 'submitted');
  const inProgress = attempts.filter((a) => a.status === 'in_progress');
  const trend = [...submitted].reverse().map((a, index) => ({
    name: `#${index + 1}`,
    percentScore: percent(a.score ?? 0, a.totalMarks),
    test: a.testTitle,
  }));
  const averagePct = submitted.length
    ? Math.round(trend.reduce((sum, point) => sum + point.percentScore, 0) / submitted.length)
    : 0;
  const bestPct = trend.reduce((best, point) => Math.max(best, point.percentScore), 0);
  const lastScore = trend.length > 0 ? trend[trend.length - 1].percentScore : 0;
  const prevScore = trend.length > 1 ? trend[trend.length - 2].percentScore : 0;
  const scoreDelta = lastScore - prevScore;

  const topics = useMemo<TopicRow[]>(() => {
    const totals: Record<string, { correct: number; attempted: number }> = {};
    for (const attempt of submitted) {
      for (const [topic, stat] of Object.entries(attempt.topicStats)) {
        const entry = totals[topic] ?? { correct: 0, attempted: 0 };
        entry.correct += stat.correct;
        entry.attempted += stat.correct + stat.wrong;
        totals[topic] = entry;
      }
    }
    return Object.entries(totals)
      .filter(([, entry]) => entry.attempted >= 3)
      .map(([name, entry]) => ({ name, accuracy: percent(entry.correct, entry.attempted), attempted: entry.attempted }))
      .sort((a, b) => b.accuracy - a.accuracy);
  }, [submitted]);

  const strong = topics.filter((t) => t.accuracy >= 70).slice(0, 4);
  const weak = [...topics].reverse().filter((t) => t.accuracy < 60).slice(0, 4);

  const pageHeader = (
    <PageHeader
      eyebrow="Dashboard"
      title={`Welcome back, ${profile?.name?.split(' ')[0] ?? 'there'}`}
      description="Track your attempts, spot weak topics, and revise what you got wrong."
      actions={
        <Link to="/categories">
          <Button variant="accent" icon={<Zap className="h-4 w-4" />}>Browse tests</Button>
        </Link>
      }
    />
  );

  if (attemptsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        {pageHeader}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Skeleton className="h-24 sm:h-32" /><Skeleton className="h-24 sm:h-32" /><Skeleton className="h-24 sm:h-32" /><Skeleton className="h-24 sm:h-32" />
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (attemptsQuery.isError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {pageHeader}
        <div className="mt-8"><ErrorState onRetry={() => void attemptsQuery.refetch()} /></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
      {pageHeader}

      {/* Hero gradient summary card */}
      {inProgress.length > 0 && (
        <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-primary-700 to-accent-700 p-5 text-white shadow-lift sm:p-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-white/80">Continue where you left off</p>
              <p className="mt-1 text-xl font-bold">{inProgress[0].testTitle}</p>
              <p className="mt-1 text-sm text-white/70">Attempt #{inProgress[0].attemptNo} · Started {formatDateTime(inProgress[0].startedAt)}</p>
            </div>
            <Link to={`/tests/${inProgress[0].testId}/attempt`}>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-primary-700 shadow-sm transition hover:bg-primary-50 active:scale-95"
              >
                <Play className="h-4 w-4 fill-primary-700" aria-hidden /> Resume test
              </button>
            </Link>
          </div>
        </section>
      )}

      {/* Stat tiles */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatTile icon={FileText} label="Tests submitted" value={String(submitted.length)} accent="primary" />
        <StatTile icon={Target} label="Average score" value={`${averagePct}%`} accent="accent" trend={submitted.length >= 2 ? scoreDelta : undefined} />
        <StatTile icon={Flame} label="Best score" value={`${bestPct}%`} accent="secondary" />
        <StatTile icon={BookMarked} label="Bookmarks" value={String(bookmarksQuery.data?.length ?? 0)} accent="success" />
      </section>

      {/* Performance trend chart */}
      <section className="surface p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Performance trend</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Score as % of total marks across all submitted attempts</p>
          </div>
          {trend.length > 0 && (
            <Badge tone={scoreDelta >= 0 ? 'success' : 'error'}>
              {scoreDelta >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {scoreDelta >= 0 ? '+' : ''}{scoreDelta}%
            </Badge>
          )}
        </div>
        {trend.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Target className="h-10 w-10 text-slate-300 dark:text-slate-700" aria-hidden />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Submit a test to see your performance trend here.</p>
          </div>
        ) : (
          <div className="mt-4 h-48 sm:mt-6 sm:h-64 text-slate-500 dark:text-slate-400">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'currentColor', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => [`${String(value)}%`, 'Score']}
                  labelFormatter={(_, payload) => String(payload?.[0]?.payload?.test ?? '')}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
                />
                <Area type="monotone" dataKey="percentScore" stroke="#0d9488" strokeWidth={3} fill="url(#scoreGradient)" dot={{ r: 4, fill: '#0d9488' }} activeDot={{ r: 6 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Strong & weak topics */}
      <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <TopicList title="Strong topics" icon={TrendingUp} tone="success" rows={strong} emptyText="Strong topics appear once you have answered at least 3 questions in a topic." />
        <TopicList title="Weak topics" icon={TrendingDown} tone="error" rows={weak} emptyText="No weak topics so far. Keep it up." />
      </section>

      {/* Attempt history */}
      <section className="surface overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Attempt history</h2>
        </div>
        {attempts.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Clock}
              title="No attempts yet"
              description="Pick a test from the test series to start your first attempt."
              action={<Link to="/categories"><Button>Browse test series</Button></Link>}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Test</th>
                  <th className="px-6 py-3 font-semibold">Started</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 text-right font-semibold">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                      {attempt.testTitle} <span className="text-xs text-slate-500">(attempt {attempt.attemptNo})</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{formatDateTime(attempt.startedAt)}</td>
                    <td className="px-6 py-4">
                      <Badge tone={attempt.status === 'submitted' ? 'success' : 'warning'}>
                        {attempt.status === 'submitted' ? 'Submitted' : 'In progress'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {attempt.status === 'submitted' ? (
                        <Link to={`/results/${attempt.id}`} className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:underline dark:text-primary-300">
                          {attempt.score ?? '-'} / {attempt.totalMarks}
                          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      ) : (
                        <Link to={`/tests/${attempt.testId}/attempt`} className="font-semibold text-accent-700 hover:underline dark:text-accent-400">
                          Resume
                        </Link>
                      )}
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

function StatTile({ icon: Icon, label, value, accent, trend }: { icon: LucideIcon; label: string; value: string; accent: 'primary' | 'accent' | 'secondary' | 'success'; trend?: number }) {
  const accentClasses: Record<typeof accent, string> = {
    primary: 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
    accent: 'bg-accent-50 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300',
    secondary: 'bg-secondary-50 text-secondary-700 dark:bg-secondary-900/40 dark:text-secondary-300',
    success: 'bg-success-50 text-success-700 dark:bg-success-600/15 dark:text-success-500',
  };
  return (
    <div className="surface p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-5">
      <div className="flex items-center justify-between">
        <span className={cnAccent('flex h-10 w-10 items-center justify-center rounded-xl sm:h-11 sm:w-11', accentClasses[accent])}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        {trend !== undefined && trend !== 0 && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${trend > 0 ? 'text-success-600 dark:text-success-500' : 'text-error-600 dark:text-error-500'}`}>
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="mt-2 text-xl font-bold text-slate-900 sm:mt-3 sm:text-2xl dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function cnAccent(base: string, accent: string): string {
  return `${base} ${accent}`;
}

function TopicList({
  title,
  icon: Icon,
  tone,
  rows,
  emptyText,
}: {
  title: string;
  icon: LucideIcon;
  tone: 'success' | 'error';
  rows: TopicRow[];
  emptyText: string;
}) {
  return (
    <div className="surface p-4 sm:p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
        <Icon className={tone === 'success' ? 'h-5 w-5 text-accent-700 dark:text-accent-400' : 'h-5 w-5 text-error-600 dark:text-error-500'} aria-hidden />
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.name}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-200">{row.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{row.accuracy}% · {row.attempted} Q</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={tone === 'success' ? 'h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-600 transition-all duration-500' : 'h-full rounded-full bg-gradient-to-r from-error-400 to-error-600 transition-all duration-500'}
                  style={{ width: `${row.accuracy}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
