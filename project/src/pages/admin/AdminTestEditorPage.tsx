import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { errorMessage } from '@/lib/utils';
import type { Difficulty, Test, TestStatus } from '@/lib/types';
import { listCategories } from '@/services/categoryService';
import { getTest, saveTest, type TestInput } from '@/services/testService';
import { Button } from '@/components/ui/Button';
import { FormField, Toggle } from '@/components/ui/FormField';
import { PageHeader, ErrorState, Skeleton } from '@/components/ui/Feedback';

export function AdminTestEditorPage() {
  const { testId } = useParams();
  const isNew = !testId;

  const testQuery = useQuery({
    queryKey: ['test', testId],
    queryFn: () => getTest(testId ?? ''),
    enabled: Boolean(testId),
  });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories });

  if (!isNew && testQuery.isLoading) return <Skeleton className="mx-auto h-96 max-w-4xl" />;
  if (!isNew && testQuery.isError) {
    return <div className="mx-auto max-w-3xl"><ErrorState onRetry={() => void testQuery.refetch()} /></div>;
  }
  if (!isNew && testQuery.data === null) {
    return <div className="mx-auto max-w-3xl"><ErrorState message="This test no longer exists." /></div>;
  }

  return (
    <TestForm
      key={testId ?? 'new'}
      test={testQuery.data ?? null}
      categories={(categoriesQuery.data ?? []).filter((c) => c.isActive || c.id === testQuery.data?.categoryId)}
      categoriesLoading={categoriesQuery.isLoading}
    />
  );
}

interface FormState {
  title: string;
  categoryId: string;
  description: string;
  durationMinutes: string;
  negativeMarks: string;
  instructions: string;
  language: string;
  difficulty: Difficulty;
  isPaid: boolean;
  status: TestStatus;
}

function initialState(test: Test | null): FormState {
  return {
    title: test?.title ?? '',
    categoryId: test?.categoryId ?? '',
    description: test?.description ?? '',
    durationMinutes: String(test?.durationMinutes ?? 60),
    negativeMarks: String(test?.negativeMarks ?? 0.25),
    instructions: test?.instructions ?? '',
    language: test?.language ?? 'English',
    difficulty: test?.difficulty ?? 'medium',
    isPaid: test?.isPaid ?? false,
    status: test?.status ?? 'draft',
  };
}

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (form.title.trim().length < 3) errors.title = 'Enter at least 3 characters.';
  if (!form.categoryId) errors.categoryId = 'Choose a category.';
  const duration = Number(form.durationMinutes);
  if (!Number.isFinite(duration) || duration < 1 || duration > 600) errors.durationMinutes = 'Between 1 and 600 minutes.';
  const negative = Number(form.negativeMarks);
  if (!Number.isFinite(negative) || negative < 0) errors.negativeMarks = 'Cannot be negative.';
  return errors;
}

function TestForm({
  test,
  categories,
  categoriesLoading,
}: {
  test: Test | null;
  categories: Array<{ id: string; name: string }>;
  categoriesLoading: boolean;
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(() => initialState(test));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: (input: TestInput) => saveTest(input, test ?? undefined),
    onSuccess: (id) => {
      toast.success(test ? 'Test updated' : 'Test created', test ? undefined : 'Now add questions to it.');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tests'] });
      void queryClient.invalidateQueries({ queryKey: ['test', id] });
      navigate(test ? '/admin/tests' : `/admin/tests/${id}/questions`);
    },
    onError: (error) => toast.error('Could not save test', errorMessage(error, 'Please try again.')),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    saveMutation.mutate({
      categoryId: form.categoryId,
      title: form.title.trim(),
      description: form.description.trim(),
      durationMinutes: Number(form.durationMinutes),
      negativeMarks: Number(form.negativeMarks),
      instructions: form.instructions,
      language: form.language.trim() || 'English',
      difficulty: form.difficulty,
      isPaid: form.isPaid,
      status: form.status,
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow={test ? 'Edit test' : 'New test'}
        title={test ? test.title : 'Create a test'}
        description="Instructions support math: wrap formulas in $...$."
        actions={
          test && (
            <Link to={`/tests/${test.id}`}>
              <Button variant="outline" icon={<Eye className="h-4 w-4" />}>Preview</Button>
            </Link>
          )
        }
      />

      <form onSubmit={handleSubmit} className="surface space-y-6 p-6 sm:p-8" noValidate>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="Title" htmlFor="test-title" error={errors.title} className="sm:col-span-2">
            <input id="test-title" className="input-base" value={form.title} onChange={(e) => update('title', e.target.value)} maxLength={160} />
          </FormField>
          <FormField label="Category" htmlFor="test-category" error={errors.categoryId}>
            <select id="test-category" className="input-base" value={form.categoryId} onChange={(e) => update('categoryId', e.target.value)} disabled={categoriesLoading}>
              <option value="">{categoriesLoading ? 'Loading...' : 'Select a category'}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Language" htmlFor="test-language">
            <input id="test-language" className="input-base" value={form.language} onChange={(e) => update('language', e.target.value)} />
          </FormField>
          <FormField label="Description" htmlFor="test-description" className="sm:col-span-2">
            <textarea id="test-description" rows={2} className="input-base" value={form.description} onChange={(e) => update('description', e.target.value)} />
          </FormField>
          <FormField label="Duration (minutes)" htmlFor="test-duration" error={errors.durationMinutes}>
            <input id="test-duration" type="number" min={1} max={600} className="input-base" value={form.durationMinutes} onChange={(e) => update('durationMinutes', e.target.value)} />
          </FormField>
          <FormField label="Total marks" htmlFor="test-marks" hint="Calculated automatically from the marks of each question.">
            <input id="test-marks" className="input-base" value={test ? String(test.totalMarks) : 'Set by questions'} disabled readOnly />
          </FormField>
          <FormField label="Negative marks per wrong answer" htmlFor="test-negative" error={errors.negativeMarks} hint="Use 0 for no negative marking.">
            <input id="test-negative" type="number" min={0} step="any" className="input-base" value={form.negativeMarks} onChange={(e) => update('negativeMarks', e.target.value)} />
          </FormField>
          <FormField label="Difficulty" htmlFor="test-difficulty">
            <select id="test-difficulty" className="input-base" value={form.difficulty} onChange={(e) => update('difficulty', e.target.value as Difficulty)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </FormField>
          <FormField label="Status" htmlFor="test-status" hint="Only published tests are visible to students.">
            <select id="test-status" className="input-base" value={form.status} onChange={(e) => update('status', e.target.value as TestStatus)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </FormField>
          <FormField label="Instructions" htmlFor="test-instructions" className="sm:col-span-2">
            <textarea id="test-instructions" rows={5} className="input-base" value={form.instructions} onChange={(e) => update('instructions', e.target.value)} />
          </FormField>
        </div>
        <Toggle
          checked={form.isPaid}
          onChange={(value) => update('isPaid', value)}
          label="Premium test"
          description="Only students marked as premium by the admin can start it."
        />
        <div className="flex justify-end gap-2">
          <Link to="/admin/tests"><Button variant="outline" type="button">Cancel</Button></Link>
          <Button type="submit" loading={saveMutation.isPending}>{test ? 'Save changes' : 'Create test'}</Button>
        </div>
      </form>
    </div>
  );
}
