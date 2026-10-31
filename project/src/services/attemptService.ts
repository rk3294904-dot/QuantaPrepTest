import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { scoreAttempt } from '@/lib/scoring';
import type { AnswerValue, Attempt, AttemptStatus, Test } from '@/lib/types';
import { asAnswerMap, asNumber, asNumberMap, asStatMap, asString, asStringArray, toDate } from '@/services/converters';
import { getTest } from '@/services/testService';
import { getAnswerKeys, listQuestions } from '@/services/questionService';

export interface AttemptProgress {
  answers: Record<string, AnswerValue>;
  markedForReview: string[];
  timeSpent: Record<string, number>;
  violations: number;
}

export interface LeaderboardIdentity {
  name: string;
  photoURL: string | null;
}

const attemptsRef = collection(db, 'attempts');

export function attemptIdFor(uid: string, testId: string, attemptNo: number) {
  return `${uid}_${testId}_${attemptNo}`;
}

function toAttempt(snap: DocumentSnapshot): Attempt {
  const data = snap.data() ?? {};
  return {
    id: snap.id,
    uid: asString(data.uid),
    testId: asString(data.testId),
    testTitle: asString(data.testTitle, 'Untitled test'),
    totalMarks: asNumber(data.totalMarks),
    attemptNo: asNumber(data.attemptNo, 1),
    startedAt: toDate(data.startedAt),
    submittedAt: toDate(data.submittedAt),
    status: asString(data.status, 'in_progress') as AttemptStatus,
    answers: asAnswerMap(data.answers),
    markedForReview: asStringArray(data.markedForReview),
    timeSpent: asNumberMap(data.timeSpent),
    score: typeof data.score === 'number' ? data.score : null,
    correctCount: typeof data.correctCount === 'number' ? data.correctCount : null,
    wrongCount: typeof data.wrongCount === 'number' ? data.wrongCount : null,
    skippedCount: typeof data.skippedCount === 'number' ? data.skippedCount : null,
    topicStats: asStatMap(data.topicStats),
    sectionStats: asStatMap(data.sectionStats),
    wrongQuestionIds: asStringArray(data.wrongQuestionIds),
    violations: asNumber(data.violations, 0),
  };
}

export async function getAttempt(attemptId: string): Promise<Attempt | null> {
  const snap = await getDoc(doc(db, 'attempts', attemptId));
  return snap.exists() ? toAttempt(snap) : null;
}

export async function getInProgressAttempt(uid: string, testId: string): Promise<Attempt | null> {
  const snap = await getDocs(
    query(
      attemptsRef,
      where('uid', '==', uid),
      where('testId', '==', testId),
      where('status', '==', 'in_progress'),
      limit(1),
    ),
  );
  return snap.empty ? null : toAttempt(snap.docs[0]);
}

export async function listUserAttempts(uid: string, max = 50): Promise<Attempt[]> {
  const snap = await getDocs(query(attemptsRef, where('uid', '==', uid), limit(max)));
  return snap.docs
    .map(toAttempt)
    .sort((a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0));
}

// Admin-only in practice: the rules let admins read every attempt. Bounded by `max`.
export async function listRecentAttempts(max = 50): Promise<Attempt[]> {
  const snap = await getDocs(query(attemptsRef, orderBy('startedAt', 'desc'), limit(max)));
  return snap.docs.map(toAttempt);
}

// Equality filters only, so no composite index is needed. Bounded by `max`.
export async function listSubmittedTestAttempts(testId: string, max = 200): Promise<Attempt[]> {
  const snap = await getDocs(
    query(attemptsRef, where('testId', '==', testId), where('status', '==', 'submitted'), limit(max)),
  );
  return snap.docs.map(toAttempt);
}

