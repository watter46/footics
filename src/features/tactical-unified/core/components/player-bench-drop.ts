export interface BenchDropResult {
  isOverBench: boolean;
  benchCoord?: { x: number; y: number };
}

export function resolveBenchDrop(
  clientX: number | undefined,
  clientY: number | undefined,
  stageRect: DOMRect | undefined,
): BenchDropResult {
  let isOverBench = false;
  let benchCoord: { x: number; y: number } | undefined;

  const benchCanvasEl =
    typeof document !== 'undefined'
      ? document.getElementById('tactical-bench-canvas')
      : null;
  const benchRect = benchCanvasEl?.getBoundingClientRect();

  if (benchRect && clientX !== undefined && clientY !== undefined) {
    if (
      clientX >= benchRect.left &&
      clientX <= benchRect.right &&
      clientY >= benchRect.top &&
      clientY <= benchRect.bottom
    ) {
      isOverBench = true;
      const bx = Math.max(
        0,
        Math.min(100, ((clientX - benchRect.left) / benchRect.width) * 100),
      );
      const by = Math.max(
        0,
        Math.min(100, ((clientY - benchRect.top) / benchRect.height) * 100),
      );
      benchCoord = { x: bx, y: by };
    }
  }

  const isOverBenchPanel =
    isOverBench ||
    (clientX !== undefined &&
      (stageRect
        ? clientX >= stageRect.right
        : typeof window !== 'undefined' && clientX >= window.innerWidth - 400));

  return {
    isOverBench: isOverBenchPanel,
    benchCoord,
  };
}
