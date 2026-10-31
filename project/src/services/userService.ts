import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PAGE_SIZE } from '@/lib/constants';
import type { UserProfile } from '@/lib/types';
import { asBoolean, asNumber, asString, toDate } from '@/services/converters';
import { generateReferralCode } from '@/services/referralService';

const usersRef = collection(db, 'users');

export function toUserProfile(uid: string, data: Record<string, unknown>): UserProfile {
  return {
    uid,
    name: asString(data.name, 'Student'),
    email: asString(data.email),
    photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
    isPremium: asBoolean(data.isPremium),
    blocked: asBoolean(data.blocked),
    coins: asNumber(data.coins, 0),
    referralCode: asString(data.referralCode),
    referredBy: typeof data.referredBy === 'string' ? data.referredBy : null,
    createdAt: toDate(data.createdAt),
  };
}

// Creates the profile on first sign-in only. Premium and blocked flags are admin-controlled and always start off.
// Returns true if the profile was newly created, false if it already existed.
export async function ensureUserProfile(user: User): Promise<boolean> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return false;
  await setDoc(ref, {
    name: user.displayName ?? user.email ?? 'Student',
    email: user.email ?? '',
    photoURL: user.photoURL ?? null,
    isPremium: false,
    blocked: false,
    coins: 0,
    referralCode: generateReferralCode(user.uid),
    referredBy: null,
    createdAt: serverTimestamp(),
  });
  return true;
}

export async function updateOwnName(uid: string, name: string) {
  await updateDoc(doc(db, 'users', uid), { name });
}

export async function listUsersPage(cursor?: QueryDocumentSnapshot) {
  const snap = await getDocs(
    query(usersRef, orderBy('createdAt', 'desc'), ...(cursor ? [startAfter(cursor)] : []), limit(PAGE_SIZE)),
  );
  return {
    users: snap.docs.map((d) => toUserProfile(d.id, d.data())),
    cursor: snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : null,
  };
}

export async function searchUsersByEmail(prefix: string): Promise<UserProfile[]> {
  const term = prefix.trim().toLowerCase();
  const snap = await getDocs(
    query(usersRef, where('email', '>=', term), where('email', '<=', `${term}\uf8ff`), orderBy('email'), limit(PAGE_SIZE)),
  );
  return snap.docs.map((d) => toUserProfile(d.id, d.data()));
}

export async function setUserFlags(uid: string, flags: { isPremium?: boolean; blocked?: boolean }) {
  await updateDoc(doc(db, 'users', uid), flags);
}
