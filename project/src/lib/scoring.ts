import type { AnswerValue, CategoryStat, Question, QuestionType } from '@/lib/types';
import { toFirestoreKey } from '@/lib/utils';

export interface ScoreResult {
  score: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  topicStats: Record<string, CategoryStat>;
  sectionStats: Record<string, CategoryStat>;
  wrongQuestionIds: string[];
}

interface ScoreInput {
  questions: Question[];
  answers: Record<string, AnswerValue>;
  answerKeys: Record<string, string>;
  negativeMarks: number;
  totalMarks: number;
}

function bump(stats: Record<string, CategoryStat>, key: string, outcome: 'correct' | 'wrong' | 'skipped') {
  const current = stats[key] ?? { correct: 0, wrong: 0, skipped: 0 };
  stats[key] = { ...current, [outcome]: current[outcome] + 1 };
}

export const LETTERS = ['A', 'B', 'C', 'D'];

export function isCorrect(
  type: QuestionType,
  answer: AnswerValue,
  correctAnswer: string,
  tolerance: number | null,
): boolean {
  if (type === 'single' || type === 'true_false') {
    // For single MCQ: answer is a number (option index), correctAnswer is a letter like "A"
    if (typeof answer === 'number') return LETTERS[answer] === correctAnswer.toUpperCase();
    if (typeof answer === 'string') return answer.toUpperCase() === correctAnswer.toUpperCase();
    return false;
  }

  if (type === 'multiple') {
    // For multiple: answer is number[] (option indices), correctAnswer is "A|C"
    if (!Array.isArray(answer)) return false;
    const selectedLetters = [...answer].sort((a, b) => a - b).map((i) => LETTERS[i] ?? '').join('|');
    return selectedLetters === correctAnswer.toUpperCase().split('|').sort().join('|');
  }

  if (type === 'integer') {
    // For integer: answer is a string (user input), correctAnswer is the string of the integer
    const userVal = typeof answer === 'string' ? answer.trim() : String(answer);
    const correctVal = correctAnswer.trim();
    return userVal !== '' && parseInt(userVal, 10) === parseInt(correctVal, 10);
  }

  if (type === 'numerical') {
    // For numerical: answer is a string, correctAnswer is a decimal string, tolerance allows range
    const userVal = typeof answer === 'string' ? answer.trim() : String(answer);
    if (userVal === '') return false;
    const userNum = parseFloat(userVal);
    const correctNum = parseFloat(correctAnswer);
    if (!Number.isFinite(userNum) || !Number.isFinite(correctNum)) return false;
    const tol = tolerance ?? 0;
    return Math.abs(userNum - correctNum) <= tol;
  }

  if (type === 'fill_blank') {
    // For fill_blank: answer is a string, correctAnswer has accepted answers separated by "|"
    const userVal = typeof answer === 'string' ? answer.trim().toLowerCase() : String(answer).trim().toLowerCase();
    const accepted = correctAnswer.split('|').map((s) => s.trim().toLowerCase()).filter(Boolean);
    return accepted.includes(userVal);
  }

  return false;
}

export function isAnswered(answer: AnswerValue | undefined): boolean {
  if (answer === undefined) return false;
  if (typeof answer === 'string') return answer.trim() !== '';
  if (Array.isArray(answer)) return answer.length > 0;
  return answer !== -1;
}

// Client-side scoring: the answer key is only readable after submission, so this runs once per attempt.
// Negative marks are applied per wrong answer, and the total is clamped to the 0..totalMarks range the rules enforce.
export function scoreAttempt({ questions, answers, answerKeys, negativeMarks, totalMarks }: ScoreInput): ScoreResult {
  let raw = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;
  const topicStats: Record<string, CategoryStat> = {};
  const sectionStats: Record<string, CategoryStat> = {};
  const wrongQuestionIds: string[] = [];

  for (const question of questions) {
    const topic = toFirestoreKey(question.topic, 'General');
    const section = toFirestoreKey(question.section, 'General');
    const selected = answers[question.id];
    const correctAnswer = answerKeys[question.id] ?? question.correctAnswer ?? '';

    if (!isAnswered(selected)) {
      skippedCount += 1;
      bump(topicStats, topic, 'skipped');
      bump(sectionStats, section, 'skipped');
    } else if (isCorrect(question.questionType, selected, correctAnswer, question.tolerance)) {
      correctCount += 1;
      raw += question.marks;
      bump(topicStats, topic, 'correct');
      bump(sectionStats, section, 'correct');
    } else {
      wrongCount += 1;
      raw -= question.negativeMarks ?? negativeMarks;
      wrongQuestionIds.push(question.id);
      bump(topicStats, topic, 'wrong');
      bump(sectionStats, section, 'wrong');
    }
  }

  const score = Math.min(Math.max(Math.round(raw * 100) / 100, 0), totalMarks);

  return { score, correctCount, wrongCount, skippedCount, topicStats, sectionStats, wrongQuestionIds };
}
