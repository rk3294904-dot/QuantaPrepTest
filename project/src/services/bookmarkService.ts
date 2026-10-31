import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Bookmark } from '@/lib/types';
import { asString } from '@/services/converters';

export function bookmarkIdFor(uid: string, questionId: string) {
  return `${uid}_${questionId}`;
}

export async function listBookmarks(uid: string): Promise<Bookmark[]> {
  const snap = await getDocs(query(collection(db, 'bookmarks'), where('uid', '==', uid)));
  return snap.docs.map((d) => ({
    id: d.id,
    uid: asString(d.data().uid),
    testId: asString(d.data().testId),
    questionId: asString(d.data().questionId),
  }));
}

export async function setBookmark(uid: string, testId: string, questionId: string, enabled: boolean) {
  const ref = doc(db, 'bookmarks', bookmarkIdFor(uid, questionId));
  if (enabled) {
    await setDoc(ref, { uid, testId, questionId });
  } else {
    await deleteDoc(ref);
  }
}
