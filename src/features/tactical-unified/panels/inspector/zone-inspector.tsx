'use client';

import { Circle, Square } from 'lucide-react';
import type { ZoneAnnotation } from '@/lib/types/tactical-unified';
import { ColorInput } from '../../components/common-color-input';
import { DeleteButton, RangeInput, Row } from './inspector-shared-controls';

export function ZoneInspector({
  zone,
  slideId,
  updateZone,
  onRemove,
}: {
  zone: ZoneAnnotation;
  slideId: string;
  updateZone: (s: string, id: string, p: Partial<ZoneAnnotation>) => void;
  onRemove: () => void;
}) {
  const up = (p: Partial<ZoneAnnotation>) => updateZone(slideId, zone.id, p);
  const isPolygon = zone.shapeType === 'polygon';

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-white select-none custom-scrollbar">
      {/* Shape toggle (Rectangle / Ellipse) */}
      {!isPolygon && (
        <Row label="Shape">
          <div className="grid grid-cols-2 gap-1.5 bg-white/5 p-1 rounded-lg border border-white/10">
            <button
              type="button"
              onClick={() => up({ shapeType: 'rect' })}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-medium transition-all ${
                zone.shapeType === 'rect' || !zone.shapeType
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Square size={13} />
              <span>Rectangle</span>
            </button>
            <button
              type="button"
              onClick={() => up({ shapeType: 'ellipse' })}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded text-xs font-medium transition-all ${
                zone.shapeType === 'ellipse'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Circle size={13} />
              <span>Ellipse</span>
            </button>
          </div>
        </Row>
      )}

      {isPolygon && (
        <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
          <span className="font-medium">Free Zone (Polygon)</span>
          <span className="text-[10px] text-emerald-400/70 font-mono">
            {zone.points.length} Vertices
          </span>
        </div>
      )}

      <Row label="Fill Color">
        <ColorInput value={zone.color} onChange={(v) => up({ color: v })} />
      </Row>

      <RangeInput
        label="Opacity"
        value={zone.opacity ?? 0.25}
        min={0.05}
        max={1}
        step={0.05}
        onChange={(v) => up({ opacity: v })}
      />

      <RangeInput
        label="Border Width"
        value={zone.strokeWidth ?? 2}
        min={0}
        max={8}
        step={0.5}
        onChange={(v) => up({ strokeWidth: v })}
      />

      <Row label="Border Color">
        <ColorInput
          value={zone.strokeColor ?? zone.color}
          onChange={(v) => up({ strokeColor: v })}
        />
      </Row>

      <Row label="Type">
        <select
          value={zone.zoneType}
          onChange={(e) =>
            up({ zoneType: e.target.value as ZoneAnnotation['zoneType'] })
          }
          className="w-full px-2 py-1 rounded bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
        >
          <option value="highlight">Highlight</option>
          <option value="space">Space</option>
          <option value="danger">Danger</option>
          <option value="pressing">Pressing</option>
          <option value="buildup">Buildup</option>
          <option value="generic">Generic</option>
        </select>
      </Row>

      <DeleteButton onClick={onRemove} label="Delete Zone" />
    </div>
  );
}
