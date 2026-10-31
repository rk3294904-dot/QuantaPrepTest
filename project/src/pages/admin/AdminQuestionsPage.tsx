import { useState, type DragEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, FileQuestion, FileSpreadsheet, GripVertical, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/lib/utils';
import type { Question } from '@/lib/types';
import { getTest } from '@/services/testService';
import { deleteQuestion, getAnswerKeys, listQuestions, reorderQuestions } from '@/services/questionService';
import { QuestionForm } from '@/components/admin/QuestionForm';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MathText } from '@/components/ui/MathText';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/Feedback';

type Editor = { question: Question | null } | null;

export function AdminQuestionsPage() {
  const { testId = '' } = useParams();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<Editor>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const testQuery = useQuery({ queryKey: ['test', testId], queryFn: () => getTest(testId), enabled: Boolean(testId) });
  const questionsQuery = useQuery({
    queryKey: ['questions', testId],
    queryFn: () => listQuestions(testId),
    enabled: Boolean(testId),
  });
  const keysQuery = useQuery({
    queryKey: ['answer-keys', testId],
    queryFn: () => getAnswerKeys(testId),
    enabled: Boolean(testId),
  });

  const questions = questionsQuery.data ?? [];
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['questions', testId] });
    void queryClient.invalidateQueries({ queryKey: ['test', testId] });
  };
  const onError = (title: string) => (error: unknown) => toast.error(title, errorMessage(error, 'Please try again.'));

  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => reorderQuestions(testId, ids),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['questions', testId] }),
    onError: onError('Could not reorder'),
  });
  const deleteMutation = useMutation({
    mutationFn: (questionId: string) => deleteQuestion(testId, questionId),
    onSuccess: () => {
      toast.success('Question deleted');
      refresh();
      void queryClient.invalidateQueries({ queryKey: ['answer-keys', testId] });
    },
    onError: onError('Could not delete'),
  });

  const reorderTo = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const ids = questions.map((q) => q.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, fromId);
    reorderMutation.mutate(ids);
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = questions[index + direction];
    if (target) reorderTo(questions[index].id, target.id);
  };

  const onDragStart = (event: DragEvent<HTMLDivElement>, id: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
    setDragId(id);
  };

  const onDrop = (event: DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault();
    if (dragId) reorderTo(dragId, targetId);
    setDragId(null);
    setOverId(null);
  };

  const openEditor = (question: Question | null) => {
    setEditor({ question });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={testQuery.data ? `${testQuery.data.questionCount} questions` : 'Questions'}
        title={testQuery.data?.title ?? 'Questions'}
        description="Drag a question by its handle, or use the arrows, to change the order students see."
        actions={
          <>
            <Link to={`/admin/tests/${testId}/questions/bulk`}>
              <Button variant="outline" icon={<Upload className="h-4 w-4" />}>Bulk upload</Button>
            </Link>
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => openEditor(null)}>Add question</Button>
          </>
        }
      />

      <Link to="/admin/tests" className="inline-flex text-sm font-medium text-slate-600 hover:text-primary-700 dark:text-slate-400 dark:hover:text-primary-300">
        Back to tests
      </Link>

      {questionsQuery.isLoading || keysQuery.isLoading ? (
        <Skeleton className="h-96" />
      ) : questionsQuery.isError || keysQuery.isError ? (
        <ErrorState message="We could not load the questions for this test." onRetry={() => { void questionsQuery.refetch(); void keysQuery.refetch(); }} />
      ) : questions.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="No questions yet"
          description="Add questions one at a time, or upload a spreadsheet with many at once."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => openEditor(null)}>Add question</Button>
              <Link to={`/admin/tests/${testId}/questions/bulk`}><Button variant="outline" icon={<FileSpreadsheet className="h-4 w-4" />}>Bulk upload</Button></Link>
            </div>
          }
        />
      ) : (
        <ol className="space-y-3">
          {questions.map((question, index) => {
            const correct = keysQuery.data?.[question.id];
            return (
              <li
                key={question.id}
                onDragOver={(event) => {
                  event.preventDefault();
                  setOverId(question.id);
                }}
                onDragLeave={() => setOverId((current) => (current === question.id ? null : current))}
                onDrop={(event) => onDrop(event, question.id)}
                className={overId === question.id && dragId !== question.id ? 'rounded-2xl ring-2 ring-primary-400' : ''}
              >
                <div className="surface flex gap-3 p-4 sm:gap-4 sm:p-5">
                  <div
                    draggable
                    onDragStart={(event) => onDragStart(event, question.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverId(null);
                    }}
                    className="flex cursor-grab touch-none flex-col items-center gap-1 text-slate-400 active:cursor-grabbing"
                    aria-label={`Drag to reorder question ${index + 1}`}
                    role="presentation"
                  >
                    <GripVertical className="h-5 w-5" aria-hidden />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{index + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="primary">{question.section}</Badge>
                      <Badge tone="neutral">{question.topic}</Badge>
                      <Badge tone="accent">{question.marks} mark{question.marks === 1 ? '' : 's'}</Badge>
                      {question.negativeMarks !== null && <Badge tone="error">-{question.negativeMarks} if wrong</Badge>}
                      <Badge tone="neutral">{question.questionType.replace('_', ' ')}</Badge>
                    {correct !== undefined && (
                      <Badge tone="success">
                        Answer {question.questionType === 'multiple'
                          ? correct.split('|').sort().join(', ')
                          : question.questionType === 'fill_blank'
                            ? correct.split('|').join(' / ')
                            : correct}
                      </Badge>
                    )}
                    </div>
                    <div className="mt-2 line-clamp-3 text-sm text-slate-800 dark:text-slate-200">
                      <MathText text={question.text} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                    <IconAction label="Move up" disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></IconAction>
                    <IconAction label="Move down" disabled={index === questions.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></IconAction>
                    <IconAction label="Edit question" onClick={() => openEditor(question)}><Pencil className="h-4 w-4" /></IconAction>
                    <IconAction
                      label="Delete question"
                      danger
                      onClick={() => {
                        if (window.confirm('Delete this question? This cannot be undone.')) deleteMutation.mutate(question.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconAction>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Modal
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editor?.question ? 'Edit question' : 'Add question'}
        size="xl"
      >
        {editor && (
          <QuestionForm
            key={editor.question?.id ?? 'new'}
            testId={testId}
            question={editor.question}
            nextOrder={questions.length + 1}
            onDone={() => setEditor(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={
        'rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100' +
        (danger ? ' hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-600/15 dark:hover:text-error-500' : '')
      }
    >
      {children}
    </button>
  );
}
