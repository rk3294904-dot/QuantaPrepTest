import type { Category } from '@/lib/types';

export function collectDescendantIds(categoryId: string, categories: Category[]): Set<string> {
  const found = new Set<string>();
  const queue = [categoryId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const category of categories) {
      if (category.parentId === current && !found.has(category.id)) {
        found.add(category.id);
        queue.push(category.id);
      }
    }
  }
  return found;
}
