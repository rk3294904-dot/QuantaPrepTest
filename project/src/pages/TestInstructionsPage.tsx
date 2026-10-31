import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock, Crown, Eye, FileQuestion, Maximize2, Target, Trophy, Minus } from 'lucide-react';
import { VIOLATION_LIMIT } from '@/lib/constants';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { errorMessage, formatDate } from '@/lib/utils';
import { getTest } from '@/services/testService';
import { getInProgressAttempt, startAttempt } from '@/services/attemptService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MathText } from '@/components/ui/MathText';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { PremiumModal } from '@/components/ui/PremiumModal';
import { difficultyTone } from '@/components/tests/TestCard';

export function TestInstructionsPage() {
  const { testId = '' } = useParams();
  const { firebaseUser, profile, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const uid = firebaseUser?.uid ?? '';
  const [premiumOpen, setPremiumOpen] = useState(false);

  const testQuery = useQuery({ queryKey: ['test', testId], queryFn: () => getTest(testId), enabled: Boolean(testId) });
  const openAttemptQuery = useQuery({
    queryKey: ['open-attempt', uid, testId],
    queryFn: () => getInProgressAttempt(uid, testId),
    enabled: Boolean(uid && testId),
  });

  const startMutation = useMutation({
    mutationFn: () => {
      if (!testQuery.data) throw new Error('This test is not available.');
      return startAttempt(uid, testQuery.data);
    },
    onSuccess: () => navigate(`/tests/${testId}/attempt`),
    onError: (error) => toast.error('Could not start the test', errorMessage(error, 'Please try again.')),
  });

  if (testQuery.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-12 sm:px-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (testQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState onRetry={() => void testQuery.refetch()} />
      </div>
    );
  }

  const test = testQuery.data;
  const canView = test && (test.status === 'published' || isAdmin);
  if (!test || !canView) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={FileQuestion}
          title="Test not available"
          description="This test is unpublished or no longer exists."
          action={<Link to="/categories" className="text-sm font-semibold text-primary-700">Back to test series</Link>}
        />
      </div>
    );
  }

  const isPreview = test.status === 'draft';
  const locked = test.isPaid && !profile?.isPremium && !isAdmin;
  const canStart = !isPreview && !locked;
  const openAttempt = openAttemptQuery.data;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      {isPreview && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-secondary-200 bg-secondary-50 p-4 text-sm text-secondary-900 dark:border-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-100">
          <Eye className="h-5 w-5 shrink-0" />
          <p>Preview mode. This test is a draft, so students cannot see or start it yet.</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 animate-fade-up">
          <div className="flex flex-wrap gap-2">
            <Badge tone={test.isPaid ? 'secondary' : 'success'}>{test.isPaid ? 'Premium' : 'Free'}</Badge>
            <Badge tone={difficultyTone[test.difficulty]}>{test.difficulty}</Badge>
            <Badge>{test.language}</Badge>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">{test.title}</h1>
          {test.description && <p className="mt-3 text-lg text-slate-600 dark:text-slate-400">{test.description}</p>}

          <div className="surface mt-8 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Instructions</h2>
            <div className="mt-4 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {test.instructions ? (
                <MathText text={test.instructions} />
              ) : (
                <p>Read each question carefully. Select one option per question and submit before the timer ends.</p>
              )}
            </div>
            <ul className="mt-6 space-y-3 border-t border-slate-100 pt-6 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
              <li className="flex gap-3"><Target className="mt-0.5 h-4 w-4 shrink-0 text-accent-700" /> Correct answers earn the marks set for each question.</li>
              <li className="flex gap-3"><Minus className="mt-0.5 h-4 w-4 shrink-0 text-error-600" /> Wrong answers deduct the penalty set for each question, or {test.negativeMarks} mark{test.negativeMarks === 1 ? '' : 's'} by default. Skipped questions score zero.</li>
              <li className="flex gap-3"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-700" /> Your answers autosave every 30 seconds, and the test auto-submits when time runs out.</li>
              <li className="flex gap-3"><Maximize2 className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" /> The test runs in full-screen. Switching tabs or leaving full-screen counts as a warning, and {VIOLATION_LIMIT} warnings submit your test automatically. Copy, paste, and right-click are disabled.</li>
              <li className="flex gap-3"><Trophy className="mt-0.5 h-4 w-4 shrink-0 text-secondary-600" /> Only your first attempt counts toward the leaderboard rank.</li>
            </ul>
          </div>
        </div>

        <aside className="animate-fade-up [animation-delay:100ms]">
          <div className="surface sticky top-24 space-y-6 p-6">
            <dl className="grid grid-cols-2 gap-4">
              <Detail icon={Clock} label="Duration" value={`${test.durationMinutes} min`} />
              <Detail icon={Target} label="Total marks" value={String(test.totalMarks)} />
              <Detail icon={FileQuestion} label="Questions" value={String(test.questionCount)} />
              <Detail icon={Minus} label="Negative" value={`-${test.negativeMarks}`} />
            </dl>
            <p className="text-xs text-slate-500 dark:text-slate-400">Published {formatDate(test.createdAt)}</p>

            {locked ? (
              <div className="rounded-2xl bg-secondary-50 p-4 dark:bg-secondary-900/30">
                <p className="flex items-center gap-2 font-semibold text-secondary-900 dark:text-secondary-100">
                  <Crown className="h-4 w-4" /> Premium test
                </p>
                <p className="mt-1 text-sm text-secondary-800 dark:text-secondary-200">
                  Unlock this test and all other premium tests by upgrading to the premium plan with your coins.
                </p>
                <Button
                  className="mt-3 w-full"
                  variant="secondary"
                  icon={<Crown className="h-4 w-4" />}
                  onClick={() => setPremiumOpen(true)}
                >
                  Buy premium with coins
                </Button>
              </div>
            ) : null}

            {canStart && openAttempt ? (
              <Button className="w-full" size="lg" onClick={() => navigate(`/tests/${testId}/attempt`)} icon={<ArrowRight className="h-4 w-4" />}>
                Resume test
              </Button>
            ) : canStart ? (
              <Button className="w-full" size="lg" loading={startMutation.isPending || openAttemptQuery.isLoading} onClick={() => startMutation.mutate()}>
                Start test
              </Button>
            ) : (
              <Button className="w-full" size="lg" disabled>
                {isPreview ? 'Not available in preview' : 'Premium only'}
              </Button>
            )}

            {test.status === 'published' && (
              <Link to={`/leaderboard/${test.id}`} className="block">
                <Button variant="outline" className="w-full" icon={<Trophy className="h-4 w-4" />}>
                  View leaderboard
                </Button>
              </Link>
            )}
            {isAdmin && (
              <Link to={`/admin/tests/${test.id}/questions`} className="block text-center text-sm font-semibold text-secondary-700 dark:text-secondary-300">
                Edit questions in admin
              </Link>
            )}
          </div>
        </aside>
      </div>

      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
      <dt className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
      </dt>
      <dd className="mt-1 font-semibold text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}
