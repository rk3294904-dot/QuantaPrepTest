import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Eye, EyeOff, FolderPlus, FolderTree, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { collectDescendantIds } from '@/lib/categories';
import { cn, errorMessage, slugify } from '@/lib/utils';
import type { Category } from '@/lib/types';
import {
  deleteCategory,
  listCategories,
  saveCategory,
  swapCategoryOrder,
  type CategoryInput,
} from '@/services/categoryService';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CATEGORY_ICON_OPTIONS, CategoryIcon } from '@/components/ui/CategoryIcon';
import { FormField, Toggle } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui/Feedback';

export function AdminCategoriesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<{ category: Category | null } | null>(null);

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: listCategories });
  const categories = categoriesQuery.data ?? [];
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['categories'] });
  const onError = (title: string) => (error: unknown) => toast.error(title, errorMessage(error, 'Please try again.'));

  const reorderMutation = useMutation({
    mutationFn: ([a, b]: [Category, Category]) => swapCategoryOrder(a, b),
    onSuccess: refresh,
    onError: onError('Could not reorder'),
  });
  const toggleMutation = useMutation({
    mutationFn: (category: Category) =>
      saveCategory(toInput({ ...category, isActive: !category.isActive }), category.id),
    onSuccess: refresh,
    onError: onError('Could not update'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      toast.success('Category deleted');
      void refresh();
    },
    onError: onError('Could not delete'),
  });

  const rows = flattenCategoryTree(categories);

  const moveCategory = (category: Category, direction: -1 | 1) => {
    const siblings = categories.filter((c) => c.parentId === category.parentId);
    const index = siblings.findIndex((c) => c.id === category.id);
    const neighbor = siblings[index + direction];
    if (neighbor) reorderMutation.mutate([category, neighbor]);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Categories"
        description="Group tests into categories and sub-categories. Students see only active ones."
        actions={
          <Button icon={<FolderPlus className="h-4 w-4" />} onClick={() => setEditor({ category: null })}>
            Add category
          </Button>
        }
      />

      {categoriesQuery.isLoading ? (
        <Skeleton className="h-72" />
      ) : categoriesQuery.isError ? (
        <ErrorState onRetry={() => void categoriesQuery.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon={FolderTree} title="No categories yet" description="Add your first category, such as Quantitative Aptitude." />
      ) : (
        <div className="surface divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
          {rows.map(({ category, depth }) => {
            const siblings = categories.filter((c) => c.parentId === category.parentId);
            const index = siblings.findIndex((c) => c.id === category.id);
            return (
              <div key={category.id} className="flex flex-wrap items-center gap-3 px-5 py-4" style={{ paddingLeft: depth > 0 ? `${20 + depth * 32}px` : undefined }}>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  <CategoryIcon name={category.icon} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{category.name}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    /{category.slug}{depth > 0 ? ' - sub-category' : ''}
                  </p>
                </div>
                <Badge tone={category.isActive ? 'success' : 'neutral'}>{category.isActive ? 'Active' : 'Hidden'}</Badge>
                <div className="flex items-center gap-1">
                  <IconButton label="Move up" disabled={index <= 0} onClick={() => moveCategory(category, -1)}><ArrowUp className="h-4 w-4" /></IconButton>
                  <IconButton label="Move down" disabled={index === siblings.length - 1} onClick={() => moveCategory(category, 1)}><ArrowDown className="h-4 w-4" /></IconButton>
                  <IconButton label={category.isActive ? 'Hide category' : 'Show category'} onClick={() => toggleMutation.mutate(category)}>
                    {category.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </IconButton>
                  <IconButton label="Edit category" onClick={() => setEditor({ category })}><Pencil className="h-4 w-4" /></IconButton>
                  <IconButton
                    label="Delete category"
                    danger
                    onClick={() => {
                      if (window.confirm(`Delete "${category.name}"? This cannot be undone.`)) deleteMutation.mutate(category.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={editor !== null} onClose={() => setEditor(null)} title={editor?.category ? 'Edit category' : 'Add category'}>
        {editor && (
          <CategoryEditor
            key={editor.category?.id ?? 'new'}
            category={editor.category}
            categories={categories}
            onDone={() => setEditor(null)}
          />
        )}
      </Modal>
    </div>
  );
}

interface TreeRow {
  category: Category;
  depth: number;
}

function flattenCategoryTree(categories: Category[]): TreeRow[] {
  const knownIds = new Set(categories.map((c) => c.id));
  const rows: TreeRow[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const category of categories) {
      const isChild = parentId === null ? !category.parentId || !knownIds.has(category.parentId) : category.parentId === parentId;
      if (!isChild) continue;
      rows.push({ category, depth });
      visit(category.id, depth + 1);
    }
  };
  visit(null, 0);
  return rows;
}

function toInput(category: Category): CategoryInput {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    parentId: category.parentId,
    order: category.order,
    isActive: category.isActive,
  };
}

function IconButton({
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
      className={cn(
        'rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
        danger && 'hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-600/15 dark:hover:text-error-500',
      )}
    >
      {children}
    </button>
  );
}

function CategoryEditor({
  category,
  categories,
  onDone,
}: {
  category: Category | null;
  categories: Category[];
  onDone: () => void;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(category?.name ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [icon, setIcon] = useState(category?.icon ?? 'book');
  const [parentId, setParentId] = useState(category?.parentId ?? '');
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [nameError, setNameError] = useState<string | undefined>();

  const saveMutation = useMutation({
    mutationFn: (input: CategoryInput) => saveCategory(input, category?.id),
    onSuccess: () => {
      toast.success(category ? 'Category updated' : 'Category added');
      void queryClient.invalidateQueries({ queryKey: ['categories'] });
      onDone();
    },
    onError: (error) => toast.error('Could not save', errorMessage(error, 'Please try again.')),
  });

  const parentOptions = categories.filter((c) => c.id !== category?.id && !(category && collectDescendantIds(category.id, categories).has(c.id)));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError('Enter at least 2 characters.');
      return;
    }
    const nextOrder = category?.order ?? Math.max(0, ...categories.map((c) => c.order)) + 1;
    saveMutation.mutate({
      name: trimmed,
      slug: slugify(trimmed),
      description: description.trim(),
      icon,
      parentId: parentId || null,
      order: nextOrder,
      isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormField label="Name" htmlFor="category-name" error={nameError}>
        <input id="category-name" className="input-base" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField label="Description" htmlFor="category-description">
        <textarea id="category-description" rows={3} className="input-base" value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Icon" htmlFor="category-icon">
          <select id="category-icon" className="input-base" value={icon} onChange={(e) => setIcon(e.target.value)}>
            {CATEGORY_ICON_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Parent category" htmlFor="category-parent" hint="Leave empty for a top-level category.">
          <select id="category-parent" className="input-base" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">None (top level)</option>
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </FormField>
      </div>
      <Toggle checked={isActive} onChange={setIsActive} label="Visible to students" description="Hidden categories stay in the admin but disappear from the site." />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onDone} type="button">Cancel</Button>
        <Button type="submit" loading={saveMutation.isPending}>Save category</Button>
      </div>
    </form>
  );
}
