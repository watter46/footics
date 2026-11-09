'use client';

import { SegmentedControl } from '@/components/ui/segmented-control';
import type {
  MarkerEffectConfig,
  MarkerEffectType,
  Player,
} from '@/lib/types/tactical/player';
import { NumberSliderField } from './effect-number-slider';

export const DEFAULT_MARKER_EFFECT: MarkerEffectConfig = {
  type: 'ripple',
  delay: 0.0,
  duration: 1.0,
  ringsCount: 3,
  repeatCount: 2,
  maxRadiusScale: 2.5,
  exitAction: 'keep',
};

export interface MarkerEffectSectionProps {
  player: Player;
  onUpdate: (patch: Partial<Player>) => void;
}

export function MarkerEffectSection({
  player,
  onUpdate,
}: MarkerEffectSectionProps) {
  const currentEffect = player.style?.markerEffect ?? {
    ...DEFAULT_MARKER_EFFECT,
    type: 'none',
  };
  const isEffectActive = currentEffect.type === 'ripple';

  const handleEffectTypeChange = (type: MarkerEffectType) => {
    onUpdate({
      style: {
        ...player.style,
        markerEffect: {
          ...currentEffect,
          type,
        },
      },
    });
  };

  const handleConfigChange = (patch: Partial<MarkerEffectConfig>) => {
    onUpdate({
      style: {
        ...player.style,
        markerEffect: {
          ...currentEffect,
          ...patch,
        },
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* エフェクト種別 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-white/60 font-medium">
          エフェクト種別
        </span>
        <SegmentedControl<MarkerEffectType>
          value={currentEffect.type}
          onChange={handleEffectTypeChange}
          options={[
            { id: 'none', label: 'なし' },
            { id: 'ripple', label: '波紋 (Ripple)' },
          ]}
          className="w-full [&>button]:flex-1"
        />
      </div>

      {isEffectActive && (
        <>
          {/* 開始遅延 */}
          <NumberSliderField
            id="player-effect-delay"
            label="開始遅延 (Delay)"
            value={currentEffect.delay}
            min={0.0}
            max={5.0}
            step={0.1}
            onChange={(delay) => handleConfigChange({ delay })}
          />

          {/* 周期時間 */}
          <NumberSliderField
            id="player-effect-duration"
            label="周期時間 (Duration)"
            value={currentEffect.duration}
            min={0.1}
            max={3.0}
            step={0.1}
            onChange={(duration) => handleConfigChange({ duration })}
          />

          {/* 同心円数 (2〜4) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-white/60 font-medium">
              リング重なり数
            </span>
            <SegmentedControl<string>
              value={String(currentEffect.ringsCount)}
              onChange={(val) =>
                handleConfigChange({
                  ringsCount: Number.parseInt(val, 10),
                })
              }
              options={[
                { id: '2', label: '2本' },
                { id: '3', label: '3本' },
                { id: '4', label: '4本' },
              ]}
              className="w-full [&>button]:flex-1"
            />
          </div>

          {/* 繰り返し回数 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-white/60 font-medium">
              リピート回数
            </span>
            <SegmentedControl<string>
              value={String(currentEffect.repeatCount)}
              onChange={(val) =>
                handleConfigChange({
                  repeatCount: Number.parseInt(val, 10),
                })
              }
              options={[
                { id: '1', label: '1回' },
                { id: '2', label: '2回' },
                { id: '0', label: '無限' },
              ]}
              className="w-full [&>button]:flex-1"
            />
          </div>
        </>
      )}
    </div>
  );
}
