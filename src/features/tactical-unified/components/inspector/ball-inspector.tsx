'use client';

import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { Row } from './inspector-shared-controls';

export function BallInspector({ slideId }: { slideId: string }) {
  const ball = useTacticalUnifiedStore((s) => selectActiveSlide(s)?.ball);
  const setBallVisible = useTacticalUnifiedStore((s) => s.setBallVisible);

  if (!ball) return null;

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-white select-none custom-scrollbar">
      <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70 space-y-1">
        <span className="font-semibold text-white">Ball Settings</span>
        <p className="text-[11px] text-white/50">
          Position: ({Math.round(ball.x)}%, {Math.round(ball.y)}%)
        </p>
      </div>

      <Row label="Visibility">
        <button
          type="button"
          onClick={() => setBallVisible(slideId, !ball.visible)}
          className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
            ball.visible
              ? 'bg-blue-600 text-white'
              : 'bg-white/10 text-white/50 hover:text-white'
          }`}
        >
          {ball.visible ? 'Visible' : 'Hidden'}
        </button>
      </Row>
    </div>
  );
}
