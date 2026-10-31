import { percent } from '@/lib/utils';

export const CERTIFICATE_PASS_PERCENT = 50;

export function isCertificateEligible(score: number, totalMarks: number) {
  return totalMarks > 0 && percent(score, totalMarks) >= CERTIFICATE_PASS_PERCENT;
}
