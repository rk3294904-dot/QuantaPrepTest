import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LayoutGrid, Send, Clock } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { VIOLATION_LIMIT } from '@/lib/constants';
import type { Attempt, Question, Test } from '@/lib/types';
import { cn, errorMessage, formatClock } from '@/lib/utils';
import {
  closeAttempt,
  finalizeAttempt,
  type LeaderboardIdentity,
} from '@/services/attemptService';
import { setBookmark } from '@/services/bookmarkService';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Logo } from '@/components/layout/Logo';
import { useExamProgress } from '@/features/exam/useExamProgress';
import { countByStatus } from '@/features/exam/examStatus';
import { QuestionPalette, SectionTabs } from '@/features/exam/QuestionPalette';
import { QuestionPanel } from '@/features/exam/QuestionPanel';
import { SaveIndicator } from '@/features/exam/SaveIndicator';
import { useExamIntegrity } from '@/features/exam/useExamIntegrity';
import { ExamWatermark, FullscreenGate, ViolationWarning } from '@/features/exam/ExamGuards';

interface ExamScreenProps {
  test: Test;
  questions: Question[];
  attempt: Attempt;
  uid: string;
  bookmarkedIds: Set<string>;
  identity: LeaderboardIdentity;
  studentLabel: string;
}

const WARNING_MS = 5 * 60_000;
const CRITICAL_MS = 60_000;

function blockEvent(event: SyntheticEvent) {
  event.preventDefault();
}

