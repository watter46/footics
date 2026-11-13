'use client';

import { Crop } from 'lucide-react';
import { useMemo, useState } from 'react';
import { selectDomainActivePhase } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  type BoundaryBox,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_FULL,
} from '@/lib/types/tactical/slide';

interface BoundaryPreset {
  id: string;
  label: string;
  badge?: string;
  desc: string;
}

const PRESET_DEFINITIONS: BoundaryPreset[] = [
  { id: 'ratio_16_9', label: '16:9', badge: '横長', desc: '標準横画像' },
  { id: 'ratio_9_16', label: '9:16', badge: '縦長', desc: 'スマホ全画面' },
  { id: 'ratio_4_5', label: '4:5', badge: '縦長', desc: 'TL最大高さ' },
  { id: 'ratio_1_1', label: '1:1', badge: '正方形', desc: 'スクエア' },
];

export function ScreenBoundarySection() {
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);

  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activePhase = useDocumentStore((s) =>
    selectDomainActivePhase(s.project, activePhaseId),
  );
  const dispatch = useDocumentStore((s) => s.dispatch);

  const boundaryBox = activePhase?.boundaryBox;
  const isBoundaryVisible = boundaryBox?.visible ?? false;

  const updatePhaseBoundaryBox = (nextBox: BoundaryBox) => {
    if (!activePhaseId) return;
    dispatch({
      type: 'UPDATE_PHASE',
      phaseId: activePhaseId,
      patch: { boundaryBox: nextBox },
    });
  };

  const handleToggleBoundary = () => {
    updatePhaseBoundaryBox({
      x: boundaryBox?.x ?? 0,
      y: boundaryBox?.y ?? 0,
      width: boundaryBox?.width ?? 100,
      height: boundaryBox?.height ?? 100,
      fitTarget: boundaryBox?.fitTarget ?? 'canvas',
      enabled: true,
      visible: !isBoundaryVisible,
    });
  };

  const getPresetBox = (presetId: string): BoundaryBox => {
    switch (presetId) {
      case 'ratio_16_9':
        return {
          enabled: true,
          visible: true,
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          fitTarget: 'canvas',
        };
      case 'ratio_9_16':
        return {
          ...createXBoundaryBox('9:16'),
          enabled: true,
          visible: true,
        };
      case 'ratio_4_5':
        return {
          ...createXBoundaryBox('4:5'),
          enabled: true,
          visible: true,
        };
      case 'ratio_1_1':
        return {
          ...createXBoundaryBox('1:1'),
          enabled: true,
          visible: true,
        };
      default:
        return {
          ...DEFAULT_BOUNDARY_BOX_FULL,
          enabled: true,
          visible: true,
        };
    }
  };

  const activePresetId = useMemo(() => {
    if (!boundaryBox) return null;
    const stageAspect = 16 / 9;
    const currentRatio = (boundaryBox.width / boundaryBox.height) * stageAspect;

    if (Math.abs(currentRatio - 4 / 5) < 0.05) return 'ratio_4_5';
    if (Math.abs(currentRatio - 9 / 16) < 0.05) return 'ratio_9_16';
    if (Math.abs(currentRatio - 1 / 1) < 0.05) return 'ratio_1_1';
    if (Math.abs(currentRatio - 16 / 9) < 0.05) return 'ratio_16_9';
    return null;
  }, [boundaryBox]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const box = getPresetBox(presetId);
    updatePhaseBoundaryBox(box);
  };

  return (
    <div className="pt-3 border-t border-white/[0.08]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Crop size={14} className="text-[#60A5FA]" />
          <span className="font-semibold text-white/90">Boundary Box</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isBoundaryVisible}
          aria-label="境界線有効切替"
          onClick={handleToggleBoundary}
          className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
            isBoundaryVisible
              ? 'bg-[#FF8100] text-black font-semibold shadow-[0_0_8px_rgba(255,129,0,0.4)]'
              : 'bg-white/10 text-white/50 hover:bg-white/15 hover:text-white'
          }`}
        >
          {isBoundaryVisible ? 'ON' : 'OFF'}
        </button>
      </div>
      <p className="text-[11px] text-white/50 mb-3">
        スライドの出力・切り抜き境界線プリセットを選択します
      </p>

      <div className="grid grid-cols-2 gap-2">
        {PRESET_DEFINITIONS.map((preset) => {
          const currentId = selectedPresetId ?? activePresetId;
          const isSelected = isBoundaryVisible && currentId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset.id)}
              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#FF8100]/15 border-[#FF8100] text-[#FFA336] shadow-[0_0_12px_rgba(255,129,0,0.25)]'
                  : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06] text-white/90'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-semibold text-xs truncate">
                  {preset.label}
                </span>
                {preset.badge && (
                  <span
                    className={`text-[9px] font-medium px-1 py-0.5 rounded ${
                      isSelected
                        ? 'bg-[#FF8100]/25 text-[#FFA336]'
                        : 'bg-white/10 text-white/50'
                    }`}
                  >
                    {preset.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-white/40 truncate">
                {preset.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
