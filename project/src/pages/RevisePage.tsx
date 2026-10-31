import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { listUserAttempts } from '@/services/attemptService';
import { getAnswerKeys, listQuestions } from '@/services/questionService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MathText } from '@/components/ui/MathText';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/Feedback';

interface ReviseItem {
  id: string;
  testId: string;
  testTitle: string;
  text: string;
  options: string[];
  explanation: string;
  section: string;
  correctOption: number | undefined;
  selectedOption: number | undefined;
}

async function loadReviseItems(
  wrongByTest: Record<string, { title: string; answers: Record<string, number>; ids: string[] }>,
): Promise<ReviseItem[]> {
  const groups = await Promise.all(
    Object.entries(wrongByTest).map(async ([testId, group]) => {
      const [questions, keys] = await Promise.all([
        listQuestions(testId),
        getAnswerKeys(testId).catch(() => ({} as Record<string, number>)),
      ]);
      const wanted = new Set(group.ids);
      return questions
        .filter((q) => wanted.has(q.id))
        .map<ReviseItem>((q) => ({
          id: q.id,
          testId,
          testTitle: group.title,
          text: q.text,
          options: q.options,
          explanation: q.explanation,
          section: q.section,
          correctOption: keys[q.id],
          selectedOption: group.answers[q.id],
        }));
    }),
  );
  return groups.flat();
}

export function RevisePage() {
  const { firebaseUser } = useAuth();
  const uid = firebaseUser?.uid ?? '';

  const attemptsQuery = useQuery({
    queryKey: ['attempts', uid],
    queryFn: () => listUserAttempts(uid),
    enabled: Boolean(uid),
  });

  const submitted = (attemptsQuery.data ?? []).filter((a) => a.status === 'submitted' && a.wrongQuestionIds.length > 0);
  const wrongByTest: Record<string, { title: string; answers: Record<string, number>; ids: string[] }> = {};
  for (const attempt of submitted) {
    const group = wrongByTest[attempt.testId] ?? { title: attempt.testTitle, answers: {}, ids: [] };
    group.answers = { ...attempt.answers, ...group.answers };
    group.ids = Array.from(new Set([...group.ids, ...attempt.wrongQuestionIds]));
    wrongByTest[attempt.testId] = group;
  }
  const reviseKey = Object.entries(wrongByTest)
    .map(([testId, group]) => `${testId}:${group.ids.join(',')}`)
    .join('|');

  const reviseQuery = useQuery({
    queryKey: ['revise', uid, reviseKey],
    queryFn: () => loadReviseItems(wrongByTest),
    enabled: Boolean(uid) && attemptsQuery.isSuccess && submitted.length > 0,
  });

  const header = (
    <PageHeader
      eyebrow="Quanta Revise"
      title="Revisit what you got wrong"
      description="Every question you answered incorrectly in your submitted tests, with the right answer and explanation."
      actions={
        <Link to="/dashboard">
          <Button variant="outline">Back to dashboard</Button>
        </Link>
      }
    />
  );

  if (attemptsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
        {header}
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }
  if (attemptsQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {header}
        <div className="mt-8"><ErrorState onRetry={() => void attemptsQuery.refetch()} /></div>
      </div>
    );
  }
  if (submitted.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {header}
        <div className="mt-8">
          <EmptyState
            icon={Zap}
            title="Nothing to revise yet"
            description="Once you submit a test with wrong answers, they will appear here."
            action={<Link to="/categories"><Button>Take a test</Button></Link>}
          />
        </div>
      </div>
    );
  }

  const items = reviseQuery.data ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
      {header}
      {reviseQuery.isLoading ? (
        <div className="space-y-4"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      ) : reviseQuery.isError ? (
        <ErrorState message="We could not load your revision questions." onRetry={() => void reviseQuery.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No wrong answers to revise" description="You have no incorrect responses in your submitted tests." />
      ) : (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-400">{items.length} question{items.length === 1 ? '' : 's'} to revisit</p>
          {items.map((item, index) => (
            <article key={`${item.testId}_${item.id}`} className="surface p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">#{index + 1}</span>
                <Badge tone="primary">{item.testTitle}</Badge>
                <Badge tone="neutral">{item.section}</Badge>
              </div>
              <div className="mt-3 text-slate-900 dark:text-slate-100">
                <MathText text={item.text} />
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-error-50 p-3 dark:bg-error-600/15">
                  <dt className="text-xs font-semibold text-error-600 dark:text-error-500">Your answer</dt>
                  <dd className="mt-1 text-slate-800 dark:text-slate-200">
                    {item.selectedOption === undefined ? 'Not answered' : <MathText text={item.options[item.selectedOption] ?? ''} />}
                  </dd>
                </div>
                <div className="rounded-xl bg-accent-50 p-3 dark:bg-accent-900/30">
                  <dt className="text-xs font-semibold text-accent-700 dark:text-accent-400">Correct answer</dt>
                  <dd className="mt-1 text-slate-800 dark:text-slate-200">
                    {item.correctOption === undefined ? 'Unavailable' : <MathText text={item.options[item.correctOption] ?? ''} />}
                  </dd>
                </div>
              </dl>
              {item.explanation && (
                <div className="mt-4 text-sm text-slate-700 dark:text-slate-300">
                  <MathText text={item.explanation} />
                </div>
              )}
            </article>
          ))}
        </>
      )}
    </div>
  );
}
