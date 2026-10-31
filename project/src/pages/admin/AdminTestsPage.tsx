import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Copy, Eye, FileQuestion, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { cn, errorMessage, formatDate } from '@/lib/utils';
import { listCategories } from '@/services/categoryService';
import { deleteTestCascade, duplicateTest, listAllTests } from '@/services/testService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/Feedback';
import { difficultyTone } from '@/components/tests/TestCard';

type StatusFilter = 'all' | 'draft' | 'published';

export function AdminTestsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const testsQuery = useQuery({ queryKey: ['admin', 'tests'], queryFn: listAllTests });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const categoryName = useMemo(
    () => new Map((categoriesQuery.data ?? []).map((c) => [c.id, c.name])),
    [categoriesQuery.data],
  );

  const tests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (testsQuery.data ?? []).filter(
      (t) =>
        (status === 'all' || t.status === status) &&
        (!term || t.title.toLowerCase().includes(term) || (categoryName.get(t.categoryId) ?? '').toLowerCase().includes(term)),
    );
  }, [testsQuery.data, search, status, categoryName]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'tests'] });
  const onError = (title: string) => (error: unknown) => toast.error(title, errorMessage(error, 'Please try again.'));

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateTest(id),
    onSuccess: () => {
      toast.success('Test duplicated', 'The copy is saved as a draft.');
      void refresh();
    },
    onError: onError('Could not duplicate'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTestCascade(id),
    onSuccess: () => {
      toast.success('Test deleted');
      void refresh();
    },
    onError: onError('Could not delete'),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Tests"
        description="Drafts are visible only to admins. Publish a test when its questions are ready."
        actions={
          <Link to="/admin/tests/new">
            <Button icon={<Plus className="h-4 w-4" />}>New test</Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            className="input-base pl-10"
            placeholder="Search by title or category"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tests"
          />
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900" role="group" aria-label="Filter by status">
          {(['all', 'draft', 'published'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-sm font-medium capitalize transition',
                status === value ? 'bg-primary-700 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400',
              )}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {testsQuery.isLoading ? (
        <Skeleton className="h-72" />
      ) : testsQuery.isError ? (
        <ErrorState onRetry={() => void testsQuery.refetch()} />
      ) : tests.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={testsQuery.data?.length ? 'No tests match' : 'No tests yet'}
          description={testsQuery.data?.length ? 'Try a different search or status.' : 'Create your first test, or seed sample data from the Seed page.'}
          action={<Link to="/admin/tests/new"><Button>Create a test</Button></Link>}
        />
      ) : (
        <div className="surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Test</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Questions</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tests.map((test) => (
                  <tr key={test.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{test.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {categoryName.get(test.categoryId) ?? 'Uncategorised'} - {test.durationMinutes} min - {test.totalMarks} marks
                      </p>
                      <div className="mt-2 flex gap-1.5">
                        <Badge tone={test.isPaid ? 'secondary' : 'success'}>{test.isPaid ? 'Premium' : 'Free'}</Badge>
                        <Badge tone={difficultyTone[test.difficulty]}>{test.difficulty}</Badge>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={test.status === 'published' ? 'success' : 'warning'}>{test.status}</Badge>
                    </td>
                    <td className="px-5 py-4 text-slate-700 dark:text-slate-300">{test.questionCount}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{formatDate(test.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <RowLink to={`/admin/tests/${test.id}/questions`} label="Questions"><FileQuestion className="h-4 w-4" /></RowLink>
                        <RowLink to={`/admin/tests/${test.id}/edit`} label="Edit"><Pencil className="h-4 w-4" /></RowLink>
                        <RowLink to={`/tests/${test.id}`} label="Preview as student"><Eye className="h-4 w-4" /></RowLink>
                        <button
                          type="button"
                          aria-label="Duplicate test"
                          title="Duplicate"
                          disabled={duplicateMutation.isPending}
                          onClick={() => duplicateMutation.mutate(test.id)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete test"
                          title="Delete"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete "${test.title}" along with its questions and leaderboard entries? This cannot be undone.`)) {
                              deleteMutation.mutate(test.id);
                            }
                          }}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-error-50 hover:text-error-600 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-error-600/15 dark:hover:text-error-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function RowLink({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-label={label}
      title={label}
      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    >
      {children}
    </Link>
  );
}
