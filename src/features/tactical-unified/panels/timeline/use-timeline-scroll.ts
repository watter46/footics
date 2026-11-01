import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

export interface UseTimelineScrollOptions {
  activeSlideId: string;
  slideCount: number;
}

export interface UseTimelineScrollReturn {
  containerRef: RefObject<HTMLDivElement | null>;
  isDragging: boolean;
  onWheel: (e: ReactWheelEvent<HTMLDivElement>) => void;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
}

const INTERACTIVE_ELEMENTS_SELECTOR =
  'button, [role="button"], [data-no-drag-scroll="true"], input, select, textarea, a';

export function useTimelineScroll({
  activeSlideId,
  slideCount,
}: UseTimelineScrollOptions): UseTimelineScrollReturn {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  // 1. Native wheel listener with { passive: false } for robust preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      if (delta !== 0) {
        e.preventDefault();
        container.scrollLeft += delta;
      }
    };

    container.addEventListener('wheel', handleNativeWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleNativeWheel);
    };
  }, []);

  // 2. React onWheel callback (handles environments where native listener was not attached or synthetic dispatch)
  const onWheel = useCallback((e: ReactWheelEvent<HTMLDivElement>) => {
    if (e.defaultPrevented) return;
    const delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
    if (delta !== 0 && containerRef.current) {
      containerRef.current.scrollLeft += delta;
    }
  }, []);

  // 3. Pointer drag handlers
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const dx = e.clientX - startXRef.current;
    containerRef.current.scrollLeft = startScrollLeftRef.current - dx;
  }, []);

  const stopDragging = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    if (pointerIdRef.current !== null && containerRef.current) {
      try {
        containerRef.current.releasePointerCapture(pointerIdRef.current);
      } catch {
        // no-op if pointer capture cannot be released
      }
      pointerIdRef.current = null;
    }

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopDragging);
    window.removeEventListener('pointercancel', stopDragging);
  }, [handlePointerMove]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // Left click only
      if (e.button !== 0) return;

      // Skip drag scroll on cards, buttons, or other interactive elements
      const target = e.target as HTMLElement | null;
      if (target?.closest(INTERACTIVE_ELEMENTS_SELECTOR)) return;

      isDraggingRef.current = true;
      setIsDragging(true);
      startXRef.current = e.clientX;
      startScrollLeftRef.current = containerRef.current?.scrollLeft ?? 0;
      pointerIdRef.current = e.pointerId;

      if (containerRef.current) {
        try {
          containerRef.current.setPointerCapture(e.pointerId);
        } catch {
          // ignore pointer capture errors in test/unsupported environments
        }
      }

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', stopDragging);
      window.addEventListener('pointercancel', stopDragging);
    },
    [handlePointerMove, stopDragging],
  );

  // Cleanup on unmount (RAII)
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointercancel', stopDragging);
    };
  }, [handlePointerMove, stopDragging]);

  // 4. Auto-scroll active slide into view on activeSlideId or slideCount change
  useEffect(() => {
    if (!activeSlideId || !containerRef.current) return;

    const rafId = requestAnimationFrame(() => {
      const activeEl = containerRef.current?.querySelector<HTMLElement>(
        `[data-slide-id="${activeSlideId}"]`,
      );
      if (activeEl && typeof activeEl.scrollIntoView === 'function') {
        activeEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [activeSlideId, slideCount]);

  return {
    containerRef,
    isDragging,
    onWheel,
    onPointerDown,
  };
}
