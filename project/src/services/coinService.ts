import {
  collection,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DAILY_BONUS_COINS } from '@/lib/constants';
import type { CoinTransaction, CoinTxType } from '@/lib/types';
import { asNumber, asString, toDate } from '@/services/converters';

const txRef = collection(db, 'coinTransactions');

function toTx(id: string, data: Record<string, unknown>): CoinTransaction {
  return {
    id,
    uid: asString(data.uid),
    amount: asNumber(data.amount),
    type: asString(data.type, 'daily_bonus') as CoinTxType,
    description: asString(data.description),
    createdAt: toDate(data.createdAt),
  };
}

/** Logs a coin transaction. Called from within runTransaction blocks. */
export function buildTxLog(uid: string, amount: number, type: CoinTxType, description: string) {
  return {
    uid,
    amount,
    type,
    description,
    createdAt: serverTimestamp(),
  };
}

export async function logCoinTransaction(uid: string, amount: number, type: CoinTxType, description: string): Promise<void> {
  const ref = doc(collection(db, 'coinTransactions'));
  await setDoc(ref, buildTxLog(uid, amount, type, description));
}

export async function listCoinTransactions(uid: string, max = 50): Promise<CoinTransaction[]> {
  const snap = await getDocs(
    query(txRef, where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(max)),
  );
  return snap.docs.map((d) => toTx(d.id, d.data() as Record<string, unknown>));
}

/**
 * Claims the daily coin bonus. The Firestore rule enforces:
 * - only the owner can claim,
 * - at most one claim per user per UTC day,
 * - coins increment by exactly DAILY_BONUS_COINS.
 * The doc id is uid_YYYY-MM-DD so the daily uniqueness is structural.
 */
export async function claimDailyBonus(uid: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const bonusId = `${uid}_${today}`;
  const bonusRef = doc(db, 'dailyBonuses', bonusId);

  return runTransaction(db, async (tx) => {
    const existing = await tx.get(bonusRef);
    if (existing.exists()) throw new Error('You have already claimed today\u2019s bonus. Come back tomorrow!');

    const userRef = doc(db, 'users', uid);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error('Your profile is not ready yet.');
    if (userSnap.data().blocked) throw new Error('Your account is blocked.');

    tx.set(bonusRef, { uid, date: today, amount: DAILY_BONUS_COINS, createdAt: serverTimestamp() });
    tx.update(userRef, { coins: increment(DAILY_BONUS_COINS) });

    const logRef = doc(collection(db, 'coinTransactions'));
    tx.set(logRef, buildTxLog(uid, DAILY_BONUS_COINS, 'daily_bonus', 'Daily bonus reward'));
    return DAILY_BONUS_COINS;
  });
}

/** Returns the user's last claimed daily bonus date, or null if never claimed. */
export async function getLastDailyBonus(uid: string): Promise<string | null> {
  const snap = await getDocs(
    query(collection(db, 'dailyBonuses'), where('uid', '==', uid), orderBy('date', 'desc'), limit(1)),
  );
  if (snap.empty) return null;
  return asString(snap.docs[0].data().date);
}
