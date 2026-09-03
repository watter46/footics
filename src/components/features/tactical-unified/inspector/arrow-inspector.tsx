'use client';

import type { ArrowAnnotation } from '@/lib/types/tactical-unified';
import { ColorInput } from '../common-color-input';
import { DeleteButton, RangeInput, Row } from './inspector-shared-controls';

export function ArrowInspector({
  arrow,
  slideId,
  updateArrow,
  onRemove,
}: {
  arrow: ArrowAnnotation;
  slideId: string;
  updateArrow: (s: string, id: string, p: Partial<ArrowAnnotation>) => void;
  onRemove: () => void;
}) {
  const up = (p: Partial<ArrowAnnotation>) => updateArrow(slideId, arrow.id, p);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-white select-none custom-scrollbar">
      <Row label="Color">
        <ColorInput value={arrow.color} onChange={(v) => up({ color: v })} />
      </Row>
      <RangeInput
        label="Line Width"
        value={arrow.strokeWidth}
        min={1}
        max={10}
        step={0.5}
        onChange={(v) => up({ strokeWidth: v })}
      />
      <Row label="Curve">
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 w-full">
          <button
            type="button"
            onClick={() =>
              up({
                curveType: 'straight',
                controlPoint: undefined,
              })
            }
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded text-xs font-medium transition-all ${
              arrow.curveType === 'straight' ||
              (!arrow.curveType && !arrow.controlPoint)
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Straight"
            aria-label="Straight"
          >
            <svg
              className="w-3.5 h-3.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
            <span>Straight</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const p0 = arrow.points[0] ?? { x: 20, y: 50 };
              const p1 = arrow.points[1] ?? { x: 40, y: 50 };
              const midX = (p0.x + p1.x) / 2;
              const midY = (p0.y + p1.y) / 2;
              const dx = p1.x - p0.x;
              const dy = p1.y - p0.y;
              const len = Math.hypot(dx, dy) || 1;
              const normalX = -dy / len;
              const normalY = dx / len;
              const offset = 8;
              // 頂点 M を mid + normal * offset に配置するための制御点: P_ctrl = mid + normal * (offset * 2)
              up({
                curveType: 'curved',
                controlPoint: arrow.controlPoint ?? {
                  x: midX + normalX * (offset * 2),
                  y: midY + normalY * (offset * 2),
                },
              });
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded text-xs font-medium transition-all ${
              arrow.curveType === 'curved' ||
              arrow.curveType === 'arc' ||
              arrow.controlPoint !== undefined
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title="Curved"
            aria-label="Curved"
          >
            <svg
              className="w-3.5 h-3.5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 17 C 8 17, 14 7, 20 7" />
            </svg>
            <span>Curved</span>
          </button>
        </div>
      </Row>
      <Row label="Type">
        <select
          value={arrow.arrowType}
          onChange={(e) =>
            up({ arrowType: e.target.value as ArrowAnnotation['arrowType'] })
          }
          className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
        >
          <option value="pass">Pass</option>
          <option value="move">Move</option>
          <option value="dribble">Dribble</option>
          <option value="defend">Defend</option>
          <option value="run">Run</option>
          <option value="generic">Generic</option>
        </select>
      </Row>
      <DeleteButton onClick={onRemove} label="Delete Arrow" />
    </div>
  );
}
