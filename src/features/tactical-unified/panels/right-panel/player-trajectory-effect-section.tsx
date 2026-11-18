'use client';

import { SegmentedControl } from '@/components/ui/segmented-control';
import type {
  EffectExitAction,
  PlayerTrajectoryEffectConfig,
} from '@/lib/types/tactical/effect-config';
import { ColorInput } from './color-input';

export const DEFAULT_PLAYER_TRAJECTORY_EFFECT: PlayerTrajectoryEffectConfig = {
  enabled: false,
  lineStyle: 'solid',
  exitAction: 'keep',
};

export interface PlayerTrajectoryEffectSectionProps {
  player: {
    readonly trajectoryEffect?: PlayerTrajectoryEffectConfig;
    readonly defaultColor?: string;
  };
  onUpdate: (patch: {
    trajectoryEffect?: PlayerTrajectoryEffectConfig;
  }) => void;
}

export function PlayerTrajectoryEffectSection({
  player,
  onUpdate,
}: PlayerTrajectoryEffectSectionProps) {
  const currentConfig: PlayerTrajectoryEffectConfig =
    player.trajectoryEffect ?? {
      ...DEFAULT_PLAYER_TRAJECTORY_EFFECT,
    };

  const handleToggle = (val: 'off' | 'on') => {
    onUpdate({
      trajectoryEffect: {
        ...currentConfig,
        enabled: val === 'on',
      },
    });
  };

  const handleConfigChange = (patch: Partial<PlayerTrajectoryEffectConfig>) => {
    onUpdate({
      trajectoryEffect: {
        ...currentConfig,
        ...patch,
      },
    });
  };

  return (
    <div
      data-testid="player-trajectory-effect-section"
      className="flex flex-col gap-3"
    >
      {/* 軌跡エフェクトON/OFF */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-white/60 font-medium">
          移動軌跡 (Trajectory)
        </span>
        <SegmentedControl<'off' | 'on'>
          value={currentConfig.enabled ? 'on' : 'off'}
          onChange={handleToggle}
          options={[
            { id: 'off', label: 'OFF' },
            { id: 'on', label: 'ON' },
          ]}
          className="w-full [&>button]:flex-1"
        />
      </div>

      {currentConfig.enabled && (
        <>
          {/* 線種 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-white/60 font-medium">
              線種 (Line Style)
            </span>
            <SegmentedControl<'solid' | 'dashed'>
              value={currentConfig.lineStyle}
              onChange={(lineStyle) => handleConfigChange({ lineStyle })}
              options={[
                { id: 'solid', label: '実線 (Solid)' },
                { id: 'dashed', label: '点線 (Dashed)' },
              ]}
              className="w-full [&>button]:flex-1"
            />
          </div>

          {/* 軌跡カラー */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-white/60 font-medium">
              軌跡カラー (Color)
            </span>
            <ColorInput
              value={currentConfig.color ?? player.defaultColor ?? '#ffffff'}
              onChange={(color) => handleConfigChange({ color })}
              className="w-full"
            />
          </div>

          {/* 到達後動作 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-white/60 font-medium">
              到達後動作 (Exit)
            </span>
            <SegmentedControl<EffectExitAction>
              value={currentConfig.exitAction}
              onChange={(exitAction) => handleConfigChange({ exitAction })}
              options={[
                { id: 'keep', label: '残す (Keep)' },
                { id: 'auto-hide', label: '消去 (Auto-hide)' },
              ]}
              className="w-full [&>button]:flex-1"
            />
          </div>
        </>
      )}
    </div>
  );
}
