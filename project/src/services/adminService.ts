import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { listSubmittedTestAttempts } from '@/services/attemptService';
import { listQuestions } from '@/services/questionService';

// Aggregate counts are billed per index entry, not per document read.
export async function getPlatformCounts() {
  const [users, tests, attempts] = await Promise.all(
    ['users', 'tests', 'attempts'].map((name) => getCountFromServer(collection(db, name))),
  );
  return {
    users: users.data().count,
    tests: tests.data().count,
    attempts: attempts.data().count,
  };
}

export async function countTestAttempts(testId: string) {
  const snap = await getCountFromServer(query(collection(db, 'attempts'), where('testId', '==', testId)));
  return snap.data().count;
}

export interface MostMissedQuestion {
  questionId: string;
  text: string;
  misses: number;
}

export interface TestAnalytics {
  sampleSize: number;
  averageScore: number | null;
  mostMissed: MostMissedQuestion[];
}

// Uses the most recent submitted attempts only, so the cost stays bounded regardless of test size.
export async function getTestAnalytics(testId: string): Promise<TestAnalytics> {
  const [attempts, questions] = await Promise.all([listSubmittedTestAttempts(testId, 200), listQuestions(testId)]);
  const scored = attempts.flatMap((a) => (a.score === null ? [] : [a.score]));
  const averageScore = scored.length ? scored.reduce((sum, score) => sum + score, 0) / scored.length : null;

  const misses = new Map<string, number>();
  for (const attempt of attempts) {
    for (const questionId of attempt.wrongQuestionIds) {
      misses.set(questionId, (misses.get(questionId) ?? 0) + 1);
    }
  }
  const byId = new Map(questions.map((q) => [q.id, q]));
  const mostMissed = [...misses.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([questionId, count]) => ({
      questionId,
      text: byId.get(questionId)?.text ?? 'This question was removed',
      misses: count,
    }));

  return { sampleSize: attempts.length, averageScore, mostMissed };
}
