import { useCallback, useMemo, useState } from 'react';
import { parseTimeStr } from '@/lib/features/MemoOverlay/utils';

export function useMemoOverlayTime() {
  const [timeStr, setTimeStr] = useState('');

  const formattedTime = useMemo(() => parseTimeStr(timeStr), [timeStr]);

  const setTimeStrAction = useCallback((val: string) => {
    setTimeStr(val);
  }, []);

  const appendTimeDigit = useCallback((digit: string) => {
    setTimeStr((prev) => (prev + digit).slice(0, 5));
  }, []);

  const backspaceTimeStr = useCallback(() => {
    setTimeStr((prev) => prev.slice(0, -1));
  }, []);

  const resetTime = useCallback(() => {
    setTimeStr('');
  }, []);

  return {
    timeStr,
    formattedTime,
    setTimeStr: setTimeStrAction,
    appendTimeDigit,
    backspaceTimeStr,
    resetTime,
  };
}
