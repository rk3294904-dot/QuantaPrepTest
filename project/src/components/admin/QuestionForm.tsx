import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/lib/utils';
import type { Question, QuestionType } from '@/lib/types';
import type { QuestionInput } from '@/services/questionService';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { MathText } from '@/components/ui/MathText';
import { saveQuestion } from '@/services/questionService';

interface QuestionFormProps {
  testId: string;
  question: Question | null;
  nextOrder: number;
  onDone: () => void;
}

interface Draft {
  section: string;
  topic: string;
  marks: string;
  negativeMarks: string;
  text: string;
  imageUrl: string;
  questionType: QuestionType;
  options: string[];
  correctAnswer: string;
  tolerance: string;
  explanation: string;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const TYPE_LABELS: Record<QuestionType, string> = {
  single: 'Single correct (MCQ)',
  multiple: 'Multiple correct',
  integer: 'Integer answer',
  numerical: 'Numerical (decimal)',
  true_false: 'True / False',
  fill_blank: 'Fill in the blank',
};

const TYPES_NEEDING_OPTIONS: QuestionType[] = ['single', 'multiple'];
const TYPES_NEEDING_TYPED_ANSWER: QuestionType[] = ['integer', 'numerical', 'fill_blank'];
const TYPES_NEEDING_TOLERANCE: QuestionType[] = ['numerical'];

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

type DraftErrors = Partial<Record<'section' | 'text' | 'imageUrl' | 'marks' | 'negativeMarks' | 'options' | 'correctAnswer' | 'tolerance', string>>;

function validateDraft(draft: Draft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.section.trim()) errors.section = 'Section is required.';
  if (!draft.text.trim()) errors.text = 'Question text is required.';
  if (draft.imageUrl.trim() && !isHttpUrl(draft.imageUrl.trim())) errors.imageUrl = 'Use a full http or https link.';
  const marks = Number(draft.marks);
  if (!Number.isFinite(marks) || marks <= 0) errors.marks = 'Marks must be greater than 0.';
  if (draft.negativeMarks.trim()) {
    const penalty = Number(draft.negativeMarks);
    if (!Number.isFinite(penalty) || penalty < 0) errors.negativeMarks = 'Penalty cannot be negative.';
  }
  if (TYPES_NEEDING_OPTIONS.includes(draft.questionType)) {
    if (draft.options.some((option) => !option.trim())) errors.options = 'Fill in all four options.';
    if (!draft.correctAnswer.trim()) errors.correctAnswer = 'Select the correct option.';
  }
  if (draft.questionType === 'multiple') {
    const letters = draft.correctAnswer.split('|').filter(Boolean);
    if (letters.length < 2) errors.correctAnswer = 'Select at least 2 correct options.';
  }
  if (TYPES_NEEDING_TYPED_ANSWER.includes(draft.questionType)) {
    if (!draft.correctAnswer.trim()) errors.correctAnswer = 'Correct answer is required.';
  }
  if (TYPES_NEEDING_TOLERANCE.includes(draft.questionType)) {
    if (draft.tolerance.trim()) {
      const tol = Number(draft.tolerance);
      if (!Number.isFinite(tol) || tol < 0) errors.tolerance = 'Tolerance must be a non-negative number.';
    }
  }
  return errors;
}

function defaultDraft(question: Question | null): Draft {
  const qt = question?.questionType ?? 'single';
  return {
    section: question?.section ?? '',
    topic: question?.topic ?? '',
    marks: String(question?.marks ?? 1),
    negativeMarks: question?.negativeMarks === null || question?.negativeMarks === undefined ? '' : String(question.negativeMarks),
    text: question?.text ?? '',
    imageUrl: question?.imageUrl ?? '',
    questionType: qt,
    options: qt === 'true_false'
      ? ['True', 'False', '', '']
      : question?.options ?? ['', '', '', ''],
    correctAnswer: question?.correctAnswer ?? '',
    tolerance: question?.tolerance !== null && question?.tolerance !== undefined ? String(question.tolerance) : '',
    explanation: question?.explanation ?? '',
  };
}

