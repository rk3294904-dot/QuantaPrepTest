import { useCallback, useEffect, useRef, useState } from 'react';
import { AUTOSAVE_INTERVAL_MS } from '@/lib/constants';
import type { Attempt } from '@/lib/types';
import { saveProgress, type AttemptProgress } from '@/services/attemptService';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// Answers, review marks and per-question time live in memory and autosave on an interval
// (and when the tab is hidden). A failed save keeps the data dirty so the next tick retries it.
export function useExamProgress(attempt: Attempt, autosaveEnabled: boolean) {
  const [progress, setProgress] = useState<AttemptProgress>(() => ({
    answers: attempt.answers,
    markedForReview: attempt.markedForReview,
    timeSpent: attempt.timeSpent,
    violations: attempt.violations,
  }));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const dirtyRef = useRef(false);
  const latestRef = useRef(progress);

  useEffect(() => {
    latestRef.current = progress;
  }, [progress]);

  const update = useCallback((updater: (previous: AttemptProgress) => AttemptProgress) => {
    dirtyRef.current = true;
    setProgress(updater);
  }, []);

  const getProgress = useCallback(() => latestRef.current, []);

  const save = useCallback(async () => {
    if (!dirtyRef.current || !autosaveEnabled) return;
    dirtyRef.current = false;
    setSaveState('saving');
    try {
      await saveProgress(attempt.id, latestRef.current);
      setLastSavedAt(new Date());
      setSaveState('saved');
    } catch {
      dirtyRef.current = true;
      setSaveState('error');
    }
  }, [attempt.id, autosaveEnabled]);

  useEffect(() => {
    const intervalId = window.setInterval(() => void save(), AUTOSAVE_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void save();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [save]);

  return { progress, update, getProgress, save, saveState, lastSavedAt };
}
