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
  const isEffectActive = currentEffect.type === 'grow';

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
          options={[
            { id: 'none', label: 'なし' },
            { id: 'grow', label: '伸長 (Grow)' },
          ]}
          className="w-full [&>button]:flex-1"
        />
      </div>

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
