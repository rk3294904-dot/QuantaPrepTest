import type { AnswerValue } from '@/lib/types';
import type { AttemptProgress } from '@/services/attemptService';

export type QuestionStatus = 'answered' | 'notAnswered' | 'marked' | 'answeredMarked' | 'notVisited';

function isAnswered(value: AnswerValue | undefined): boolean {
  if (value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function getQuestionStatus(progress: AttemptProgress, questionId: string): QuestionStatus {
  const answered = isAnswered(progress.answers[questionId]);
  const marked = progress.markedForReview.includes(questionId);
  const visited = progress.timeSpent[questionId] !== undefined;

  if (answered && marked) return 'answeredMarked';
  if (marked) return 'marked';
  if (answered) return 'answered';
  if (visited) return 'notAnswered';
  return 'notVisited';
}

export function countByStatus(progress: AttemptProgress, questionIds: string[]) {
  const counts = { answered: 0, notAnswered: 0, marked: 0, notVisited: 0 };
  for (const id of questionIds) {
    const status = getQuestionStatus(progress, id);
    if (status === 'answered' || status === 'answeredMarked') counts.answered += 1;
    if (status === 'notAnswered') counts.notAnswered += 1;
    if (status === 'notVisited') counts.notVisited += 1;
    if (status === 'marked' || status === 'answeredMarked') counts.marked += 1;
  }
  return counts;
}
