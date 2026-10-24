'use client';

import { Expand, LayoutTemplate } from 'lucide-react';
import type React from 'react';
import { useContext, useRef } from 'react';
import { useStore } from 'zustand';
import {
  CanvasStoreContext,
  createCanvasStore,
} from '@/features/tactical-unified/core';
import type { CanvasStoreApi } from '@/features/tactical-unified/core/types';
import {
  ASPECT_RATIOS,
  type AspectRatio,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_FULL,
} from '@/lib/types/tactical-unified';

export interface RatioPresetSelectorProps {
  currentRatio?: AspectRatio | 'full' | null;
  onSelectRatio?: (ratio: AspectRatio | 'full') => void;
  className?: string;
}

export const RATIO_PRESETS: {
  ratio: AspectRatio;
  label: string;
  title: string;
}[] = [
  {
    ratio: '16:9',
    label: '16:9',
    title: '横長 (16:9) - YouTube / PC 標準',
  },
  {
    ratio: '9:16',
    label: '9:16',
    title: '縦長 (9:16) - スマホ全画面・Shorts / Reels',
  },
  {
    ratio: '4:5',
    label: '4:5',
    title: '縦長 (4:5) - X単体画像・タイムライン最大高さ',
  },
  {
    ratio: '1:1',
    label: '1:1',
    title: '正方形 (1:1) - スクエア・Instagram',
  },
];

export function RatioPresetSelector({
  currentRatio,
  onSelectRatio,
  className = '',
}: RatioPresetSelectorProps): React.ReactElement {
  const store = useContext(CanvasStoreContext);
  const fallbackStoreRef = useRef<CanvasStoreApi | null>(null);
  if (!fallbackStoreRef.current) {
    fallbackStoreRef.current = createCanvasStore({ mode: 'screenshot-edit' });
  }
  const activeStore = store ?? fallbackStoreRef.current;
  const boundaryBox = useStore(activeStore, (s) => s.boundaryBox);

  // 比率の現在値判定
  const activeRatio = (() => {
    if (currentRatio !== undefined) return currentRatio;
    if (!boundaryBox?.enabled || boundaryBox.height === 0) return null;
    if (
      boundaryBox.width >= 99 &&
      boundaryBox.height >= 99 &&
      boundaryBox.x <= 1 &&
      boundaryBox.y <= 1
    ) {
      return 'full';
    }
    const stageAspect = 16 / 9;
    const currentAspect =
      (boundaryBox.width / boundaryBox.height) * stageAspect;

    for (const p of RATIO_PRESETS) {
      const target = ASPECT_RATIOS[p.ratio] ?? 1;
      if (Math.abs(currentAspect - target) < 0.05) {
        return p.ratio;
      }
    }
    return null;
  })();

  const handleSelect = (ratio: AspectRatio | 'full') => {
    if (onSelectRatio) {
      onSelectRatio(ratio);
      return;
    }
    if (!store) return;
    const setBoundaryBox = store.getState().setBoundaryBox;
    if (ratio === 'full') {
      setBoundaryBox({
        ...DEFAULT_BOUNDARY_BOX_FULL,
        enabled: true,
        visible: false,
      });
    } else {
      const newBox = createXBoundaryBox(ratio, '16:9');
      setBoundaryBox({
        ...newBox,
        enabled: true,
        visible: true,
      });
    }
  };

  return (
    <div
      className={`flex items-center bg-white/5 rounded-md border border-white/10 p-0.5 text-xs font-mono ${className}`}
      role="group"
      aria-label="境界線・アスペクト比選択"
    >
      <LayoutTemplate size={12} className="text-blue-400 mx-1 shrink-0" />
      {RATIO_PRESETS.map(({ ratio, label, title }) => {
        const isActive = activeRatio === ratio;
        return (
          <button
            key={ratio}
            type="button"
            onClick={() => handleSelect(ratio)}
            className={`px-2 py-0.5 rounded transition-colors text-[11px] font-medium cursor-pointer ${
              isActive
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title={title}
            aria-label={`境界線比率 ${label}`}
            aria-pressed={isActive}
          >
            {label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => handleSelect('full')}
        className={`px-2 py-0.5 rounded transition-colors text-[11px] font-medium cursor-pointer flex items-center gap-1 ${
          activeRatio === 'full'
            ? 'bg-blue-600 text-white font-semibold shadow-xs'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title="全画面 (100% × 100%) - クロップなし"
        aria-label="全画面クロップなし"
        aria-pressed={activeRatio === 'full'}
      >
        <Expand size={11} />
        <span>全画面</span>
      </button>
    </div>
  );
}
