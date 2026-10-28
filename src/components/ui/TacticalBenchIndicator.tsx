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
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#18181B] border border-white/[0.08] text-white/90 text-xs font-mono ${className}`}
    >
      <span className="font-semibold text-[#71717A]">POS:</span>
      <span>{normalized.x}%</span>
      <span className="text-[#71717A]">/</span>
      <span>{normalized.y}%</span>
    </div>
  );
}
