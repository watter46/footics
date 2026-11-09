'use client';

import { SegmentedControl } from '@/components/ui/segmented-control';
import type {
  ArrowAnnotation,
  ArrowEffectConfig,
  ArrowEffectType,
  EffectEasing,
  EffectExitAction,
} from '@/lib/types/tactical/annotations';
import { NumberSliderField } from './effect-number-slider';

export const DEFAULT_ARROW_EFFECT: ArrowEffectConfig = {
  type: 'grow',
  delay: 0.5,
  duration: 0.8,
  holdDuration: 0.5,
  exitAction: 'keep',
  fadeDuration: 0.3,
  easing: 'ease-out',
};

export interface ArrowEffectSectionProps {
  arrow: ArrowAnnotation;
  onUpdate: (patch: Partial<ArrowAnnotation>) => void;
}

export function ArrowEffectSection({
  arrow,
  onUpdate,
}: ArrowEffectSectionProps) {
  const currentEffect = arrow.effect ?? {
    ...DEFAULT_ARROW_EFFECT,
    type: 'none',
  };
  const isDashed = Boolean(arrow.dashArray && arrow.dashArray.length > 0);
  const isEffectActive =
    currentEffect.type === 'grow' || currentEffect.type === 'grow-and-flow';

  const handleEffectTypeChange = (type: ArrowEffectType) => {
    onUpdate({
      effect: {
        ...currentEffect,
        type,
      },
    });
  };

  const handleConfigChange = (patch: Partial<ArrowEffectConfig>) => {
    onUpdate({
      effect: {
        ...currentEffect,
        ...patch,
      },
    });
  };

  const effectOptions = isDashed
    ? [
        { id: 'none' as const, label: 'なし' },
        { id: 'grow' as const, label: '伸長 (Grow)' },
        { id: 'flow' as const, label: '点線Flow' },
        { id: 'grow-and-flow' as const, label: '伸長+Flow' },
      ]
    : [
        { id: 'none' as const, label: 'なし' },
        { id: 'grow' as const, label: '伸長 (Grow)' },
      ];

  return (
    <div className="flex flex-col gap-3">
      {/* エフェクト種別 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-white/60 font-medium">
          エフェクト種別
        </span>
        <SegmentedControl<ArrowEffectType>
          value={currentEffect.type}
          onChange={handleEffectTypeChange}
          options={effectOptions}
          className="w-full [&>button]:flex-1"
        />
      </div>

      {!isDashed && (
        <div className="flex items-center justify-between p-2 rounded bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/60">
          <span>※ 点線矢印で Flow / 伸長+Flow が利用可能</span>
          <button
            type="button"
            onClick={() => onUpdate({ dashArray: [8, 6] })}
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/90 text-[11px] font-medium transition-colors cursor-pointer"
          >
            点線にする
          </button>
        </div>
      )}

      {isEffectActive && (
        <>
          {/* 開始遅延 */}
          <NumberSliderField
            id="arrow-effect-delay"
            label="開始遅延 (Delay)"
            value={currentEffect.delay}
            min={0.0}
            max={5.0}
            step={0.1}
            onChange={(delay) => handleConfigChange({ delay })}
          />

          {/* 伸長時間 */}
          <NumberSliderField
            id="arrow-effect-duration"
            label="伸長時間 (Duration)"
            value={currentEffect.duration}
            min={0.1}
            max={3.0}
            step={0.1}
            onChange={(duration) => handleConfigChange({ duration })}
          />

          {/* 維持時間 */}
          <NumberSliderField
            id="arrow-effect-hold"
            label="維持時間 (Hold)"
            value={currentEffect.holdDuration}
            min={0.0}
            max={5.0}
            step={0.1}
            onChange={(holdDuration) => handleConfigChange({ holdDuration })}
          />

          {/* 退場動作 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-white/60 font-medium">
              退場動作
            </span>
            <SegmentedControl<EffectExitAction>
              value={currentEffect.exitAction}
              onChange={(exitAction) => handleConfigChange({ exitAction })}
              options={[
                { id: 'keep', label: '残す (Keep)' },
                { id: 'auto-hide', label: '消去 (Auto-hide)' },
              ]}
              className="w-full [&>button]:flex-1"
            />
          </div>

          {/* イージング */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-white/60 font-medium">
              イージング
            </span>
            <SegmentedControl<EffectEasing>
              value={currentEffect.easing}
              onChange={(easing) => handleConfigChange({ easing })}
              options={[
                { id: 'ease-out', label: 'Ease-out' },
                { id: 'linear', label: 'Linear' },
                { id: 'ease-in-out', label: 'Ease-in-out' },
              ]}
              className="w-full [&>button]:flex-1"
            />
          </div>
        </>
      )}
    </div>
  );
}