// Starts a new attempt, or returns the open one so a refresh resumes instead of creating a duplicate.
// The security rules reject creation for blocked users, unpublished tests, and premium-only tests.
export async function startAttempt(uid: string, test: Test): Promise<Attempt> {
  const open = await getInProgressAttempt(uid, test.id);
  if (open) return open;

  const previous = await getDocs(
    query(attemptsRef, where('uid', '==', uid), where('testId', '==', test.id)),
  );
  const highest = previous.docs.reduce((max, d) => Math.max(max, asNumber(d.data().attemptNo, 0)), 0);
  const attemptNo = highest + 1;
  const id = attemptIdFor(uid, test.id, attemptNo);
  const ref = doc(db, 'attempts', id);

  await setDoc(ref, {
    uid,
    testId: test.id,
    testTitle: test.title,
    totalMarks: test.totalMarks,
    attemptNo,
    startedAt: serverTimestamp(),
    submittedAt: null,
    status: 'in_progress',
    answers: {},
    markedForReview: [],
    timeSpent: {},
    violations: 0,
    score: null,
    correctCount: null,
    wrongCount: null,
    skippedCount: null,
    topicStats: {},
    sectionStats: {},
    wrongQuestionIds: [],
  });

  const created = await getDoc(ref);
  return toAttempt(created);
}

export async function saveProgress(attemptId: string, progress: AttemptProgress) {
  await updateDoc(doc(db, 'attempts', attemptId), { ...progress });
}

export async function markSubmitted(attemptId: string, progress: AttemptProgress) {
  await updateDoc(doc(db, 'attempts', attemptId), {
    ...progress,
    status: 'submitted',
    submittedAt: serverTimestamp(),
  });
}

// Closes an attempt after its window has passed. Only the saved answers count, so this sends no answers.
async function markSubmittedAfterDeadline(attemptId: string, progress: Pick<AttemptProgress, 'timeSpent' | 'violations'>) {
  await updateDoc(doc(db, 'attempts', attemptId), {
    ...progress,
    status: 'submitted',
    submittedAt: serverTimestamp(),
  });
}

// A normal submit is rejected once the window has passed (for example, a throttled background tab).
// The late path then closes the attempt with the answers that were already saved.
export async function closeAttempt(attemptId: string, progress: AttemptProgress) {
  try {
    await markSubmitted(attemptId, progress);
  } catch (error) {
    try {
      await markSubmittedAfterDeadline(attemptId, { timeSpent: progress.timeSpent, violations: progress.violations });
    } catch {
      throw error;
    }
  }
}

// Scores a submitted attempt once. Only the first attempt creates a leaderboard entry.
// Safe to call repeatedly: it resumes from whatever was already written.
export async function finalizeAttempt(attemptId: string, identity: LeaderboardIdentity): Promise<Attempt> {
  const attempt = await getAttempt(attemptId);
  if (!attempt) throw new Error('This attempt could not be found.');
  if (attempt.status !== 'submitted') throw new Error('This attempt has not been submitted yet.');

  let scored = attempt;
  if (attempt.score === null) {
    const test = await getTest(attempt.testId);
    if (!test) throw new Error('This test is no longer available for scoring.');
    const [questions, answerKeys] = await Promise.all([
      listQuestions(attempt.testId),
      getAnswerKeys(attempt.testId),
    ]);
    const result = scoreAttempt({
      questions,
      answers: attempt.answers,
      answerKeys,
      negativeMarks: test.negativeMarks,
      totalMarks: test.totalMarks,
    });
    await updateDoc(doc(db, 'attempts', attemptId), { ...result });
    scored = { ...attempt, ...result };
  }

  if (attempt.attemptNo === 1) {
    await ensureLeaderboardEntry(attempt.testId, attempt.uid, identity, scored);
  }
  return scored;
}

async function ensureLeaderboardEntry(
  testId: string,
  uid: string,
  identity: LeaderboardIdentity,
  attempt: Attempt,
) {
  const ref = doc(db, 'leaderboards', testId, 'entries', uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return;

  const attempted = (attempt.correctCount ?? 0) + (attempt.wrongCount ?? 0);
  const accuracy = attempted === 0 ? 0 : Math.round(((attempt.correctCount ?? 0) / attempted) * 100);
  const timeTaken = Object.values(attempt.timeSpent).reduce((sum, seconds) => sum + seconds, 0);

  await setDoc(ref, {
    name: identity.name,
    photoURL: identity.photoURL,
    score: attempt.score ?? 0,
    accuracy,
    timeTaken,
  });
}
