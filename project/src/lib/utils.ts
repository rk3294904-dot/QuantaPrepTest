import { FirestoreError } from 'firebase/firestore';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function formatDurationWords(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function formatDate(date: Date | null) {
  if (!date) return '-';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(date: Date | null) {
  if (!date) return '-';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function percent(part: number, whole: number) {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toFirestoreKey(value: string, fallback: string) {
  const cleaned = value.replace(/[.~*/[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || fallback;
}

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof FirestoreError && error.code === 'permission-denied') {
    return 'You do not have permission to do that.';
  }
  if (error instanceof FirestoreError && error.code === 'unavailable') {
    return 'You appear to be offline. Please check your connection.';
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
