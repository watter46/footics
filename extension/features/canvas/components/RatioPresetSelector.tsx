'use client';

import { LayoutTemplate } from 'lucide-react';
import type React from 'react';
import { useCallback, useContext, useSyncExternalStore } from 'react';
import { TacticalStoresContext } from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  ASPECT_RATIOS,
  type AspectRatio,
  type BoundaryBox,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_FULL,
} from '@/lib/types/tactical-unified';

const noopSubscribe = () => () => {};

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
  const tacticalStores = useContext(TacticalStoresContext);

  const subscribeBoundaryBox = useCallback(
    (onStoreChange: () => void) => {
      if (!tacticalStores) return noopSubscribe();
      const unsubs = [
        tacticalStores.documentStore.subscribe(onStoreChange),
        tacticalStores.sessionStore.subscribe(onStoreChange),
      ];
      return () => {
        for (const u of unsubs) u();
      };
    },
    [tacticalStores],
  );

  const getBoundaryBoxSnapshot = useCallback((): BoundaryBox | null => {
    if (!tacticalStores) return null;
    const doc = tacticalStores.documentStore.getState();
    const activePhaseId = tacticalStores.sessionStore.getState().activePhaseId;
    const phase =
      doc.project.phases.find((p) => p.id === activePhaseId) ??
      doc.project.phases[0];
    return phase?.boundaryBox ?? null;
  }, [tacticalStores]);

  const boundaryBox = useSyncExternalStore(
    subscribeBoundaryBox,
    getBoundaryBoxSnapshot,
    getBoundaryBoxSnapshot,
  );

  // 比率の現在値判定
  const activeRatio = (() => {
    if (currentRatio !== undefined) return currentRatio;
    if (!boundaryBox?.enabled || boundaryBox.height === 0) return null;
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
    const nextBox: BoundaryBox =
      ratio === 'full'
        ? {
            ...DEFAULT_BOUNDARY_BOX_FULL,
            enabled: true,
            visible: false,
          }
        : {
            ...createXBoundaryBox(ratio, '16:9'),
            enabled: true,
            visible: true,
          };

    if (tacticalStores) {
      const docState = tacticalStores.documentStore.getState();
      const activePhaseId =
        tacticalStores.sessionStore.getState().activePhaseId ||
        docState.project.phases[0]?.id;
      if (activePhaseId) {
        docState.dispatch({
          type: 'UPDATE_PHASE',
          phaseId: activePhaseId,
          patch: {
            boundaryBox: nextBox,
            ...(ratio !== 'full' ? { aspectRatio: ratio } : {}),
          },
        });
      }
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
    </div>
  );
}
