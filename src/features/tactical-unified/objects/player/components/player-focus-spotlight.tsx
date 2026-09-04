'use client';

import type React from 'react';
import { Circle, Group, Path } from 'react-konva';
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
  isRing?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  isRing,
  spotlightGroupRef,
  isSelected,
  onSelectOption,
}: PlayerFocusSpotlightProps) {
  if (!focus.enabled) return null;

  const focusColor = focus.color ?? '#ffffff';
  const focusOpacity = focus.opacity ?? 0.35;

  // 3D リング用の光の柱
  if (isRing) {
    const focusRadiusMultiplier = (focus.radius ?? 3) / 3;
    const ringWidth = radius * 2.3 * focusRadiusMultiplier;
    const spotlightScale = ringWidth / SPOTLIGHT_BEAM_BOTTOM_WIDTH;
    const tx = -SPOTLIGHT_BEAM_BOTTOM_CENTER_X * spotlightScale;
    const ringBottomY = radius * 0.55 * focusRadiusMultiplier;
    const ty = ringBottomY - SPOTLIGHT_BEAM_BOTTOM_MAX_Y * spotlightScale;

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
          <Path
            data={SPOTLIGHT_BEAM_PATH}
            fillPriority="linear-gradient"
            fillLinearGradientStartPoint={{ x: 31.36, y: 5 }}
            fillLinearGradientEndPoint={{ x: 31.36, y: 100 }}
            fillLinearGradientColorStops={colorStops}
            perfectDrawEnabled={false}
            stroke={isSelected ? '#38bdf8' : undefined}
            strokeWidth={isSelected ? 1.5 / spotlightScale : 0}
          />
        </Group>
      </Group>
    );
  }

  // 2D マーカー用のネオングロー
  const glowThickness = Math.max(4, Math.min(12, (focus.radius ?? 3) * 1.7));
  const centerRadius = radius + glowThickness * 0.45;
  const outerRadius = radius + glowThickness;

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
      {/* 1. マーカー直下の淡いネオンライトプール */}
      <Circle
        radius={outerRadius}
        fill={focusColor}
        opacity={Math.min(0.5, focusOpacity * 0.4)}
        listening={false}
      />

      {/* 2. 広域ブルーム発光層 (柔らかなネオンの拡散光) */}
      <Circle
        radius={centerRadius}
        stroke={focusColor}
        strokeWidth={glowThickness}
        shadowColor={focusColor}
        shadowBlur={13}
        shadowOpacity={1}
        opacity={Math.min(0.9, focusOpacity * 1.4)}
        listening={false}
      />

      {/* 3. 強烈なコアネオングロー層 (芯のある鮮烈な光、線感のないグラデーション調) */}
      <Circle
        radius={centerRadius}
        stroke={focusColor}
        strokeWidth={glowThickness * 0.7}
        shadowColor={focusColor}
        shadowBlur={6}
        shadowOpacity={1}
        opacity={Math.min(1, focusOpacity * 1.7)}
        listening={false}
      />

      {/* 4. マーカー境界直近のソフトブライト層 (境界を馴染ませる光) */}
      <Circle
        radius={radius + glowThickness * 0.25}
        stroke={focusColor}
        strokeWidth={glowThickness * 0.5}
        shadowColor={focusColor}
        shadowBlur={4}
        shadowOpacity={1}
        opacity={Math.min(0.95, focusOpacity * 1.5)}
        listening={false}
      />

      {/* 5. 選択状態ハイライト (キャンバス上での選択インジケーター) */}
      {isSelected && (
        <Circle
          radius={outerRadius + 3}
          stroke="#38bdf8"
          strokeWidth={2}
          dash={[4, 3]}
          shadowColor="#38bdf8"
          shadowBlur={6}
          shadowOpacity={0.8}
          listening={false}
        />
      )}

      {/* 透明クリック受付エリア */}
      <Circle radius={outerRadius + 4} fill="transparent" listening={true} />
    </Group>
  );
}
