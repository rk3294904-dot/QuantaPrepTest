import { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { VIOLATION_LIMIT } from '@/lib/constants';

interface FullscreenGateProps {
  onEnter: () => Promise<boolean>;
}

export function FullscreenGate({ onEnter }: FullscreenGateProps) {
  const [entering, setEntering] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const handleEnter = async () => {
    setEntering(true);
    const entered = await onEnter();
    setEntering(false);
    setBlocked(!entered);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fullscreen-gate-title"
    >
      <div className="surface max-w-md p-8 text-center">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-accent-50 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
          <Maximize2 className="h-7 w-7" aria-hidden />
        </div>
        <h2 id="fullscreen-gate-title" className="text-xl font-bold text-slate-900 dark:text-white">
          Enter full-screen to continue
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          The test runs in full-screen. Leaving full-screen counts as a warning, and {VIOLATION_LIMIT} warnings submit your test automatically.
        </p>
        {blocked ? (
          <p className="mt-4 text-sm text-error-600 dark:text-error-500">
            Your browser blocked full-screen. Try again, or open the test in a new tab.
          </p>
        ) : null}
        <Button className="mt-6 w-full" variant="accent" onClick={() => void handleEnter()} loading={entering}>
          Enter full-screen
        </Button>
      </div>
    </div>
  );
}

interface ViolationWarningProps {
  open: boolean;
  count: number;
  onClose: () => void;
}

export function ViolationWarning({ open, count, onClose }: ViolationWarningProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Warning: you left the test"
      footer={
        <Button variant="accent" onClick={onClose}>
          I understand, continue
        </Button>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Switching tabs or leaving full-screen is recorded. You have {count} of {VIOLATION_LIMIT} warnings. At {VIOLATION_LIMIT}{' '}
        warnings your test is submitted automatically.
      </p>
    </Modal>
  );
}

const WATERMARK_REPEATS = 40;

export function ExamWatermark({ label }: { label: string }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-10 select-none overflow-hidden">
      <div className="absolute -inset-1/2 flex rotate-[-24deg] flex-wrap content-start gap-x-16 gap-y-12 p-10 text-sm font-medium text-slate-900/[0.06] dark:text-white/[0.07]">
        {Array.from({ length: WATERMARK_REPEATS }, (_, index) => (
          <span key={index} className="whitespace-nowrap">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
