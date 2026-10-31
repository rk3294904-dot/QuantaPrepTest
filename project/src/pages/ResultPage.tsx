import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, Download, MinusCircle, Trophy, XCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { cn, errorMessage, formatDurationWords, percent } from '@/lib/utils';
import type { AnswerValue, CategoryStat, Question, QuestionType } from '@/lib/types';
import { isAnswered, isCorrect, LETTERS } from '@/lib/scoring';
import { finalizeAttempt, getAttempt } from '@/services/attemptService';
import { getAnswerKeys, listQuestions } from '@/services/questionService';
import { getRankForScore } from '@/services/leaderboardService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MathText } from '@/components/ui/MathText';
import { ShareScoreCard } from '@/components/results/ShareScoreCard';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/Feedback';

const CHART_COLORS = { correct: '#0d9488', wrong: '#ef4444', skipped: '#94a3b8' };

interface Review {
  questions: Question[];
  keys: Record<string, string>;
  keysAvailable: boolean;
}

async function loadReview(testId: string): Promise<Review> {
  const questions = await listQuestions(testId);
  try {
    return { questions, keys: await getAnswerKeys(testId), keysAvailable: true };
  } catch {
    return { questions, keys: {}, keysAvailable: false };
  }
}

function formatUserAnswer(type: QuestionType, answer: AnswerValue | undefined): string {
  if (answer === undefined || !isAnswered(answer)) return '—';
  if (type === 'multiple' && Array.isArray(answer)) {
    return [...answer].sort((a, b) => a - b).map((i) => LETTERS[i] ?? '').join(', ');
  }
  if ((type === 'single' || type === 'true_false') && typeof answer === 'number') {
    return LETTERS[answer] ?? String(answer);
  }
  return String(answer);
}

function formatCorrectAnswer(type: QuestionType, correctAnswer: string): string {
  if (type === 'multiple') {
    return correctAnswer.split('|').sort().join(', ');
  }
  if (type === 'fill_blank') {
    return correctAnswer.split('|').join(' or ');
  }
  return correctAnswer;
}

function hasOptions(type: QuestionType): boolean {
  return type === 'single' || type === 'multiple';
}

function toChartData(stats: Record<string, CategoryStat>) {
  return Object.entries(stats).map(([name, s]) => ({ name, correct: s.correct, wrong: s.wrong, skipped: s.skipped }));
}

