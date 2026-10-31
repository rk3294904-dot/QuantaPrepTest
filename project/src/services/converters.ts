import { Timestamp } from 'firebase/firestore';
import type { AnswerValue, CategoryStat } from '@/lib/types';

export function toDate(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function asNumberMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'number') result[key] = item;
  }
  return result;
}

export function asAnswerMap(value: unknown): Record<string, AnswerValue> {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, AnswerValue> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'number') result[key] = item;
    else if (typeof item === 'string') result[key] = item;
    else if (Array.isArray(item) && item.every((v) => typeof v === 'number')) result[key] = item as number[];
  }
  return result;
}

export function asStatMap(value: unknown): Record<string, CategoryStat> {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, CategoryStat> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!item || typeof item !== 'object') continue;
    const stat = item as Record<string, unknown>;
    result[key] = {
      correct: asNumber(stat.correct),
      wrong: asNumber(stat.wrong),
      skipped: asNumber(stat.skipped),
    };
  }
  return result;
}