export function ExamScreen({ test, questions, attempt, uid, bookmarkedIds, identity, studentLabel }: ExamScreenProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [tickAt, setTickAt] = useState(() => performance.now());
  const [clock] = useState(() => ({
    startedAtPerf: performance.now(),
    remainingAtStartMs: test.durationMinutes * 60_000 - (Date.now() - (attempt.startedAt?.getTime() ?? Date.now())),
  }));
  const submittedRef = useRef(false);

  const { progress, update, getProgress, save, saveState, lastSavedAt } = useExamProgress(attempt, !submitting);

  // Counts down on the monotonic clock, so changing the device time mid-test has no effect.
  const remainingMs = clock.remainingAtStartMs - (tickAt - clock.startedAtPerf);
  const expired = remainingMs <= 0;
  const examActive = !submitting && !expired;

  const recordViolation = useCallback(() => {
    update((previous) => ({ ...previous, violations: previous.violations + 1 }));
    setWarningOpen(true);
  }, [update]);
  const { fullscreenRequired, inFullscreen, enterFullscreen } = useExamIntegrity({
    active: examActive,
    onViolation: recordViolation,
  });

  const current = questions[currentIndex];
  const currentId = current?.id;
  const sections = useMemo(() => Array.from(new Set(questions.map((q) => q.section))), [questions]);
  const activeSection = current?.section;
  const questionIds = useMemo(() => questions.map((q) => q.id), [questions]);
  const counts = countByStatus(progress, questionIds);
  const answeredCount = counts.answered;

  const handleSubmit = useCallback(
    async (reason: 'manual' | 'timeout' | 'violation') => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setConfirmOpen(false);
      try {
        await closeAttempt(attempt.id, getProgress());
      } catch (error) {
        submittedRef.current = false;
        setSubmitting(false);
        toast.error('Submission failed', errorMessage(error, 'Check your connection and try again.'));
        return;
      }
      // Scoring can fail on a flaky connection; the results page retries it from the stored attempt.
      try {
        await finalizeAttempt(attempt.id, identity);
      } catch {
        toast.info('Scoring is still in progress', 'Your results page will finish the calculation.');
      }
      if (reason === 'timeout') {
        toast.info("Time's up", 'Your test was submitted automatically.');
      } else if (reason === 'violation') {
        toast.error('Test submitted', 'You reached the warning limit, so your test was submitted automatically.');
      } else {
        toast.success('Test submitted', 'Here is how you did.');
      }
      navigate(`/results/${attempt.id}`, { replace: true });
    },
    [attempt.id, getProgress, identity, navigate, toast],
  );

  useEffect(() => {
    if (expired) void handleSubmit('timeout');
  }, [expired, handleSubmit]);

  useEffect(() => {
    if (progress.violations >= VIOLATION_LIMIT) void handleSubmit('violation');
  }, [progress.violations, handleSubmit]);

  useEffect(() => {
    if (!currentId) return;
    update((previous) =>
      previous.timeSpent[currentId] !== undefined
        ? previous
        : { ...previous, timeSpent: { ...previous.timeSpent, [currentId]: 0 } },
    );
  }, [currentId, update]);

  useEffect(() => {
    if (!currentId) return;
    const intervalId = window.setInterval(() => {
      setTickAt(performance.now());
      update((previous) => ({
        ...previous,
        timeSpent: { ...previous.timeSpent, [currentId]: (previous.timeSpent[currentId] ?? 0) + 1 },
      }));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [currentId, update]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (submittedRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const bookmarkMutation = useMutation({
    mutationFn: ({ questionId, enabled }: { questionId: string; enabled: boolean }) =>
      setBookmark(uid, test.id, questionId, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookmarks', uid] }),
    onError: (error) => toast.error('Bookmark failed', errorMessage(error, 'Please try again.')),
  });

  const goTo = (index: number) => {
    if (index < 0 || index >= questions.length) return;
    setCurrentIndex(index);
    setPaletteOpen(false);
  };

  const exitToInstructions = async () => {
    await save();
    navigate(`/tests/${test.id}`);
  };

  if (!current) {
    return null;
  }

  const selected = progress.answers[current.id];
  const marked = progress.markedForReview.includes(current.id);
  const isLast = currentIndex === questions.length - 1;
  const timerTone =
    remainingMs <= CRITICAL_MS ? 'text-error-600 dark:text-error-500' : remainingMs <= WARNING_MS ? 'text-warning-600 dark:text-warning-500' : 'text-slate-900 dark:text-white';

  return (
    <div
      className="min-h-screen select-none bg-slate-50 dark:bg-slate-950"
      onContextMenu={blockEvent}
      onCopy={blockEvent}
      onCut={blockEvent}
      onPaste={blockEvent}
    >
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="hidden sm:block">
              <Logo compact />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{test.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {answeredCount}/{questions.length} answered
                {progress.violations > 0 ? (
                  <span className="text-error-600 dark:text-error-500"> · {progress.violations}/{VIOLATION_LIMIT} warnings</span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={cn(
                'flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-mono text-lg font-bold tabular-nums shadow-sm dark:border-slate-800 dark:bg-slate-900',
                timerTone,
              )}
              role="timer"
              aria-label={`Time remaining ${formatClock(remainingMs / 1000)}`}
            >
              <Clock className="h-4 w-4" aria-hidden />
              {formatClock(remainingMs / 1000)}
            </div>
            <div className="hidden sm:block">
              <SaveIndicator state={saveState} savedAt={lastSavedAt} />
            </div>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Open question palette"
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <Button size="sm" variant="accent" onClick={() => setConfirmOpen(true)} disabled={submitting} icon={<Send className="h-4 w-4" />}>
              Submit
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 pb-32 sm:px-6 sm:pb-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTabs
              sections={sections}
              activeSection={activeSection}
              onSelect={(section) => goTo(questions.findIndex((q) => q.section === section))}
            />
            <button type="button" onClick={() => void exitToInstructions()} className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200">
              Save & exit
            </button>
          </div>

          <QuestionPanel
            question={current}
            number={currentIndex + 1}
            total={questions.length}
            selected={selected}
            marked={marked}
            bookmarked={bookmarkedIds.has(`${uid}_${current.id}`)}
            isFirst={currentIndex === 0}
            isLast={isLast}
            onSelect={(option) => update((p) => ({ ...p, answers: { ...p.answers, [current.id]: option } }))}
            onClear={() =>
              update((p) => {
                const answers = { ...p.answers };
                delete answers[current.id];
                return { ...p, answers };
              })
            }
            onToggleMark={() =>
              update((p) => ({
                ...p,
                markedForReview: p.markedForReview.includes(current.id)
                  ? p.markedForReview.filter((id) => id !== current.id)
                  : [...p.markedForReview, current.id],
              }))
            }
            onToggleBookmark={() =>
              bookmarkMutation.mutate({ questionId: current.id, enabled: !bookmarkedIds.has(`${uid}_${current.id}`) })
            }
            onPrevious={() => goTo(currentIndex - 1)}
            onNext={() => goTo(currentIndex + 1)}
            onSaveAndNext={() => goTo(currentIndex + 1)}
            onMarkAndNext={() => {
              if (!marked) {
                update((p) => ({ ...p, markedForReview: [...p.markedForReview, current.id] }));
              }
              goTo(currentIndex + 1);
            }}
          />
        </div>

        <aside className="hidden lg:block">
          <div className="surface sticky top-28 p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">Questions</h2>
            <QuestionPalette
              questions={questions}
              activeSection={activeSection}
              currentIndex={currentIndex}
              progress={progress}
              onJump={goTo}
            />
          </div>
        </aside>
      </div>

      <Modal open={paletteOpen} onClose={() => setPaletteOpen(false)} title="Question palette">
        <QuestionPalette
          questions={questions}
          activeSection={activeSection}
          currentIndex={currentIndex}
          progress={progress}
          onJump={goTo}
        />
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit test?"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Keep attempting
            </Button>
            <Button variant="accent" onClick={() => void handleSubmit('manual')} loading={submitting}>
              Submit now
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">You cannot change your answers after submitting.</p>
        <dl className="mt-5 grid grid-cols-2 gap-3">
          {[
            { label: 'Answered', value: counts.answered, className: 'text-accent-700 dark:text-accent-400' },
            { label: 'Not answered', value: counts.notAnswered, className: 'text-error-600 dark:text-error-500' },
            { label: 'Marked for review', value: counts.marked, className: 'text-secondary-700 dark:text-secondary-300' },
            { label: 'Not visited', value: counts.notVisited, className: 'text-slate-600 dark:text-slate-300' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <dt className="text-xs text-slate-500 dark:text-slate-400">{item.label}</dt>
              <dd className={cn('mt-1 text-2xl font-bold', item.className)}>{item.value}</dd>
            </div>
          ))}
        </dl>
      </Modal>

      <ExamWatermark label={studentLabel} />
      {examActive && fullscreenRequired && !inFullscreen ? <FullscreenGate onEnter={enterFullscreen} /> : null}
      <ViolationWarning open={warningOpen} count={progress.violations} onClose={() => setWarningOpen(false)} />
    </div>
  );
}
