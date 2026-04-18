'use client';

import { useCallback } from 'react';

/**
 * ZonePicker — 20エリアのピッチ図 UI
 *
 * ゾーン配置 (横5レーン × 縦4ゾーン):
 *   Y\X   0-25  25-50  50-75  75-100
 *   0-20:   0      1      2      3     ← サイド (左)
 *  20-40:   4      5      6      7     ← ハーフスペース (左)
 *  40-60:   8      9     10     11     ← 中央
 *  60-80:  12     13     14     15     ← ハーフスペース (右)
 * 80-100:  16     17     18     19     ← サイド (右)
 */

interface ZonePickerProps {
  selectedZones: number[];
  onChange: (zones: number[]) => void;
}

const ROWS = 5; // Y方向 (横レーン)
const COLS = 4; // X方向 (縦ゾーン)

// ピッチのSVG描画サイズ
const PITCH_WIDTH = 240;
const PITCH_HEIGHT = 160;
const PADDING = 2;

const CELL_WIDTH = (PITCH_WIDTH - PADDING * 2) / COLS;
const CELL_HEIGHT = (PITCH_HEIGHT - PADDING * 2) / ROWS;

// ゾーンラベル
const ZONE_LABELS = [
  'DL',
  'DML',
  'AML',
  'AL',
  'DHL',
  'DMHL',
  'AMHL',
  'AHL',
  'DC',
  'DMC',
  'AMC',
  'AC',
  'DHR',
  'DMHR',
  'AMHR',
  'AHR',
  'DR',
  'DMR',
  'AMR',
  'AR',
];

export function ZonePicker({ selectedZones, onChange }: ZonePickerProps) {
  const toggleZone = useCallback(
    (zoneIndex: number) => {
      const next = selectedZones.includes(zoneIndex)
        ? selectedZones.filter((z) => z !== zoneIndex)
        : [...selectedZones, zoneIndex];
      onChange(next);
    },
    [selectedZones, onChange],
  );

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${PITCH_WIDTH} ${PITCH_HEIGHT}`}
        className="w-full rounded-md overflow-hidden"
        style={{ maxWidth: 280 }}
      >
        {/* ピッチ背景 */}
        <rect
          x={0}
          y={0}
          width={PITCH_WIDTH}
          height={PITCH_HEIGHT}
          fill="#1a472a"
          rx={4}
        />

        {/* ピッチライン: 外枠 */}
        <rect
          x={PADDING}
          y={PADDING}
          width={PITCH_WIDTH - PADDING * 2}
          height={PITCH_HEIGHT - PADDING * 2}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={0.8}
        />

        {/* センターライン */}
        <line
          x1={PITCH_WIDTH / 2}
          y1={PADDING}
          x2={PITCH_WIDTH / 2}
          y2={PITCH_HEIGHT - PADDING}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={0.6}
        />

        {/* センターサークル */}
        <circle
          cx={PITCH_WIDTH / 2}
          cy={PITCH_HEIGHT / 2}
          r={14}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={0.6}
        />

        {/* ゴールエリア (左) */}
        <rect
          x={PADDING}
          y={PITCH_HEIGHT / 2 - 24}
          width={18}
          height={48}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={0.6}
        />

        {/* ゴールエリア (右) */}
        <rect
          x={PITCH_WIDTH - PADDING - 18}
          y={PITCH_HEIGHT / 2 - 24}
          width={18}
          height={48}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={0.6}
        />

        {/* ゾーンセル */}
        {Array.from({ length: ROWS * COLS }).map((_, idx) => {
          const row = Math.floor(idx / COLS);
          const col = idx % COLS;
          const x = PADDING + col * CELL_WIDTH;
          const y = PADDING + row * CELL_HEIGHT;
          const isSelected = selectedZones.includes(idx);

          return (
            <g
              key={idx}
              style={{ cursor: 'pointer' }}
              onClick={() => toggleZone(idx)}
            >
              <rect
                x={x}
                y={y}
                width={CELL_WIDTH}
                height={CELL_HEIGHT}
                fill={isSelected ? 'rgba(192, 38, 211, 0.45)' : 'transparent'}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={0.5}
                rx={1}
                className="transition-all duration-150"
              />
              {isSelected && (
                <rect
                  x={x}
                  y={y}
                  width={CELL_WIDTH}
                  height={CELL_HEIGHT}
                  fill="none"
                  stroke="rgba(192, 38, 211, 0.8)"
                  strokeWidth={1.2}
                  rx={1}
                />
              )}
              <text
                x={x + CELL_WIDTH / 2}
                y={y + CELL_HEIGHT / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill={
                  isSelected
                    ? 'rgba(255,255,255,0.95)'
                    : 'rgba(255,255,255,0.35)'
                }
                fontSize={7}
                fontWeight={isSelected ? 600 : 400}
                className="pointer-events-none select-none"
                style={{ fontFamily: 'monospace' }}
              >
                {ZONE_LABELS[idx]}
              </text>
            </g>
          );
        })}
      </svg>

      {/* 選択数インジケーター */}
      {selectedZones.length > 0 && (
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-fuchsia-400">
            {selectedZones.length} zone{selectedZones.length !== 1 ? 's' : ''}{' '}
            selected
          </span>
          <button
            type="button"
            className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
