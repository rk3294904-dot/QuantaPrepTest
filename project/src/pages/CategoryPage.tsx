import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, FileSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listCategories } from '@/services/categoryService';
import { listPublishedTestsByCategory } from '@/services/testService';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { CardSkeleton, EmptyState, ErrorState, PageHeader } from '@/components/ui/Feedback';
import { TestCard } from '@/components/tests/TestCard';

type PriceFilter = 'all' | 'free' | 'paid';

export function CategoryPage() {
  const { categoryId = '' } = useParams();
  const [filter, setFilter] = useState<PriceFilter>('all');

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const testsQuery = useQuery({
    queryKey: ['tests', 'category', categoryId],
    queryFn: () => listPublishedTestsByCategory(categoryId),
    enabled: Boolean(categoryId),
  });

  const category = categoriesQuery.data?.find((c) => c.id === categoryId);
  const children = useMemo(
    () => (categoriesQuery.data ?? []).filter((c) => c.parentId === categoryId && c.isActive),
    [categoriesQuery.data, categoryId],
  );

  const tests = useMemo(() => {
    const all = testsQuery.data ?? [];
    if (filter === 'all') return all;
    return all.filter((t) => (filter === 'paid' ? t.isPaid : !t.isPaid));
  }, [testsQuery.data, filter]);

  if (categoriesQuery.isSuccess && !category) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState icon={FileSearch} title="Category not found" description="It may have been renamed or removed." action={<Link to="/categories" className="text-sm font-semibold text-primary-700">Back to test series</Link>} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <Link to="/categories" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-primary-700 dark:text-slate-400 dark:hover:text-primary-300">
        <ChevronLeft className="h-4 w-4" /> All categories
      </Link>

      <div className="mt-6 flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-700 text-white">
          <CategoryIcon name={category?.icon ?? 'book'} className="h-6 w-6" />
        </span>
        <PageHeader
          title={category?.name ?? 'Loading category'}
          description={category?.description}
        />
      </div>

      {children.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {children.map((child) => (
            <Link
              key={child.id}
              to={`/categories/${child.id}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-primary-300 hover:text-primary-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-primary-300"
            >
              {child.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Tests</h2>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900" role="group" aria-label="Filter tests by price">
          {(['all', 'free', 'paid'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-sm font-medium transition',
                filter === value ? 'bg-primary-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
              )}
            >
              {value === 'all' ? 'All' : value === 'free' ? 'Free' : 'Premium'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {testsQuery.isLoading ? (
          <CardSkeleton />
        ) : testsQuery.isError ? (
          <ErrorState onRetry={() => void testsQuery.refetch()} />
        ) : tests.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="No tests here yet"
            description="Tests in this category will show up here once they are published."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {tests.map((test) => (
              <TestCard key={test.id} test={test} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
