import { useCallback, useEffect, useRef, useState } from 'react';

// One tab switch fires both a visibility change and a window blur; this window merges them.
const DUPLICATE_WINDOW_MS = 1500;

interface ExamIntegrityOptions {
  active: boolean;
  onViolation: () => void;
}

export function useExamIntegrity({ active, onViolation }: ExamIntegrityOptions) {
  const fullscreenRequired = typeof document !== 'undefined' && document.fullscreenEnabled === true;
  const [inFullscreen, setInFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const onViolationRef = useRef(onViolation);
  const lastReportRef = useRef(0);
  const wasFullscreenRef = useRef(inFullscreen);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  useEffect(() => {
    if (!active) return;

    const report = () => {
      const nowMs = Date.now();
      if (nowMs - lastReportRef.current < DUPLICATE_WINDOW_MS) return;
      lastReportRef.current = nowMs;
      onViolationRef.current();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') report();
    };
    const onFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      setInFullscreen(isFullscreen);
      if (wasFullscreenRef.current && !isFullscreen) report();
      wasFullscreenRef.current = isFullscreen;
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('blur', report);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('blur', report);
    };
  }, [active]);

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }, []);

  return { fullscreenRequired, inFullscreen, enterFullscreen };
}
