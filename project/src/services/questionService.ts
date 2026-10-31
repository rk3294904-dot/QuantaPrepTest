import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BULK_BATCH_QUESTIONS } from '@/lib/constants';
import type { Question, QuestionType } from '@/lib/types';
import { asNumber, asString, asStringArray } from '@/services/converters';

export interface QuestionInput {
  section: string;
  text: string;
  imageUrl: string;
  options: string[];
  questionType: QuestionType;
  correctAnswer: string;
  tolerance: number | null;
  explanation: string;
  topic: string;
  marks: number;
  negativeMarks: number | null;
}

export interface QuestionEntry {
  data: QuestionInput;
  order: number;
}

const LETTERS = ['A', 'B', 'C', 'D'];

function toQuestion(id: string, data: Record<string, unknown>): Question {
  return {
    id,
    section: asString(data.section, 'General'),
    text: asString(data.text),
    imageUrl: asString(data.imageUrl),
    options: asStringArray(data.options),
    questionType: (asString(data.questionType, 'single') as QuestionType) || 'single',
    correctAnswer: asString(data.correctAnswer),
    tolerance: typeof data.tolerance === 'number' ? data.tolerance : null,
    explanation: asString(data.explanation),
    topic: asString(data.topic, 'General'),
    marks: asNumber(data.marks, 1),
    negativeMarks: typeof data.negativeMarks === 'number' ? data.negativeMarks : null,
    order: asNumber(data.order),
  };
}

export async function listQuestions(testId: string): Promise<Question[]> {
  const snap = await getDocs(query(collection(db, 'tests', testId, 'questions'), orderBy('order')));
  return snap.docs.map((d) => toQuestion(d.id, d.data()));
}

// Returns the correctAnswer string from the question document itself (no longer a separate collection for new questions).
// For backward compatibility, old answerKeys docs with {correctOption: number} are converted to letter answers.
export async function getAnswerKeys(testId: string): Promise<Record<string, string>> {
  const snap = await getDocs(collection(db, 'answerKeys', testId, 'items'));
  const keys: Record<string, string> = {};
  for (const d of snap.docs) {
    const data = d.data();
    if (typeof data.correctAnswer === 'string') {
      keys[d.id] = data.correctAnswer;
    } else if (typeof data.correctOption === 'number') {
      keys[d.id] = LETTERS[data.correctOption] ?? '';
    }
  }
  return keys;
}

function questionPayload(input: QuestionInput, order: number) {
  return {
    section: input.section,
    text: input.text,
    imageUrl: input.imageUrl,
    options: input.options,
    questionType: input.questionType,
    correctAnswer: input.correctAnswer,
    tolerance: input.tolerance,
    explanation: input.explanation,
    topic: input.topic,
    marks: input.marks,
    negativeMarks: input.negativeMarks,
    order,
  };
}

// The test total is always the sum of its question marks, so scores and percentages stay consistent.
async function syncTestTotalMarks(testId: string) {
  const snap = await getDocs(collection(db, 'tests', testId, 'questions'));
  const total = snap.docs.reduce((sum, d) => sum + asNumber(d.data().marks, 1), 0);
  await updateDoc(doc(db, 'tests', testId), { totalMarks: Math.round(total * 100) / 100 });
}

export async function saveQuestion(
  testId: string,
  input: QuestionInput,
  options: { id?: string; order: number },
) {
  const questionRef = options.id
    ? doc(db, 'tests', testId, 'questions', options.id)
    : doc(collection(db, 'tests', testId, 'questions'));
  const keyRef = doc(db, 'answerKeys', testId, 'items', questionRef.id);
  const batch = writeBatch(db);
  batch.set(questionRef, questionPayload(input, options.order));
  batch.set(keyRef, { correctAnswer: input.correctAnswer });
  if (!options.id) {
    batch.update(doc(db, 'tests', testId), { questionCount: increment(1) });
  }
  await batch.commit();
  await syncTestTotalMarks(testId);
}

export async function deleteQuestion(testId: string, questionId: string) {
  await deleteDoc(doc(db, 'tests', testId, 'questions', questionId));
  await deleteDoc(doc(db, 'answerKeys', testId, 'items', questionId));
  await updateDoc(doc(db, 'tests', testId), { questionCount: increment(-1) });
  await syncTestTotalMarks(testId);
}

export async function reorderQuestions(testId: string, orderedIds: string[]) {
  const batch = writeBatch(db);
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, 'tests', testId, 'questions', id), { order: index + 1 });
  });
  await batch.commit();
}

// Each question uses two writes (question + answer key), so 250 questions fill one 500-operation batch.
export async function writeQuestionBatch(testId: string, entries: QuestionEntry[]) {
  for (let i = 0; i < entries.length; i += BULK_BATCH_QUESTIONS) {
    const batch = writeBatch(db);
    for (const entry of entries.slice(i, i + BULK_BATCH_QUESTIONS)) {
      const questionRef = doc(collection(db, 'tests', testId, 'questions'));
      batch.set(questionRef, questionPayload(entry.data, entry.order));
      batch.set(doc(db, 'answerKeys', testId, 'items', questionRef.id), { correctAnswer: entry.data.correctAnswer });
    }
    await batch.commit();
  }
  if (entries.length > 0) {
    await updateDoc(doc(db, 'tests', testId), { questionCount: increment(entries.length) });
    await syncTestTotalMarks(testId);
  }
}
