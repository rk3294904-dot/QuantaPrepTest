import { Link, Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileQuestion, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getTest } from '@/services/testService';
import { listQuestions } from '@/services/questionService';
import { getInProgressAttempt } from '@/services/attemptService';
import { listBookmarks } from '@/services/bookmarkService';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';
import { ExamScreen } from '@/features/exam/ExamScreen';

export function TestTakingPage() {
  const { testId = '' } = useParams();
  const { firebaseUser, profile } = useAuth();
  const uid = firebaseUser?.uid ?? '';

  const testQuery = useQuery({ queryKey: ['test', testId], queryFn: () => getTest(testId), enabled: Boolean(testId) });
  const questionsQuery = useQuery({
    queryKey: ['questions', testId],
    queryFn: () => listQuestions(testId),
    enabled: Boolean(testId),
  });
  const attemptQuery = useQuery({
    queryKey: ['open-attempt', uid, testId],
    queryFn: () => getInProgressAttempt(uid, testId),
    enabled: Boolean(uid && testId),
    staleTime: 0,
  });
  const bookmarksQuery = useQuery({
    queryKey: ['bookmarks', uid],
    queryFn: () => listBookmarks(uid),
    enabled: Boolean(uid),
  });

  const isLoading = testQuery.isLoading || questionsQuery.isLoading || attemptQuery.isLoading || bookmarksQuery.isLoading;
  const isError = testQuery.isError || questionsQuery.isError || attemptQuery.isError;

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-80 w-full max-w-3xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <ErrorState
          message="We could not open this test. Check your connection and try again."
          onRetry={() => {
            void testQuery.refetch();
            void questionsQuery.refetch();
            void attemptQuery.refetch();
          }}
        />
      </div>
    );
  }

  const test = testQuery.data;
  const attempt = attemptQuery.data;

  if (!test) {
    return <Navigate to="/categories" replace />;
  }
  if (!attempt) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState
          icon={RotateCcw}
          title="No active attempt"
          description="This test is not in progress. Open the instructions page to start a new attempt."
          action={
            <Link to={`/tests/${testId}`}>
              <Button>Go to instructions</Button>
            </Link>
          }
        />
      </div>
    );
  }
  if (attempt.status === 'submitted') {
    return <Navigate to={`/results/${attempt.id}`} replace />;
  }
  if (!questionsQuery.data || questionsQuery.data.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <EmptyState icon={FileQuestion} title="This test has no questions" description="Please check back later." />
      </div>
    );
  }

  return (
    <ExamScreen
      key={attempt.id}
      test={test}
      questions={questionsQuery.data}
      attempt={attempt}
      uid={uid}
      bookmarkedIds={new Set((bookmarksQuery.data ?? []).map((b) => b.id))}
      identity={{ name: profile?.name ?? 'Student', photoURL: profile?.photoURL ?? null }}
      studentLabel={`${profile?.name ?? 'Student'} · ${firebaseUser?.email ?? uid}`}
    />
  );
}
