import {
  collection,
  doc,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Category } from '@/lib/types';
import { asBoolean, asNumber, asString } from '@/services/converters';

export interface CategoryInput {
  name: string;
  slug: string;
  description: string;
  icon: string;
  parentId: string | null;
  order: number;
  isActive: boolean;
}

const categoriesRef = collection(db, 'categories');

function toCategory(id: string, data: Record<string, unknown>): Category {
  return {
    id,
    name: asString(data.name, 'Untitled'),
    slug: asString(data.slug),
    description: asString(data.description),
    icon: asString(data.icon, 'book'),
    parentId: typeof data.parentId === 'string' ? data.parentId : null,
    order: asNumber(data.order),
    isActive: asBoolean(data.isActive, true),
  };
}

export async function listCategories(): Promise<Category[]> {
  const snap = await getDocs(query(categoriesRef, orderBy('order')));
  return snap.docs.map((d) => toCategory(d.id, d.data()));
}

export async function saveCategory(input: CategoryInput, id?: string) {
  if (id) {
    await updateDoc(doc(db, 'categories', id), { ...input });
    return id;
  }
  const ref = doc(categoriesRef);
  await setDoc(ref, input);
  return ref.id;
}

export async function swapCategoryOrder(a: Category, b: Category) {
  const batch = writeBatch(db);
  batch.update(doc(db, 'categories', a.id), { order: b.order });
  batch.update(doc(db, 'categories', b.id), { order: a.order });
  await batch.commit();
}

export async function deleteCategory(id: string) {
  const [children, tests] = await Promise.all([
    getCountFromServer(query(categoriesRef, where('parentId', '==', id))),
    getCountFromServer(query(collection(db, 'tests'), where('categoryId', '==', id))),
  ]);
  if (children.data().count > 0) {
    throw new Error('Move or delete the sub-categories first.');
  }
  if (tests.data().count > 0) {
    throw new Error('Move or delete the tests in this category first.');
  }
  await deleteDoc(doc(db, 'categories', id));
}
