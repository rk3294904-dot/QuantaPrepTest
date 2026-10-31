import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PREMIUM_COST } from '@/lib/constants';
import type { PlanStatus, PremiumPlan } from '@/lib/types';
import { asBoolean, asNumber, asString, toDate } from '@/services/converters';

const plansRef = collection(db, 'plans');

function toPlan(id: string, data: Record<string, unknown>): PremiumPlan {
  return {
    id,
    name: asString(data.name, 'Premium Plan'),
    description: asString(data.description),
    coinCost: asNumber(data.coinCost, PREMIUM_COST),
    couponCode: asString(data.couponCode).toUpperCase(),
    status: asString(data.status, 'active') as PlanStatus,
    maxRedemptions: asNumber(data.maxRedemptions, 0),
    redemptionCount: asNumber(data.redemptionCount, 0),
    validUntil: toDate(data.validUntil),
    createdAt: toDate(data.createdAt),
  };
}

export async function listAllPlans(): Promise<PremiumPlan[]> {
  const snap = await getDocs(query(plansRef, orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => toPlan(d.id, d.data() as Record<string, unknown>));
}

export interface PlanInput {
  name: string;
  description: string;
  coinCost: number;
  couponCode: string;
  status: PlanStatus;
  maxRedemptions: number;
  validUntil: Date | null;
}

export async function createPlan(input: PlanInput): Promise<string> {
  const ref = doc(plansRef);
  await setDoc(ref, {
    name: input.name,
    description: input.description,
    coinCost: input.coinCost,
    couponCode: input.couponCode.trim().toUpperCase(),
    status: input.status,
    maxRedemptions: input.maxRedemptions,
    validUntil: input.validUntil,
    redemptionCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePlan(id: string, input: Partial<PlanInput>): Promise<void> {
  const update: Record<string, unknown> = { ...input };
  if (input.couponCode) update.couponCode = input.couponCode.trim().toUpperCase();
  await updateDoc(doc(db, 'plans', id), update);
}

export async function deletePlan(id: string): Promise<void> {
  await deleteDoc(doc(db, 'plans', id));
}

export function generateCouponCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}
