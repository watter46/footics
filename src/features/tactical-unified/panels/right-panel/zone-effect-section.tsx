'use client';

import { SegmentedControl } from '@/components/ui/segmented-control';
import type { ZoneEffectConfig } from '@/lib/types/tactical/annotations';
import type { DomainZoneAnnotation } from '@/lib/types/tactical/domain-entities';
import { NumberSliderField } from './effect-number-slider';

export const DEFAULT_ZONE_EFFECT: ZoneEffectConfig = {
  type: 'pulse',
  duration: 1.2,
  minOpacity: 0.15,
  maxOpacity: 0.45,
};

export interface ZoneEffectSectionProps {
  zone: Pick<DomainZoneAnnotation, 'effect'>;
  onUpdate: (patch: { effect?: ZoneEffectConfig }) => void;
}

export function ZoneEffectSection({ zone, onUpdate }: ZoneEffectSectionProps) {
  const currentEffect = zone.effect ?? {
    ...DEFAULT_ZONE_EFFECT,
    type: 'none',
  };
  const isEffectActive = currentEffect.type === 'pulse';

  const handleEffectTypeChange = (type: 'none' | 'pulse') => {
    onUpdate({
      effect: {
        ...currentEffect,
        type,
      },
    });
  };

  const handleConfigChange = (patch: Partial<ZoneEffectConfig>) => {
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
        <SegmentedControl<'none' | 'pulse'>
          value={currentEffect.type}
          onChange={handleEffectTypeChange}
          options={[
            { id: 'none', label: 'なし' },
            { id: 'pulse', label: 'パルス (明滅)' },
          ]}
          className="w-full [&>button]:flex-1"
        />
      </div>

      {isEffectActive && (
        <>
          {/* 周期時間 */}
          <NumberSliderField
            id="zone-effect-duration"
            label="周期時間 (Duration)"
            value={currentEffect.duration}
            min={0.2}
            max={3.0}
            step={0.1}
            onChange={(duration) => handleConfigChange({ duration })}
          />

          {/* 最小不透明度 */}
          <NumberSliderField
            id="zone-effect-min-opacity"
            label="最小不透明度 (Min)"
            value={currentEffect.minOpacity}
            min={0.0}
            max={1.0}
            step={0.05}
            onChange={(minOpacity) => handleConfigChange({ minOpacity })}
          />

          {/* 最大不透明度 */}
          <NumberSliderField
            id="zone-effect-max-opacity"
            label="最大不透明度 (Max)"
            value={currentEffect.maxOpacity}
            min={0.0}
            max={1.0}
            step={0.05}
            onChange={(maxOpacity) => handleConfigChange({ maxOpacity })}
          />
        </>
      )}
    </div>
  );
}
