import { useEffect, useState } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, Eraser, Flag, ImageOff, Save } from 'lucide-react';
import type { AnswerValue, Question } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { MathText } from '@/components/ui/MathText';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

interface QuestionPanelProps {
  question: Question;
  number: number;
  total: number;
  selected: AnswerValue | undefined;
  marked: boolean;
  bookmarked: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: (value: AnswerValue) => void;
  onClear: () => void;
  onToggleMark: () => void;
  onToggleBookmark: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSaveAndNext: () => void;
  onMarkAndNext: () => void;
}

export function QuestionPanel(props: QuestionPanelProps) {
  const { question, number, total, selected, marked, bookmarked } = props;
  const [imageFailed, setImageFailed] = useState(false);
  const [textInput, setTextInput] = useState('');

  useEffect(() => {
    setImageFailed(false);
    // Sync text input state when switching to a typed-answer question
    if (typeof selected === 'string') {
      setTextInput(selected);
    } else {
      setTextInput('');
    }
  }, [question.id]);

  const showImage = question.imageUrl.startsWith('https://') || question.imageUrl.startsWith('http://');

  const handleTextChange = (value: string) => {
    setTextInput(value);
    props.onSelect(value);
  };

  const handleMultipleToggle = (index: number) => {
    const current = Array.isArray(selected) ? selected : [];
    const has = current.includes(index);
    const next = has ? current.filter((i) => i !== index) : [...current, index].sort((a, b) => a - b);
    props.onSelect(next);
  };

  return (
    <>
      <section className="surface flex flex-col p-5 sm:p-8" aria-label={`Question ${number} of ${total}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-primary-700 px-3 py-1 text-sm font-bold text-white">Q{number}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
            </span>
          </div>
          <button
            type="button"
            onClick={props.onToggleBookmark}
            aria-pressed={bookmarked}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition',
              bookmarked
                ? 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/40 dark:text-secondary-200'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
            )}
          >
            <Bookmark className={cn('h-4 w-4', bookmarked && 'fill-current')} />
            {bookmarked ? 'Bookmarked' : 'Bookmark'}
          </button>
        </div>

        <div className="mt-6 text-base leading-relaxed text-slate-900 sm:text-lg dark:text-slate-100">
          <MathText text={question.text} />
        </div>

        {showImage && (
          <div className="mt-6">
            {imageFailed ? (
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">
                <ImageOff className="h-4 w-4" /> The image for this question could not be loaded.
              </div>
            ) : (
              <img
                src={question.imageUrl}
                alt={`Figure for question ${number}`}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setImageFailed(true)}
                className="max-h-80 rounded-xl border border-slate-200 object-contain dark:border-slate-800"
              />
            )}
          </div>
        )}

        {/* Single correct MCQ */}
        {question.questionType === 'single' && (
          <fieldset className="mt-8 space-y-3">
            <legend className="sr-only">Options</legend>
            {question.options.map((option, index) => {
              if (!option) return null;
              const isSelected = selected === index;
              return (
                <label
                  key={index}
                  className={cn(
                    'group flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-sm',
                    isSelected
                      ? 'border-primary-600 bg-primary-50 ring-4 ring-primary-500/15 dark:border-primary-500 dark:bg-primary-900/30'
                      : 'border-slate-200 bg-white hover:border-primary-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-700',
                  )}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => props.onSelect(index)}
                  />
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition',
                      isSelected
                        ? 'border-primary-700 bg-primary-700 text-white'
                        : 'border-slate-300 text-slate-600 group-hover:border-primary-400 dark:border-slate-600 dark:text-slate-300',
                    )}
                  >
                    {OPTION_LABELS[index]}
                  </span>
                  <span className="pt-1 text-slate-800 dark:text-slate-200">
                    <MathText text={option} />
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}

        {/* Multiple correct MCQ */}
        {question.questionType === 'multiple' && (
          <fieldset className="mt-8 space-y-3">
            <legend className="sr-only">Select all correct options</legend>
            <p className="text-xs font-medium text-accent-700 dark:text-accent-400">Select all correct answers</p>
            {question.options.map((option, index) => {
              if (!option) return null;
              const isSelected = Array.isArray(selected) && selected.includes(index);
              return (
                <label
                  key={index}
                  className={cn(
                    'group flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition duration-200 active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-sm',
                    isSelected
                      ? 'border-primary-600 bg-primary-50 ring-4 ring-primary-500/15 dark:border-primary-500 dark:bg-primary-900/30'
                      : 'border-slate-200 bg-white hover:border-primary-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-700',
                  )}
                >
                  <input
                    type="checkbox"
                    name={`question-${question.id}`}
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => handleMultipleToggle(index)}
                  />
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-bold transition',
                      isSelected
                        ? 'border-primary-700 bg-primary-700 text-white'
                        : 'border-slate-300 text-slate-600 group-hover:border-primary-400 dark:border-slate-600 dark:text-slate-300',
                    )}
                  >
                    {OPTION_LABELS[index]}
                  </span>
                  <span className="pt-1 text-slate-800 dark:text-slate-200">
                    <MathText text={option} />
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}

        {/* True/False */}
        {question.questionType === 'true_false' && (
          <fieldset className="mt-8 flex gap-4">
            <legend className="sr-only">True or False</legend>
            {[
              { label: 'True', value: 0 },
              { label: 'False', value: 1 },
            ].map((opt) => {
              const isSelected = selected === opt.value;
              return (
                <label
                  key={opt.value}
                  className={cn(
                    'flex flex-1 cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 p-6 text-lg font-bold transition hover:-translate-y-0.5 hover:shadow-sm',
                    isSelected
                      ? 'border-primary-600 bg-primary-50 text-primary-700 ring-4 ring-primary-500/15 dark:border-primary-500 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
                  )}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    className="sr-only"
                    checked={isSelected}
                    onChange={() => props.onSelect(opt.value)}
                  />
                  {opt.label}
                </label>
              );
            })}
          </fieldset>
        )}

        {/* Integer answer */}
        {question.questionType === 'integer' && (
          <div className="mt-8">
            <label className="label-base" htmlFor="integer-input">Enter your answer (whole number)</label>
            <input
              id="integer-input"
              type="number"
              step="1"
              className="input-base mt-2 max-w-xs text-lg font-semibold"
              value={textInput}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="e.g. 42"
            />
          </div>
        )}

        {/* Numerical answer */}
        {question.questionType === 'numerical' && (
          <div className="mt-8">
            <label className="label-base" htmlFor="numerical-input">Enter your answer (decimal)</label>
            <input
              id="numerical-input"
              type="number"
              step="any"
              className="input-base mt-2 max-w-xs text-lg font-semibold"
              value={textInput}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="e.g. 3.14"
            />
          </div>
        )}

        {/* Fill in the blank */}
        {question.questionType === 'fill_blank' && (
          <div className="mt-8">
            <label className="label-base" htmlFor="fill-input">Type your answer</label>
            <input
              id="fill-input"
              type="text"
              className="input-base mt-2 max-w-md text-base"
              value={textInput}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Type the answer..."
            />
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-3 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none dark:sm:bg-transparent">
        <div className="flex items-center gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={props.onPrevious} disabled={props.isFirst} aria-label="Previous question" icon={<ChevronLeft className="h-4 w-4" />}>
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <Button variant="outline" onClick={props.onClear} disabled={selected === undefined} aria-label="Clear response" icon={<Eraser className="h-4 w-4" />}>
              <span className="hidden sm:inline">Clear response</span>
            </Button>
            <Button
              variant="outline"
              onClick={props.onToggleMark}
              aria-label={marked ? 'Unmark review' : 'Mark for review'}
              icon={<Flag className={cn('h-4 w-4', marked && 'fill-current')} />}
            >
              <span className="hidden sm:inline">{marked ? 'Unmark review' : 'Mark for review'}</span>
            </Button>
          </div>
          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
            <Button variant="secondary" onClick={props.onMarkAndNext} disabled={props.isLast} className="hidden sm:inline-flex">
              Mark & next
            </Button>
            <Button variant="ghost" onClick={props.onNext} disabled={props.isLast} icon={<ChevronRight className="h-4 w-4" />} className="hidden sm:inline-flex">
              Skip
            </Button>
            <Button variant="accent" onClick={props.onSaveAndNext} icon={<Save className="h-4 w-4" />} disabled={props.isLast} className="flex-1 sm:flex-none">
              Save & next
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
