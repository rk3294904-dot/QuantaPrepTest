import { useState } from 'react';
import { Award, Share2 } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { CERTIFICATE_PASS_PERCENT, isCertificateEligible } from '@/lib/certificate';
import { percent } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Certificate } from '@/components/results/Certificate';

interface ShareScoreCardProps {
  studentName: string;
  testTitle: string;
  score: number;
  totalMarks: number;
  date: Date;
}

export function ShareScoreCard({ studentName, testTitle, score, totalMarks, date }: ShareScoreCardProps) {
  const toast = useToast();
  const [certificateOpen, setCertificateOpen] = useState(false);
  const scorePercent = percent(score, totalMarks);
  const eligible = isCertificateEligible(score, totalMarks);
  const shareText = `I scored ${score}/${totalMarks} (${scorePercent}%) in ${testTitle} on ${APP_NAME}.`;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: APP_NAME, text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast.success('Score copied', 'Paste it anywhere to share your result.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast.error('Could not share', 'Please try again.');
    }
  };

  return (
    <>
      <section className="surface relative overflow-hidden p-6 sm:p-8 print:hidden">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Share your result</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{scorePercent}%</p>
            <p className="mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">
              {eligible
                ? 'You passed this test. Download your certificate or share your score.'
                : `Score at least ${CERTIFICATE_PASS_PERCENT}% to earn a certificate.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {eligible && (
              <Button variant="outline" icon={<Award className="h-4 w-4" />} onClick={() => setCertificateOpen(true)}>
                View certificate
              </Button>
            )}
            <Button icon={<Share2 className="h-4 w-4" />} onClick={() => void handleShare()}>
              Share score
            </Button>
          </div>
        </div>
      </section>

      {eligible && (
        <Modal open={certificateOpen} onClose={() => setCertificateOpen(false)} title="Your certificate" size="lg" footer={
          <Button onClick={() => window.print()} icon={<Award className="h-4 w-4" />}>Print or save as PDF</Button>
        }>
          <Certificate studentName={studentName} testTitle={testTitle} score={score} totalMarks={totalMarks} date={date} />
        </Modal>
      )}
    </>
  );
}
