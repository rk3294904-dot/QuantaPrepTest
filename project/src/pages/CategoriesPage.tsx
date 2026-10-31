import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, Search, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { collectDescendantIds } from '@/lib/categories';
import { cn } from '@/lib/utils';
import { listCategories } from '@/services/categoryService';
import { listPublishedTests } from '@/services/testService';
import { TestCard } from '@/components/tests/TestCard';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { CardSkeleton, EmptyState, ErrorState, PageHeader } from '@/components/ui/Feedback';

type PriceFilter = 'all' | 'free' | 'paid';

const priceFilters: Array<{ value: PriceFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Premium' },
];

export function CategoriesPage() {
  const [subjectId, setSubjectId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [price, setPrice] = useState<PriceFilter>('all');

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const testsQuery = useQuery({ queryKey: ['tests', 'published'], queryFn: listPublishedTests });

  const allCategories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const activeCategories = useMemo(() => allCategories.filter((c) => c.isActive), [allCategories]);
  const subjects = useMemo(() => activeCategories.filter((c) => c.parentId === null), [activeCategories]);
  const subcategories = useMemo(() => activeCategories.filter((c) => c.parentId === subjectId), [activeCategories, subjectId]);

  const allowedCategoryIds = useMemo(() => {
    const scope = subcategoryId || subjectId;
    const activeIds = new Set(activeCategories.map((c) => c.id));
    if (!scope) return activeIds;
    const scoped = new Set([scope, ...collectDescendantIds(scope, allCategories)]);
    return new Set([...scoped].filter((id) => activeIds.has(id)));
  }, [activeCategories, allCategories, subjectId, subcategoryId]);

  const term = search.trim().toLowerCase();
  const visibleTests = (testsQuery.data ?? []).filter((test) => {
    if (!allowedCategoryIds.has(test.categoryId)) return false;
    if (price === 'free' && test.isPaid) return false;
    if (price === 'paid' && !test.isPaid) return false;
    if (!term) return true;
    return test.title.toLowerCase().includes(term) || test.description.toLowerCase().includes(term);
  });

  const selectedSubject = subjects.find((s) => s.id === subjectId);

  const selectSubject = (id: string) => {
    setSubjectId(id);
    setSubcategoryId('');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
      <PageHeader
        eyebrow="Test series"
        title="Find your next test"
        description="Pick a subject, narrow it down, and start a timed practice test."
      />

      {/* Subject cards */}
      <div className="mt-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Subjects</h2>
        {categoriesQuery.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="surface h-20 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <SubjectCard
              label="All subjects"
              icon={Layers}
              active={subjectId === ''}
              onClick={() => selectSubject('')}
              count={testsQuery.data?.length ?? 0}
            />
            {subjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                label={subject.name}
                iconName={subject.icon}
                active={subjectId === subject.id}
                onClick={() => selectSubject(subject.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Subcategory chips */}
      {subjectId && subcategories.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {selectedSubject?.name} subcategories
          </h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <FilterChip active={subcategoryId === ''} onClick={() => setSubcategoryId('')}>All</FilterChip>
            {subcategories.map((sub) => (
              <FilterChip key={sub.id} active={subcategoryId === sub.id} onClick={() => setSubcategoryId(sub.id)}>
                {sub.name}
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      {/* Search + price filter bar */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative w-full sm:max-w-sm">
          <span className="sr-only">Search tests</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tests..."
            className="input-base pl-10"
          />
        </label>
        <div className="inline-flex w-full items-center gap-2 sm:w-auto">
          <SlidersHorizontal className="hidden h-4 w-4 shrink-0 text-slate-400 sm:block" aria-hidden />
          <div className="inline-flex w-full rounded-xl border border-slate-200 bg-white p-1 sm:w-auto dark:border-slate-800 dark:bg-slate-900" role="group" aria-label="Filter by price">
            {priceFilters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setPrice(item.value)}
                aria-pressed={price === item.value}
                className={cn(
                  'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none',
                  price === item.value
                    ? 'bg-primary-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Test grid */}
      <div className="mt-8">
        {categoriesQuery.isLoading || testsQuery.isLoading ? (
          <CardSkeleton count={6} />
        ) : categoriesQuery.isError || testsQuery.isError ? (
          <ErrorState onRetry={() => { void categoriesQuery.refetch(); void testsQuery.refetch(); }} />
        ) : visibleTests.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No tests found"
            description="Try a different subject, subcategory, search term, or price filter."
          />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                <span className="font-bold text-slate-900 dark:text-white">{visibleTests.length}</span> {visibleTests.length === 1 ? 'test' : 'tests'} available
              </p>
              {(subjectId || price !== 'all' || term) && (
                <button
                  type="button"
                  onClick={() => { selectSubject(''); setPrice('all'); setSearch(''); }}
                  className="text-sm font-medium text-primary-700 transition hover:underline dark:text-primary-300"
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleTests.map((test) => (
                <TestCard key={test.id} test={test} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SubjectCard({ label, icon: Icon, iconName, active, onClick, count }: {
  label: string;
  icon?: LucideIcon;
  iconName?: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group surface flex items-center gap-3 p-3 text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-lift sm:p-4',
        active && 'border-primary-300 ring-2 ring-primary-500/20 dark:border-primary-700',
      )}
    >
      {Icon ? (
        <span className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition sm:h-11 sm:w-11',
          active ? 'bg-primary-700 text-white' : 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300',
        )}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
        </span>
      ) : (
        <span className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition sm:h-11 sm:w-11',
          active ? 'bg-primary-700 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        )}>
          <CategoryIcon name={iconName ?? ''} className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0">
        <p className={cn('truncate text-sm font-semibold transition', active ? 'text-primary-800 dark:text-primary-200' : 'text-slate-800 dark:text-slate-100')}>
          {label}
        </p>
        {count !== undefined && (
          <p className="text-xs text-slate-500 dark:text-slate-400">{count} tests</p>
        )}
      </div>
    </button>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition',
        active
          ? 'border-primary-700 bg-primary-700 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:text-primary-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-primary-300',
      )}
    >
      {children}
    </button>
  );
}
