import { cn } from '@/lib/utils';
import type { Question } from '@/lib/types';
import type { AttemptProgress } from '@/services/attemptService';
import { getQuestionStatus, type QuestionStatus } from '@/features/exam/examStatus';

const statusStyles: Record<QuestionStatus, string> = {
  answered: 'bg-accent-700 text-white border-accent-700',
  notAnswered: 'bg-error-50 text-error-700 border-error-200 dark:bg-error-600/15 dark:text-error-500 dark:border-error-600/40',
  marked: 'bg-secondary-500 text-white border-secondary-500',
  answeredMarked: 'bg-accent-700 text-white border-secondary-500 ring-2 ring-secondary-400',
  notVisited: 'bg-white text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700',
};

export const statusLegend: Array<{ status: QuestionStatus; label: string }> = [
  { status: 'answered', label: 'Answered' },
  { status: 'notAnswered', label: 'Not answered' },
  { status: 'marked', label: 'Marked for review' },
  { status: 'answeredMarked', label: 'Answered and marked' },
  { status: 'notVisited', label: 'Not visited' },
];

interface SectionTabsProps {
  sections: string[];
  activeSection: string | undefined;
  onSelect: (section: string) => void;
}

export function SectionTabs({ sections, activeSection, onSelect }: SectionTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Sections">
      {sections.map((section) => (
        <button
          key={section}
          type="button"
          role="tab"
          aria-selected={section === activeSection}
          onClick={() => onSelect(section)}
          className={cn(
            'whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition',
            section === activeSection
              ? 'bg-primary-700 text-white shadow-sm'
              : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800 dark:hover:text-slate-100',
          )}
        >
          {section}
        </button>
      ))}
    </div>
  );
}

interface QuestionPaletteProps {
  questions: Question[];
  activeSection: string | undefined;
  currentIndex: number;
  progress: AttemptProgress;
  onJump: (index: number) => void;
}

export function QuestionPalette({ questions, activeSection, currentIndex, progress, onJump }: QuestionPaletteProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-2">
        {questions.map((question, index) => {
          if (question.section !== activeSection) return null;
          const status = getQuestionStatus(progress, question.id);
          const isCurrent = index === currentIndex;
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onJump(index)}
              aria-label={`Question ${index + 1}, ${status}`}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex aspect-square items-center justify-center rounded-lg border text-sm font-semibold transition hover:scale-105',
                statusStyles[status],
                isCurrent && 'outline outline-2 outline-offset-2 outline-primary-600',
              )}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <ul className="grid grid-cols-1 gap-2 text-xs text-slate-600 dark:text-slate-400">
        {statusLegend.map((item) => (
          <li key={item.status} className="flex items-center gap-2">
            <span className={cn('h-4 w-4 rounded border', statusStyles[item.status])} aria-hidden />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
