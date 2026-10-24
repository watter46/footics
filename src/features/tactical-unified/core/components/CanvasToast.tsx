import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseCanvasToastReturn {
  toastMessage: string | null;
  showToast: (msg: string, durationMs?: number) => void;
  clearToast: () => void;
}

export interface CanvasToastProps {
  message: string | null;
}

export function useCanvasToast(defaultDurationMs = 3000): UseCanvasToastReturn {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToastMessage(null);
  }, []);

  const showToast = useCallback(
    (msg: string, durationMs = defaultDurationMs) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToastMessage(msg);
      timerRef.current = setTimeout(() => {
        setToastMessage((prev) => (prev === msg ? null : prev));
        timerRef.current = null;
      }, durationMs);
    },
    [defaultDurationMs],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { toastMessage, showToast, clearToast };
}

export function CanvasToast({
  message,
}: CanvasToastProps): React.ReactElement | null {
  if (!message) return null;
  return (
    <output
      aria-live="polite"
      data-testid="canvas-toast"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#18181b]/95 text-white border border-white/15 px-4 py-2 rounded-xl shadow-2xl backdrop-blur text-xs font-medium flex items-center gap-2 pointer-events-none select-none"
    >
      <span>{message}</span>
    </output>
  );
}