export function ResultPage() {
  const { attemptId = '' } = useParams();
  const { firebaseUser, profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const attemptQuery = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => getAttempt(attemptId),
    enabled: Boolean(attemptId),
  });
  const attempt = attemptQuery.data;
  const needsScoring = attempt?.status === 'submitted' && attempt.score === null;

  const scoreMutation = useMutation({
    mutationFn: () =>
      finalizeAttempt(attemptId, { name: profile?.name ?? 'Student', photoURL: profile?.photoURL ?? null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attempt', attemptId] }),
    onError: (error) => toast.error('Scoring failed', errorMessage(error, 'Please try again.')),
  });
  const { mutate: runScoring } = scoreMutation;

  useEffect(() => {
    if (needsScoring) runScoring();
  }, [needsScoring, runScoring]);

  const rankQuery = useQuery({
    queryKey: ['rank', attemptId],
    queryFn: () => getRankForScore(attempt?.testId ?? '', attempt?.score ?? 0),
    enabled: attempt?.attemptNo === 1 && attempt.score !== null,
  });

  const reviewQuery = useQuery({
    queryKey: ['review', attempt?.testId],
    queryFn: () => loadReview(attempt?.testId ?? ''),
    enabled: Boolean(attempt?.testId) && attempt?.status === 'submitted',
  });

  if (attemptQuery.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-12 sm:px-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40" />
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (attemptQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState onRetry={() => void attemptQuery.refetch()} />
      </div>
    );
  }
  if (!attempt || attempt.uid !== firebaseUser?.uid) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={XCircle}
          title="Result not found"
          description="This result does not exist or belongs to another account."
          action={<Link to="/dashboard"><Button variant="outline">Back to dashboard</Button></Link>}
        />
      </div>
    );
  }
  if (attempt.status !== 'submitted') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={MinusCircle}
          title="This attempt is still open"
          description="Finish the test to see your result."
          action={<Link to={`/tests/${attempt.testId}/attempt`}><Button>Resume test</Button></Link>}
        />
      </div>
    );
  }
  if (attempt.score === null) {
    if (scoreMutation.isError) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-16">
          <ErrorState message="We could not calculate your score yet. Check your connection and try again." onRetry={() => runScoring()} />
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-12 sm:px-6">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Calculating your score...</p>
        <Skeleton className="h-40" />
      </div>
    );
  }

  const correct = attempt.correctCount ?? 0;
  const wrong = attempt.wrongCount ?? 0;
  const skipped = attempt.skippedCount ?? 0;
  const accuracy = percent(correct, correct + wrong);
  const timeTaken = Object.values(attempt.timeSpent).reduce((sum, seconds) => sum + seconds, 0);
  const sectionData = toChartData(attempt.sectionStats);
  const topicData = toChartData(attempt.topicStats);
  const rank = attempt.attemptNo === 1 ? rankQuery.data : undefined;
  const review = reviewQuery.data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow={`Attempt ${attempt.attemptNo}`}
        title={attempt.testTitle}
        description={`Submitted ${attempt.submittedAt ? attempt.submittedAt.toLocaleString() : 'just now'}`}
        actions={
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" icon={<Download className="h-4 w-4" />} onClick={() => window.print()}>
              Download PDF
            </Button>
            <Link to={`/leaderboard/${attempt.testId}`}>
              <Button variant="secondary" icon={<Trophy className="h-4 w-4" />}>Leaderboard</Button>
            </Link>
          </div>
        }
      />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreCard label="Score" value={`${attempt.score} / ${attempt.totalMarks}`} highlight />
        <ScoreCard label="Accuracy" value={`${accuracy}%`} />
        <ScoreCard label="Rank" value={attempt.attemptNo === 1 ? (rank ? `#${rank}` : '...') : 'Practice'} hint={attempt.attemptNo === 1 ? 'First attempt' : 'Only first attempts are ranked'} />
        <ScoreCard label="Time spent" value={formatDurationWords(timeTaken)} />
      </section>

      <div className="mt-6">
        <ShareScoreCard
          studentName={profile?.name ?? 'Student'}
          testTitle={attempt.testTitle}
          score={attempt.score}
          totalMarks={attempt.totalMarks}
          date={attempt.submittedAt ?? new Date()}
        />
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <CountTile icon={CheckCircle2} label="Correct" value={correct} tone="text-accent-700 dark:text-accent-400" />
        <CountTile icon={XCircle} label="Wrong" value={wrong} tone="text-error-600 dark:text-error-500" />
        <CountTile icon={MinusCircle} label="Skipped" value={skipped} tone="text-slate-600 dark:text-slate-300" />
      </section>

      {(sectionData.length > 0 || topicData.length > 0) && (
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          {sectionData.length > 0 && <PerformanceChart title="Section-wise" data={sectionData} />}
          {topicData.length > 0 && <PerformanceChart title="Topic-wise" data={topicData} />}
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Question review</h2>
        {reviewQuery.isError ? (
          <div className="mt-4"><ErrorState message="We could not load the question review." onRetry={() => void reviewQuery.refetch()} /></div>
        ) : !review ? (
          <div className="mt-4 space-y-4"><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
        ) : (
          <div className="mt-4 space-y-4">
            {!review.keysAvailable && (
              <p className="rounded-xl bg-warning-50 p-4 text-sm text-warning-700 dark:bg-warning-600/15 dark:text-warning-500">
                Correct answers are unavailable right now, so only your responses are shown.
              </p>
            )}
            {review.questions.map((question, index) => {
              const selected = attempt.answers[question.id] as AnswerValue | undefined;
              const correctAnswer = review.keys[question.id];
              const answered = isAnswered(selected);
              const outcome: 'skipped' | 'correct' | 'wrong' | 'unknown' =
                !answered ? 'skipped'
                : correctAnswer === undefined ? 'unknown'
                : isCorrect(question.questionType, selected, correctAnswer, question.tolerance) ? 'correct' : 'wrong';
              const selectedIndices = Array.isArray(selected) ? selected : typeof selected === 'number' ? [selected] : [];
              const correctIndices = hasOptions(question.questionType) && correctAnswer !== undefined
                ? (question.questionType === 'multiple'
                    ? correctAnswer.split('|').map((l) => LETTERS.indexOf(l.toUpperCase())).filter((i) => i >= 0)
                    : [LETTERS.indexOf(correctAnswer.toUpperCase())].filter((i) => i >= 0))
                : [];
              return (
                <article key={question.id} className="surface p-5 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Q{index + 1}</span>
                    <Badge tone={outcome === 'correct' ? 'success' : outcome === 'wrong' ? 'error' : 'neutral'}>
                      {outcome === 'unknown' ? 'Answered' : outcome}
                    </Badge>
                    <Badge tone="primary">{question.section}</Badge>
                    <Badge tone="neutral">{question.questionType.replace('_', ' ')}</Badge>
                  </div>
                  <div className="mt-3 text-base text-slate-900 dark:text-slate-100">
                    <MathText text={question.text} />
                  </div>
                  {hasOptions(question.questionType) && question.options.length > 0 ? (
                    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                      {question.options.map((option, optionIndex) => {
                        const isCorrectOption = correctIndices.includes(optionIndex);
                        const isUserChoice = selectedIndices.includes(optionIndex);
                        return (
                          <li
                            key={optionIndex}
                            className={cn(
                              'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
                              isCorrectOption
                                ? 'border-accent-500 bg-accent-50 text-accent-900 dark:bg-accent-900/30 dark:text-accent-100'
                                : isUserChoice
                                  ? 'border-error-500 bg-error-50 text-error-700 dark:bg-error-600/15 dark:text-error-500'
                                  : 'border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-300',
                            )}
                          >
                            <span className="font-semibold">{String.fromCharCode(65 + optionIndex)}.</span>
                            <span className="min-w-0"><MathText text={option} /></span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex gap-3">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Your answer:</span>
                        <span className={cn(outcome === 'correct' ? 'text-accent-700 dark:text-accent-400' : outcome === 'wrong' ? 'text-error-600 dark:text-error-500' : 'text-slate-700 dark:text-slate-300')}>
                          {formatUserAnswer(question.questionType, selected)}
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <span className="font-semibold text-slate-500 dark:text-slate-400">Correct answer:</span>
                        <span className="text-accent-700 dark:text-accent-400">
                          {correctAnswer !== undefined ? formatCorrectAnswer(question.questionType, correctAnswer) : '—'}
                        </span>
                      </div>
                    </div>
                  )}
                  {question.explanation && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                      <p className="mb-1 font-semibold text-slate-900 dark:text-slate-100">Explanation</p>
                      <MathText text={question.explanation} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function ScoreCard({ label, value, hint, highlight = false }: { label: string; value: string; hint?: string; highlight?: boolean }) {
  return (
    <div className={cn('surface p-5', highlight && 'bg-primary-700 text-white dark:bg-primary-700')}>
      <p className={cn('text-xs font-semibold uppercase tracking-wide', highlight ? 'text-primary-100' : 'text-slate-500 dark:text-slate-400')}>{label}</p>
      <p className={cn('mt-2 text-2xl font-bold', highlight ? 'text-white' : 'text-slate-900 dark:text-white')}>{value}</p>
      {hint && <p className={cn('mt-1 text-xs', highlight ? 'text-primary-100' : 'text-slate-500 dark:text-slate-400')}>{hint}</p>}
    </div>
  );
}

function CountTile({ icon: Icon, label, value, tone }: { icon: typeof CheckCircle2; label: string; value: number; tone: string }) {
  return (
    <div className="surface flex items-center gap-4 p-5">
      <Icon className={cn('h-8 w-8', tone)} aria-hidden />
      <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function PerformanceChart({ title, data }: { title: string; data: Array<{ name: string; correct: number; wrong: number; skipped: number }> }) {
  return (
    <div className="surface p-5 sm:p-6">
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <div className="mt-4 h-64 text-slate-500 dark:text-slate-400">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.3} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fill: 'currentColor', fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="correct" fill={CHART_COLORS.correct} radius={[6, 6, 0, 0]} />
            <Bar dataKey="wrong" fill={CHART_COLORS.wrong} radius={[6, 6, 0, 0]} />
            <Bar dataKey="skipped" fill={CHART_COLORS.skipped} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
