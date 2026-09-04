'use client';

import type React from 'react';
import { Group, Path } from 'react-konva';
import {
  SPOTLIGHT_BEAM_BOTTOM_CENTER_X,
  SPOTLIGHT_BEAM_BOTTOM_MAX_Y,
  SPOTLIGHT_BEAM_BOTTOM_WIDTH,
  SPOTLIGHT_BEAM_PATH,
} from '@/lib/tactical/marker-assets';
import type { Player } from '@/lib/types/tactical-unified';

export interface PlayerFocusSpotlightProps {
  focus: NonNullable<Player['focus']>;
  radius: number;
  spotlightGroupRef?: React.Ref<any>;
  isSelected?: boolean;
  onSelectOption?: () => void;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const r = Number.parseInt(clean.substring(0, 2), 16) || 255;
  const g = Number.parseInt(clean.substring(2, 4), 16) || 255;
  const b = Number.parseInt(clean.substring(4, 6), 16) || 255;
  return { r, g, b };
}

export function PlayerFocusSpotlight({
  focus,
  radius,
  spotlightGroupRef,
  isSelected,
  onSelectOption,
}: PlayerFocusSpotlightProps) {
  if (!focus.enabled) return null;

  const focusColor = focus.color ?? '#ffffff';
  const focusOpacity = focus.opacity ?? 0.35;
  const focusRadiusMultiplier = (focus.radius ?? 3) / 3;

  // リングマーカー（横長楕円 rx: radius * 1.15）の外周幅 (2 * rx = 2.3 * radius) に底面幅を精緻に一致させる
  const ringWidth = radius * 2.3 * focusRadiusMultiplier;
  const spotlightScale = ringWidth / SPOTLIGHT_BEAM_BOTTOM_WIDTH;

  // 底面円弧の中心Xを (0, 0) にセンタリング
  const tx = -SPOTLIGHT_BEAM_BOTTOM_CENTER_X * spotlightScale;

  // 底面円弧の最下部をリングマーカーの足元最下部 (radius * 0.55) に正確にフィットさせる
  const ringBottomY = radius * 0.55 * focusRadiusMultiplier;
  const ty = ringBottomY - SPOTLIGHT_BEAM_BOTTOM_MAX_Y * spotlightScale;

  // スクショ上の選手本体を隠さずクリアに見せるため、縦方向の階調グラデーションを構成:
  // 上部(光源): しっかり発光感
  // 中央(選手胴体): 高い透過率（薄く透かす）で選手がはっきり視認可能
  // 下部(足元付近): 再び光を集めてステージライトの接地感を演出
  const { r, g, b } = hexToRgb(focusColor);
  const colorStops = [
    0,
    `rgba(${r}, ${g}, ${b}, ${focusOpacity * 0.95})`,
    0.25,
    `rgba(${r}, ${g}, ${b}, ${focusOpacity * 0.5})`,
    0.6,
    `rgba(${r}, ${g}, ${b}, ${focusOpacity * 0.22})`,
    0.9,
    `rgba(${r}, ${g}, ${b}, ${focusOpacity * 0.65})`,
    1,
    `rgba(${r}, ${g}, ${b}, ${focusOpacity * 0.95})`,
  ];

  return (
    <Group
      ref={spotlightGroupRef}
      listening={true}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelectOption?.();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelectOption?.();
      }}
    >
      <Group x={tx} y={ty} scale={{ x: spotlightScale, y: spotlightScale }}>
        {/* 光の柱（中央が透けるソフトグラデーションビーム） */}
        <Path
          data={SPOTLIGHT_BEAM_PATH}
          fillPriority="linear-gradient"
          fillLinearGradientStartPoint={{ x: 31.36, y: 5 }}
          fillLinearGradientEndPoint={{ x: 31.36, y: 100 }}
          fillLinearGradientColorStops={colorStops}
          perfectDrawEnabled={false}
          stroke={isSelected ? '#38bdf8' : undefined}
          strokeWidth={isSelected ? 1 / spotlightScale : 0}
        />
      </Group>
    </Group>
  );
}
