import { useCallback, useEffect, useRef } from 'react';

export function useIraTrigger(onTrigger: () => void, threshold = 8) {
  const clickCountRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return useCallback(() => {
    clickCountRef.current += 1;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      clickCountRef.current = 0;
    }, 2500);
    if (clickCountRef.current >= threshold) {
      clickCountRef.current = 0;
      onTrigger();
    }
  }, [onTrigger, threshold]);
}
