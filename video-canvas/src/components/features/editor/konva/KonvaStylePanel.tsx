import { Circle, Eye, Minus, Square } from 'lucide-react';
import type React from 'react';

export interface ShapeProperties {
  type:
    | 'arrow'
    | 'zone'
    | 'polygon_zone'
    | 'marker'
    | 'marker_arrow_solid'
    | 'marker_arrow_dash'
    | 'marker_man_mark'
    | 'marker_fov'
    | 'marker_connector';
  color: string;
  strokeWidth: number;
  dash: number[];
  opacity: number;
  // Arrow specific
  isCurved?: boolean;
  // Zone specific
  zoneShape?: 'rect' | 'ellipse';
  fillOpacity?: number;
  // Marker specific
  markerSize?: number;
  isSpotlight?: boolean;
  // FOV specific
  fovDirection?: number;
  fovAngle?: number;
  fovLength?: number;
}

interface KonvaStylePanelProps {
  properties: ShapeProperties | null;
  onChange: (newProps: Partial<ShapeProperties>) => void;
}

const COLOR_PALETTE = [
  '#ffffff', // White
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#eab308', // Yellow
  '#f97316', // Orange
  '#a855f7', // Purple
  '#000000', // Black
];

const STROKE_WIDTHS = [2, 4, 8];
const FILL_OPACITY_PRESETS = [
  { label: '0%', value: 0 },
  { label: '10%', value: 0.1 },
  { label: '30%', value: 0.3 },
  { label: '50%', value: 0.5 },
];

export const KonvaStylePanel: React.FC<KonvaStylePanelProps> = ({
  properties,
  onChange,
}) => {
  if (!properties) return null;

  const isZone =
    properties.type === 'zone' || properties.type === 'polygon_zone';
  const isArrow =
    properties.type === 'arrow' ||
    properties.type === 'marker_arrow_solid' ||
    properties.type === 'marker_arrow_dash';

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 pointer-events-auto">
      <div className="flex flex-col gap-3 p-3 bg-neutral-900/95 backdrop-blur-xl text-slate-200 rounded-xl shadow-2xl border border-white/10 w-56">
        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
          <span className="text-xs font-bold text-slate-300 tracking-wider">
            {isArrow
              ? 'ARROW STYLE'
              : properties.type === 'polygon_zone'
                ? 'POLYGON ZONE'
                : isZone
                  ? 'ZONE STYLE'
                  : 'STYLE'}
          </span>
        </div>

        {/* Color Palette */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Color
          </span>
          <div className="grid grid-cols-4 gap-1.5">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ color: c })}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  properties.color.toLowerCase() === c.toLowerCase()
                    ? 'ring-2 ring-white scale-110 shadow-lg'
                    : 'hover:scale-105 border border-white/20'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Zone Shape Type (Rect vs Ellipse) - Only for standard Zone */}
        {properties.type === 'zone' && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Zone Shape
            </span>
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => onChange({ zoneShape: 'rect' })}
                className={`flex-1 py-1 text-[10px] font-bold rounded-md flex items-center justify-center gap-1 transition-all ${
                  (properties.zoneShape || 'rect') === 'rect'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Square className="w-3 h-3" />
                SQUARE
              </button>
              <button
                type="button"
                onClick={() => onChange({ zoneShape: 'ellipse' })}
                className={`flex-1 py-1 text-[10px] font-bold rounded-md flex items-center justify-center gap-1 transition-all ${
                  properties.zoneShape === 'ellipse'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Circle className="w-3 h-3" />
                CIRCLE
              </button>
            </div>
          </div>
        )}

        {/* Arrow Bend (Straight vs Curved) - Only for Arrow */}
        {isArrow && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Arrow Type
            </span>
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => onChange({ isCurved: false })}
                className={`flex-1 py-1 text-[10px] font-bold rounded-md flex items-center justify-center transition-all ${
                  !properties.isCurved
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                STRAIGHT
              </button>
              <button
                type="button"
                onClick={() => onChange({ isCurved: true })}
                className={`flex-1 py-1 text-[10px] font-bold rounded-md flex items-center justify-center transition-all ${
                  properties.isCurved
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                CURVED
              </button>
            </div>
          </div>
        )}

        {/* Line Pattern (Solid vs Dashed) */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Border / Line Style
          </span>
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => onChange({ dash: [] })}
              className={`flex-1 py-1 text-[10px] font-bold rounded-md flex items-center justify-center gap-1 transition-all ${
                properties.dash.length === 0
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Minus className="w-3 h-3" />
              SOLID
            </button>
            <button
              type="button"
              onClick={() => onChange({ dash: [10, 10] })}
              className={`flex-1 py-1 text-[10px] font-bold rounded-md flex items-center justify-center gap-1 transition-all ${
                properties.dash.length > 0
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Circle className="w-2 h-2" />
              DASHED
            </button>
          </div>
        </div>

        {/* Stroke Width */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Line Width
          </span>
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg">
            {STROKE_WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => onChange({ strokeWidth: w })}
                className={`flex-1 py-1 text-xs font-bold rounded-md flex items-center justify-center transition-all ${
                  properties.strokeWidth === w
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {w}px
              </button>
            ))}
          </div>
        </div>

        {/* Fill Opacity - Only for Zone and Polygon Zone */}
        {isZone && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              Fill Opacity
            </span>
            <div className="grid grid-cols-4 gap-1 bg-black/40 p-1 rounded-lg">
              {FILL_OPACITY_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChange({ fillOpacity: preset.value })}
                  className={`py-1 text-[10px] font-bold rounded-md transition-all ${
                    (properties.fillOpacity ?? 0) === preset.value
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* General Opacity */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Opacity
            </span>
            <span className="text-[10px] font-mono text-slate-300">
              {Math.round(properties.opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={properties.opacity}
            onChange={(e) => onChange({ opacity: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
};
