import { normalizePitchCoordinate } from '@/lib/data/tactical-pitch-bench';

export interface TacticalBenchIndicatorProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  className?: string;
}

export function TacticalBenchIndicator({
  x,
  y,
  width,
  height,
  className = '',
}: TacticalBenchIndicatorProps) {
  const normalized = normalizePitchCoordinate(
    { x, y },
    width && height ? { width, height } : undefined,
  );

  return (
    <div
      data-testid="tactical-bench-indicator"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-mono dark:bg-slate-800 dark:text-slate-200 ${className}`}
    >
      <span className="font-semibold text-slate-500 dark:text-slate-400">
        POS:
      </span>
      <span>{normalized.x}%</span>
      <span className="text-slate-400">/</span>
      <span>{normalized.y}%</span>
    </div>
  );
}
