import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PREMIUM_COST } from '@/lib/constants';
import { buildTxLog } from '@/services/coinService';
import { asBoolean, asNumber, asString, toDate } from '@/services/converters';
import type { PremiumPlan } from '@/lib/types';

function toPlan(id: string, data: Record<string, unknown>): PremiumPlan {
  return {
    id,
    name: asString(data.name, 'Premium Plan'),
    description: asString(data.description),
    coinCost: asNumber(data.coinCost, PREMIUM_COST),
    couponCode: asString(data.couponCode).toUpperCase(),
    status: asString(data.status, 'active') as PremiumPlan['status'],
    maxRedemptions: asNumber(data.maxRedemptions, 0),
    redemptionCount: asNumber(data.redemptionCount, 0),
    validUntil: toDate(data.validUntil),
    createdAt: toDate(data.createdAt),
  };
}

/** Finds an active plan by coupon code (case-insensitive lookup on the uppercased field). */
export async function findPlanByCoupon(code: string): Promise<PremiumPlan | null> {
  const clean = code.trim().toUpperCase();
  if (!clean) return null;
  const snap = await getDocs(
    query(collection(db, 'plans'), where('couponCode', '==', clean), where('status', '==', 'active'), limit(1)),
  );
  if (snap.empty) return null;
  return toPlan(snap.docs[0].id, snap.docs[0].data() as Record<string, unknown>);
}

/**
 * Upgrades the signed-in user to premium by spending coins.
 * Atomically checks the current coin balance, deducts PREMIUM_COST coins,
 * and sets isPremium to true. The Firestore rule enforces the same
 * constraints server-side, so a race or tampered request is rejected.
 */
export async function buyPremiumWithCoins(uid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error('Your profile is not ready yet.');
    const data = snap.data();
    if (data.isPremium === true) throw new Error('You are already on the premium plan.');
    const coins = data.coins ?? 0;
    if (coins < PREMIUM_COST) {
      throw new Error(`You need ${PREMIUM_COST} coins. You have ${coins}.`);
    }
    tx.update(userRef, {
      coins: coins - PREMIUM_COST,
      isPremium: true,
    });
    const logRef = doc(collection(db, 'coinTransactions'));
    tx.set(logRef, buildTxLog(uid, -PREMIUM_COST, 'premium_purchase', 'Premium plan purchased with coins'));
  });
}

/**
 * Redeems a coupon code to unlock premium for free (or at a discount defined by the plan).
 * The Firestore rule enforces that the plan exists, is active, has remaining redemptions,
 * has not expired, and the user is not already premium. The redemption counter is
 * incremented atomically.
 */
export async function redeemCouponForPremium(uid: string, code: string): Promise<string> {
  const clean = code.trim().toUpperCase();
  if (!clean) throw new Error('Enter a coupon code.');

  const plan = await findPlanByCoupon(clean);
  if (!plan) throw new Error('That coupon code is invalid or no longer active.');
  if (plan.status !== 'active') throw new Error('This coupon is no longer available.');
  if (plan.maxRedemptions > 0 && plan.redemptionCount >= plan.maxRedemptions) {
    throw new Error('This coupon has reached its redemption limit.');
  }
  if (plan.validUntil && plan.validUntil.getTime() < Date.now()) {
    throw new Error('This coupon has expired.');
  }

  const userRef = doc(db, 'users', uid);
  const planRef = doc(db, 'plans', plan.id);
  const couponRedemptionRef = doc(db, 'couponRedemptions', `${uid}_${plan.id}`);

  return runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error('Your profile is not ready yet.');
    if (userSnap.data().isPremium === true) throw new Error('You are already on the premium plan.');

    const existing = await tx.get(couponRedemptionRef);
    if (existing.exists()) throw new Error('You have already used this coupon.');

    tx.update(userRef, { isPremium: true });
    tx.update(planRef, { redemptionCount: increment(1) });
    tx.set(couponRedemptionRef, {
      uid,
      planId: plan.id,
      couponCode: plan.couponCode,
      createdAt: serverTimestamp(),
    });
    const logRef = doc(collection(db, 'coinTransactions'));
    tx.set(logRef, buildTxLog(uid, 0, 'coupon_redeem', `Premium unlocked with coupon: ${plan.couponCode}`));
    return plan.name;
  });
}