export function QuestionForm({ testId, question, nextOrder, onDone }: QuestionFormProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>(() => defaultDraft(question));
  const [errors, setErrors] = useState<DraftErrors>({});

  const saveMutation = useMutation({
    mutationFn: (input: { data: QuestionInput; correctAnswer: string }) =>
      saveQuestion(testId, input.data, input.correctAnswer, {
        id: question?.id,
        order: question?.order ?? nextOrder,
      }),
    onSuccess: () => {
      toast.success(question ? 'Question updated' : 'Question added');
      void queryClient.invalidateQueries({ queryKey: ['questions', testId] });
      void queryClient.invalidateQueries({ queryKey: ['answer-keys', testId] });
      void queryClient.invalidateQueries({ queryKey: ['test', testId] });
      onDone();
    },
    onError: (error) => toast.error('Could not save question', errorMessage(error, 'Please try again.')),
  });

  const setField = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const setOption = (index: number, value: string) =>
    setDraft((current) => ({ ...current, options: current.options.map((o, i) => (i === index ? value : o)) }));

  // For single: radio selection of correct option
  const handleSingleCorrect = (index: number) => {
    setField('correctAnswer', OPTION_LABELS[index]);
  };

  // For multiple: toggle checkbox
  const handleMultipleCorrect = (index: number) => {
    const current = draft.correctAnswer ? draft.correctAnswer.split('|').filter(Boolean) : [];
    const letter = OPTION_LABELS[index];
    const has = current.includes(letter);
    const next = has ? current.filter((l) => l !== letter) : [...current, letter];
    setField('correctAnswer', next.sort().join('|'));
  };

  const handleTypeChange = (type: QuestionType) => {
    setDraft((current) => {
      const options = type === 'true_false' ? ['True', 'False', '', ''] : current.options;
      return { ...current, questionType: type, options, correctAnswer: '', tolerance: '' };
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const tolerance = TYPES_NEEDING_TOLERANCE.includes(draft.questionType) && draft.tolerance.trim()
      ? Number(draft.tolerance)
      : null;

    saveMutation.mutate({
      data: {
        section: draft.section.trim(),
        text: draft.text.trim(),
        imageUrl: draft.imageUrl.trim(),
        options: draft.questionType === 'true_false'
          ? ['True', 'False', '', '']
          : draft.options.map((o) => o.trim()),
        questionType: draft.questionType,
        correctAnswer: draft.correctAnswer.trim(),
        tolerance,
        explanation: draft.explanation.trim(),
        topic: draft.topic.trim() || 'General',
        marks: Number(draft.marks),
        negativeMarks: draft.negativeMarks.trim() ? Number(draft.negativeMarks) : null,
      },
      correctAnswer: draft.correctAnswer.trim(),
    });
  };

  const showOptions = TYPES_NEEDING_OPTIONS.includes(draft.questionType);
  const showTrueFalse = draft.questionType === 'true_false';
  const showTypedAnswer = TYPES_NEEDING_TYPED_ANSWER.includes(draft.questionType);
  const showTolerance = TYPES_NEEDING_TOLERANCE.includes(draft.questionType);

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Section" htmlFor="q-section" error={errors.section}>
          <input id="q-section" className="input-base" value={draft.section} onChange={(e) => setField('section', e.target.value)} placeholder="e.g. Quant" />
        </FormField>
        <FormField label="Topic" htmlFor="q-topic">
          <input id="q-topic" className="input-base" value={draft.topic} onChange={(e) => setField('topic', e.target.value)} placeholder="e.g. Percentages" />
        </FormField>
        <FormField label="Question type" htmlFor="q-type">
          <select id="q-type" className="input-base" value={draft.questionType} onChange={(e) => handleTypeChange(e.target.value as QuestionType)}>
            {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Marks for correct answer" htmlFor="q-marks" error={errors.marks} hint="Each question can carry its own marks.">
          <input id="q-marks" type="number" min={0.25} step="any" className="input-base" value={draft.marks} onChange={(e) => setField('marks', e.target.value)} />
        </FormField>
      </div>

      <FormField label="Wrong-answer penalty" htmlFor="q-negative" error={errors.negativeMarks} hint="Leave blank to use the test default.">
        <input id="q-negative" type="number" min={0} step="any" className="input-base max-w-xs" value={draft.negativeMarks} onChange={(e) => setField('negativeMarks', e.target.value)} placeholder="Test default" />
      </FormField>

      <FormField label="Question" htmlFor="q-text" error={errors.text} hint="Use $...$ for inline math and $$...$$ for display math.">
        <textarea id="q-text" rows={4} className="input-base font-mono text-sm" value={draft.text} onChange={(e) => setField('text', e.target.value)} />
      </FormField>
      {draft.text.trim() && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/50">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Preview</p>
          <MathText text={draft.text} />
        </div>
      )}

      <FormField label="Image URL (optional)" htmlFor="q-image" error={errors.imageUrl} hint="Paste a link to an image. Files cannot be uploaded.">
        <input id="q-image" type="url" className="input-base" value={draft.imageUrl} onChange={(e) => setField('imageUrl', e.target.value)} placeholder="https://..." />
      </FormField>

      {/* Options for single/multiple MCQ */}
      {showOptions && (
        <fieldset className="space-y-3">
          <legend className="label-base">
            Options and correct answer {draft.questionType === 'multiple' && '(check all correct)'}
          </legend>
          {errors.options && <p className="text-xs font-medium text-error-600 dark:text-error-500">{errors.options}</p>}
          {errors.correctAnswer && <p className="text-xs font-medium text-error-600 dark:text-error-500">{errors.correctAnswer}</p>}
          {draft.options.map((option, index) => {
            if (!option && index >= 2 && draft.questionType === 'single') return null;
            const isCorrect = draft.correctAnswer.split('|').includes(OPTION_LABELS[index]);
            return (
              <div key={index} className="flex items-center gap-3">
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type={draft.questionType === 'multiple' ? 'checkbox' : 'radio'}
                    name="correct-option"
                    checked={isCorrect}
                    onChange={() => draft.questionType === 'multiple' ? handleMultipleCorrect(index) : handleSingleCorrect(index)}
                    className="h-4 w-4 accent-accent-700"
                    aria-label={`Mark option ${OPTION_LABELS[index]} as correct`}
                  />
                  {OPTION_LABELS[index]}
                </label>
                <input
                  className="input-base"
                  value={option}
                  onChange={(e) => setOption(index, e.target.value)}
                  aria-label={`Option ${OPTION_LABELS[index]}`}
                />
              </div>
            );
          })}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {draft.questionType === 'multiple' ? 'Check all correct options.' : 'Select the radio button beside the correct option.'}
          </p>
        </fieldset>
      )}

      {/* True/False buttons */}
      {showTrueFalse && (
        <fieldset className="space-y-3">
          <legend className="label-base">Correct answer</legend>
          {errors.correctAnswer && <p className="text-xs font-medium text-error-600 dark:text-error-500">{errors.correctAnswer}</p>}
          <div className="flex gap-3">
            {['A', 'B'].map((letter) => (
              <label
                key={letter}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-5 py-3 text-sm font-semibold transition ${
                  draft.correctAnswer === letter
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="tf-correct"
                  checked={draft.correctAnswer === letter}
                  onChange={() => setField('correctAnswer', letter)}
                  className="h-4 w-4 accent-accent-700"
                />
                {letter === 'A' ? 'True' : 'False'}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Typed answer for integer/numerical/fill_blank */}
      {showTypedAnswer && (
        <div className="space-y-4">
          <FormField
            label={
              draft.questionType === 'fill_blank'
                ? 'Accepted answers (separate with |)'
                : draft.questionType === 'integer'
                  ? 'Correct integer answer'
                  : 'Correct numerical answer'
            }
            htmlFor="q-correct"
            error={errors.correctAnswer}
            hint={draft.questionType === 'fill_blank' ? 'e.g. Paris|paris — any of these will be marked correct' : undefined}
          >
            <input
              id="q-correct"
              type={draft.questionType === 'integer' ? 'number' : 'text'}
              step={draft.questionType === 'numerical' ? 'any' : '1'}
              className="input-base"
              value={draft.correctAnswer}
              onChange={(e) => setField('correctAnswer', e.target.value)}
              placeholder={draft.questionType === 'fill_blank' ? 'answer1|answer2' : draft.questionType === 'integer' ? '42' : '3.14'}
            />
          </FormField>

          {showTolerance && (
            <FormField label="Tolerance (optional)" htmlFor="q-tolerance" error={errors.tolerance} hint="Accepted range: correct ± tolerance.">
              <input
                id="q-tolerance"
                type="number"
                min={0}
                step="any"
                className="input-base max-w-xs"
                value={draft.tolerance}
                onChange={(e) => setField('tolerance', e.target.value)}
                placeholder="0"
              />
            </FormField>
          )}
        </div>
      )}

      <FormField label="Explanation" htmlFor="q-explanation" hint="Shown to students on the result page.">
        <textarea id="q-explanation" rows={3} className="input-base" value={draft.explanation} onChange={(e) => setField('explanation', e.target.value)} />
      </FormField>

      <div className="flex justify-end gap-2 border-t border-slate-200 pt-5 dark:border-slate-800">
        <Button variant="outline" type="button" onClick={onDone}>Cancel</Button>
        <Button type="submit" loading={saveMutation.isPending}>{question ? 'Save question' : 'Add question'}</Button>
      </div>
    </form>
  );
}
