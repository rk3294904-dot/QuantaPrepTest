import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';import { db } from '@/lib/firebase';
import { REFERRAL_COINS } from '@/lib/constants';
import type { ReferralRecord } from '@/lib/types';
import { asNumber, asString, toDate } from '@/services/converters';
import { buildTxLog } from '@/services/coinService';

const usersRef = collection(db, 'users');
const referralsRef = collection(db, 'referrals');

// 6-char base32-ish code derived from the uid. Stable per user and collision-resistant enough.
export function generateReferralCode(uid: string): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let hash = 0;
  for (let i = 0; i < uid.length; i += 1) {
    hash = (hash * 31 + uid.charCodeAt(i)) >>> 0;
  }
  let code = '';
  let n = hash;
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length) + hash;
  }
  return code;
}

function toReferral(id: string, data: Record<string, unknown>): ReferralRecord {
  return {
    id,
    referrerUid: asString(data.referrerUid),
    referredUid: asString(data.referredUid),
    referredName: asString(data.referredName),
    referredEmail: asString(data.referredEmail),
    coinsAwarded: asNumber(data.coinsAwarded, REFERRAL_COINS),
    createdAt: toDate(data.createdAt),
  };
}

export async function listReferralsBy(referrerUid: string): Promise<ReferralRecord[]> {
  const snap = await getDocs(
    query(referralsRef, where('referrerUid', '==', referrerUid), orderBy('createdAt', 'desc'), limit(100)),
  );
  return snap.docs.map((d) => toReferral(d.id, d.data() as Record<string, unknown>));
}

/**
 * Applies a referral code during a new user's first sign-in.
 * Awards 5 coins to the referrer only. The referred user is linked but does not
 * receive coins, matching the "every referral user gets 5 coins" rule.
 *
 * Safe to call from the client because Firestore rules enforce:
 *  - the users doc must not exist yet (create-only),
 *  - the referrer must exist and own the submitted code,
 *  - self-referral is rejected,
 *  - the referral record is create-only with server-stamped fields.
 *
 * Returns the awarded coin count (0 if the code was invalid or already used).
 */
export async function applyReferralCode(newUser: User, code: string): Promise<number> {
  const clean = code.trim().toUpperCase();
  if (!clean) return 0;
  if (clean.length < 5) throw new Error('Referral code looks too short.');

  const newUid = newUser.uid;
  if (clean === generateReferralCode(newUid)) {
    throw new Error('You cannot use your own referral code.');
  }

  // Find the referrer by their stored referralCode. Equality query keeps it index-friendly.
  const snap = await getDocs(query(usersRef, where('referralCode', '==', clean), limit(1)));
  if (snap.empty) throw new Error('No one is using that referral code. Check and try again.');
  const referrerDoc = snap.docs[0];
  const referrerUid = referrerDoc.id;

  return runTransaction(db, async (tx) => {
    const referrerRef = doc(db, 'users', referrerUid);
    const newUserRef = doc(db, 'users', newUid);
    const referralId = `${referrerUid}_${newUid}`;
    const referralRef = doc(db, 'referrals', referralId);
    const existing = await tx.get(referralRef);
    if (existing.exists()) return 0; // already processed

    tx.set(referralRef, {
      referrerUid,
      referredUid: newUid,
      referredName: newUser.displayName ?? newUser.email ?? 'Student',
      referredEmail: newUser.email ?? '',
      coinsAwarded: REFERRAL_COINS,
      createdAt: serverTimestamp(),
    });
    tx.update(referrerRef, { coins: increment(REFERRAL_COINS) });
    tx.update(newUserRef, { referredBy: referrerUid });
    const logRef = doc(collection(db, 'coinTransactions'));
    tx.set(logRef, buildTxLog(referrerUid, REFERRAL_COINS, 'referral', `Referral: ${newUser.displayName ?? newUser.email ?? 'Student'}`));
    return REFERRAL_COINS;
  });
}

// Fetches the referrer's display name + current coins (used on the referral page summary).
export async function getReferrerPreview(code: string): Promise<{ name: string; coins: number } | null> {
  const clean = code.trim().toUpperCase();
  if (!clean) return null;
  const snap = await getDocs(query(usersRef, where('referralCode', '==', clean), limit(1)));
  if (snap.empty) return null;
  const data = snap.docs[0].data() as Record<string, unknown>;
  return {
    name: asString(data.name, 'A QuantaPrep student'),
    coins: asNumber(data.coins, 0),
  };
}

// Reads a referral record by id, useful for confirmation displays.
export async function getReferral(referrerUid: string, referredUid: string): Promise<ReferralRecord | null> {
  const ref = doc(db, 'referrals', `${referrerUid}_${referredUid}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return toReferral(snap.id, snap.data() as Record<string, unknown>);
}

/**
 * Lets an existing user redeem a referral code if they haven't already.
 * Same constraints as applyReferralCode, plus the user must not already have a referrer.
 */
export async function redeemReferralCode(currentUser: User, code: string): Promise<number> {
  const clean = code.trim().toUpperCase();
  if (!clean) throw new Error('Enter a referral code.');
  if (clean.length < 5) throw new Error('That code looks too short.');

  if (clean === generateReferralCode(currentUser.uid)) {
    throw new Error('You cannot use your own referral code.');
  }

  const snap = await getDocs(query(usersRef, where('referralCode', '==', clean), limit(1)));
  if (snap.empty) throw new Error('No one is using that referral code. Check and try again.');
  const referrerUid = snap.docs[0].id;

  return runTransaction(db, async (tx) => {
    const referrerRef = doc(db, 'users', referrerUid);
    const myRef = doc(db, 'users', currentUser.uid);
    const mySnap = await tx.get(myRef);
    if (!mySnap.exists()) throw new Error('Your profile is not ready yet.');
    if (mySnap.data().referredBy != null) {
      throw new Error('You have already used a referral code.');
    }

    const referralId = `${referrerUid}_${currentUser.uid}`;
    const referralRef = doc(db, 'referrals', referralId);
    const existing = await tx.get(referralRef);
    if (existing.exists()) throw new Error('This referral has already been used.');

    tx.set(referralRef, {
      referrerUid,
      referredUid: currentUser.uid,
      referredName: currentUser.displayName ?? currentUser.email ?? 'Student',
      referredEmail: currentUser.email ?? '',
      coinsAwarded: REFERRAL_COINS,
      createdAt: serverTimestamp(),
    });
    tx.update(referrerRef, { coins: increment(REFERRAL_COINS) });
    tx.update(myRef, { referredBy: referrerUid });
    const logRef = doc(collection(db, 'coinTransactions'));
    tx.set(logRef, buildTxLog(referrerUid, REFERRAL_COINS, 'referral', `Referral: ${currentUser.displayName ?? currentUser.email ?? 'Student'}`));
    return REFERRAL_COINS;
  });
}
