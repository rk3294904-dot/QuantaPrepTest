import {
  collection,
  deleteDoc,
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
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Difficulty, Test, TestStatus } from '@/lib/types';
import { asBoolean, asNumber, asString, toDate } from '@/services/converters';
import { deleteDocsInBatches } from '@/services/batch';
import { getAnswerKeys, listQuestions, writeQuestionBatch } from '@/services/questionService';

export interface TestInput {
  categoryId: string;
  title: string;
  description: string;
  durationMinutes: number;
  negativeMarks: number;
  instructions: string;
  language: string;
  difficulty: Difficulty;
  isPaid: boolean;
  status: TestStatus;
}

export function toTest(id: string, data: Record<string, unknown>): Test {
  return {
    id,
    categoryId: asString(data.categoryId),
    title: asString(data.title, 'Untitled test'),
    description: asString(data.description),
    durationMinutes: asNumber(data.durationMinutes, 60),
    totalMarks: asNumber(data.totalMarks),
    negativeMarks: asNumber(data.negativeMarks),
    instructions: asString(data.instructions),
    language: asString(data.language, 'English'),
    difficulty: (asString(data.difficulty, 'medium') as Difficulty),
    isPaid: asBoolean(data.isPaid),
    status: asString(data.status, 'draft') as TestStatus,
    questionCount: asNumber(data.questionCount),
    createdAt: toDate(data.createdAt),
  };
}

const testsRef = collection(db, 'tests');

export async function getTest(testId: string): Promise<Test | null> {
  const snap = await getDoc(doc(db, 'tests', testId));
  return snap.exists() ? toTest(snap.id, snap.data()) : null;
}

// Equality filters only, sorted in memory, so no composite index is needed.
export async function listPublishedTestsByCategory(categoryId: string): Promise<Test[]> {
  const snap = await getDocs(
    query(testsRef, where('categoryId', '==', categoryId), where('status', '==', 'published')),
  );
  return snap.docs
    .map((d) => toTest(d.id, d.data()))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function listPublishedTests(): Promise<Test[]> {
  const snap = await getDocs(query(testsRef, where('status', '==', 'published')));
  return snap.docs
    .map((d) => toTest(d.id, d.data()))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}

export async function listAllTests(): Promise<Test[]> {
  const snap = await getDocs(query(testsRef, orderBy('createdAt', 'desc'), limit(300)));
  return snap.docs.map((d) => toTest(d.id, d.data()));
}

export async function saveTest(input: TestInput, existing?: Test): Promise<string> {
  if (existing) {
    await updateDoc(doc(db, 'tests', existing.id), { ...input });
    return existing.id;
  }
  const ref = doc(testsRef);
  await setDoc(ref, { ...input, questionCount: 0, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteTestCascade(testId: string) {
  const [questionsSnap, keysSnap, entriesSnap] = await Promise.all([
    getDocs(collection(db, 'tests', testId, 'questions')),
    getDocs(collection(db, 'answerKeys', testId, 'items')),
    getDocs(collection(db, 'leaderboards', testId, 'entries')),
  ]);
  await deleteDocsInBatches([
    ...questionsSnap.docs.map((d) => d.ref),
    ...keysSnap.docs.map((d) => d.ref),
    ...entriesSnap.docs.map((d) => d.ref),
  ]);
  await deleteDoc(doc(db, 'tests', testId));
}

export async function duplicateTest(testId: string): Promise<string> {
  const source = await getTest(testId);
  if (!source) throw new Error('This test no longer exists.');
  const questions = await listQuestions(testId);
  const keys = await getAnswerKeys(testId);

  const ref = doc(testsRef);
  await setDoc(ref, {
    categoryId: source.categoryId,
    title: `${source.title} (Copy)`,
    description: source.description,
    durationMinutes: source.durationMinutes,
    totalMarks: source.totalMarks,
    negativeMarks: source.negativeMarks,
    instructions: source.instructions,
    language: source.language,
    difficulty: source.difficulty,
    isPaid: source.isPaid,
    status: 'draft',
    questionCount: questions.length,
    createdAt: serverTimestamp(),
  });

  await writeQuestionBatch(
    ref.id,
    questions.map((q) => ({
      data: {
        section: q.section,
        text: q.text,
        imageUrl: q.imageUrl,
        options: q.options,
        explanation: q.explanation,
        topic: q.topic,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
      },
      order: q.order,
      correctOption: keys[q.id] ?? 0,
    })),
  );
  return ref.id;
}
