import type { QuestionEntry } from '@/services/questionService';
import type { QuestionType } from '@/lib/types';

export const IMPORT_COLUMNS = [
  'section',
  'question',
  'question_type',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_answer',
  'tolerance',
  'negative_marks',
  'explanation',
  'topic',
  'marks',
] as const;

export const QUESTION_TEMPLATE_CSV = [
  IMPORT_COLUMNS.join(','),
  '"Quantitative Aptitude","If $x = 2$, what is $x^{3}$?",single,"6","8","4","9",B,,,"$2^{3} = 8$",Algebra,1',
  '"Quantitative Aptitude","Select all even numbers.","10","15","20","25",multiple,A|C,,,"10 and 20 are even.",Numbers,2',
  '"Quantitative Aptitude","What is $7 \\times 8$?",integer,,,,,56,,,"$7 \\times 8 = 56$",Multiplication,1',
  '"Quantitative Aptitude","What is $\\sqrt{2}$ to 2 decimal places?",numerical,,,,,1.41,0.01,,"$\\sqrt{2} \\approx 1.414$",Roots,1',
  '"Logical Reasoning","The sky is blue.",true_false,,,,,True,,,"A fact.",General,1',
  '"Logical Reasoning","Capital of France is _____.",fill_blank,,,,,Paris|paris,,,"Paris is the capital.",Geography,1',
].join('\n');

export interface ImportRowResult {
  rowNumber: number;
  entry: Omit<QuestionEntry, 'order'> | null;
  preview: { section: string; question: string; type: string; correct: string; topic: string; marks: string };
  errors: string[];
}

const LETTERS = ['A', 'B', 'C', 'D'];
const VALID_TYPES: QuestionType[] = ['single', 'multiple', 'integer', 'numerical', 'true_false', 'fill_blank'];

function cell(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function normalizeRow(raw: Record<string, unknown>) {
  const row: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    row[key.trim().toLowerCase().replace(/\s+/g, '_')] = cell(value);
  }
  return row;
}

export function validateImportRows(rawRows: Record<string, unknown>[]): ImportRowResult[] {
  return rawRows.map((raw, index) => {
    const row = normalizeRow(raw);
    const errors: string[] = [];
    const section = row.section ?? '';
    const question = row.question ?? '';
    const topic = row.topic || 'General';
    const marksText = row.marks || '1';
    const marks = Number(marksText);

    // Determine question type — default to "single" for backward compatibility
    const rawType = (row.question_type ?? 'single').toLowerCase();
    const questionType = (VALID_TYPES.includes(rawType as QuestionType) ? rawType : 'single') as QuestionType;

    // For single/multiple/true_false: options come from option_a..d
    // For integer/numerical/fill_blank: options are empty, correct_answer is the typed answer
    const needsOptions = questionType === 'single' || questionType === 'multiple';
    const options = needsOptions
      ? [row.option_a ?? '', row.option_b ?? '', row.option_c ?? '', row.option_d ?? '']
      : ['True', 'False', '', ''];

    // For true_false, override options
    const trueFalseOptions = questionType === 'true_false' ? ['True', 'False', '', ''] : options;
    const finalOptions = questionType === 'true_false' ? trueFalseOptions : options;

    // Parse correct answer
    const correctAnswer = row.correct_answer ?? '';
    let correctAnswerStr = '';

    if (questionType === 'single') {
      // Backward compat: if correct_answer is empty, try correct_option
      const rawCorrect = (correctAnswer || (row.correct_option ?? '')).toUpperCase();
      const letterIdx = LETTERS.indexOf(rawCorrect);
      if (letterIdx >= 0) {
        correctAnswerStr = LETTERS[letterIdx];
      } else if (/^[1-4]$/.test(rawCorrect)) {
        correctAnswerStr = LETTERS[Number(rawCorrect) - 1];
      } else {
        errors.push('correct_answer must be A, B, C or D for single type');
      }
    } else if (questionType === 'multiple') {
      // correct_answer is like "A|C"
      const letters = correctAnswer.toUpperCase().split('|').filter(Boolean);
      const valid = letters.every((l) => LETTERS.includes(l));
      if (valid && letters.length >= 2) {
        correctAnswerStr = letters.sort().join('|');
      } else {
        errors.push('correct_answer must be 2+ letters separated by | (e.g. A|C) for multiple type');
      }
    } else if (questionType === 'true_false') {
      const val = correctAnswer.toUpperCase();
      if (val === 'TRUE' || val === 'T' || val === 'A') correctAnswerStr = 'A';
      else if (val === 'FALSE' || val === 'F' || val === 'B') correctAnswerStr = 'B';
      else errors.push('correct_answer must be True or False for true_false type');
    } else if (questionType === 'integer') {
      if (correctAnswer === '' || !/^-?\d+$/.test(correctAnswer)) {
        errors.push('correct_answer must be a whole number for integer type');
      } else {
        correctAnswerStr = correctAnswer;
      }
    } else if (questionType === 'numerical') {
      const tolText = row.tolerance ?? '';
      const tolerance = tolText === '' ? 0 : Number(tolText);
      if (!Number.isFinite(Number(correctAnswer))) {
        errors.push('correct_answer must be a number for numerical type');
      } else if (!Number.isFinite(tolerance) || tolerance < 0) {
        errors.push('tolerance must be a non-negative number for numerical type');
      } else {
        correctAnswerStr = correctAnswer;
      }
    } else if (questionType === 'fill_blank') {
      if (!correctAnswer) {
        errors.push('correct_answer is required for fill_blank type (use | to separate accepted answers)');
      } else {
        correctAnswerStr = correctAnswer;
      }
    }

    if (!section) errors.push('section is required');
    if (!question) errors.push('question is required');

    if (needsOptions) {
      finalOptions.forEach((option, i) => {
        if (!option) errors.push(`option_${LETTERS[i].toLowerCase()} is required for ${questionType} type`);
      });
    }

    // Parse negative marks (optional, defaults to null = use test default)
    const negativeMarksText = row.negative_marks ?? '';
    let negativeMarks: number | null = null;
    if (negativeMarksText !== '') {
      const penalty = Number(negativeMarksText);
      if (!Number.isFinite(penalty) || penalty < 0) {
        errors.push('negative_marks must be a non-negative number');
      } else {
        negativeMarks = penalty;
      }
    }

    if (!Number.isFinite(marks) || marks <= 0) errors.push('marks must be a positive number');

    // For numerical type, set tolerance
    let tolerance: number | null = null;
    if (questionType === 'numerical') {
      const tolText = row.tolerance ?? '';
      tolerance = tolText === '' ? 0 : Number(tolText);
    }

    const entry =
      errors.length === 0
        ? {
            data: {
              section,
              text: question,
              imageUrl: '',
              options: finalOptions,
              questionType,
              correctAnswer: correctAnswerStr,
              tolerance,
              explanation: row.explanation ?? '',
              topic,
              marks,
              negativeMarks,
            },
          }
        : null;

    return {
      rowNumber: index + 2,
      entry,
      preview: {
        section,
        question,
        type: questionType,
        correct: correctAnswerStr || correctAnswer || '-',
        topic,
        marks: marksText,
      },
      errors,
    };
  });
}
