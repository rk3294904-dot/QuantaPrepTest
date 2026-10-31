import { Award } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { percent } from '@/lib/utils';
import { Logo } from '@/components/layout/Logo';

interface CertificateProps {
  studentName: string;
  testTitle: string;
  score: number;
  totalMarks: number;
  date: Date;
}

export function Certificate({ studentName, testTitle, score, totalMarks, date }: CertificateProps) {
  const formattedDate = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="certificate-print mx-auto w-full max-w-2xl border-[6px] border-double border-primary-700 bg-white p-6 text-center text-slate-900 sm:p-10">
      <div className="flex items-center justify-center gap-2">
        <Logo compact />
        <span className="font-semibold text-slate-800">{APP_NAME}</span>
      </div>

      <Award className="mx-auto mt-8 h-12 w-12 text-accent-700" aria-hidden />
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Certificate of achievement</p>
      <p className="mt-6 text-sm text-slate-600">This certifies that</p>
      <p className="mt-2 font-serif text-3xl font-bold text-primary-800 sm:text-4xl">{studentName}</p>
      <p className="mt-6 text-sm text-slate-600">has scored</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">
        {score} / {totalMarks} <span className="text-base font-semibold text-slate-600">({percent(score, totalMarks)}%)</span>
      </p>
      <p className="mt-4 text-sm text-slate-600">in</p>
      <p className="mt-2 font-serif text-xl font-semibold text-slate-900">{testTitle}</p>

      <p className="mt-8 text-xs text-slate-500">Issued on {formattedDate}</p>
    </div>
  );
}
