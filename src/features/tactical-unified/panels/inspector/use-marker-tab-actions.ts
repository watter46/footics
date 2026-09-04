'use client';

import {
  type MarkerOptionTab,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import type { ArrowAnnotation, Player } from '@/lib/types/tactical-unified';

export interface UseMarkerTabActionsOptions {
  onSelectTab: (tab: MarkerOptionTab) => void;
  player: Player;
  slideId: string;
  updatePlayer: (slideId: string, id: string, p: Partial<Player>) => void;
  addArrow: (slideId: string, arrow: ArrowAnnotation) => void;
}

function createVisionCone(player: Player): NonNullable<Player['visionCone']> {
  return {
    id: crypto.randomUUID(),
    angleRad: 0,
    spreadRad: Math.PI / 3, // 60°
    radius: 13,
    color: player.style.color || '#3b82f6',
    opacity: 0.3,
    visible: true,
  };
}

function createArrowAnnotation(
  player: Player,
  type: 'pass' | 'move',
): ArrowAnnotation {
  const dir = player.team === 'away' ? -15 : 15;
  const isPass = type === 'pass';
  return {
    id: crypto.randomUUID(),
    annotationType: 'arrow',
    arrowType: type,
    curveType: 'straight',
    sourcePlayerId: player.id,
    points: [
      { x: player.x, y: player.y },
      { x: player.x + dir, y: player.y },
    ],
    color: isPass ? player.style.color || '#38bdf8' : '#fbbf24',
    strokeWidth: 3,
    dashArray: isPass ? [] : [6, 4],
    arrowHead: true,
    endMarker: 'arrow',
  };
}

export function useMarkerTabActions({
  onSelectTab,
  player,
  slideId,
  updatePlayer,
  addArrow,
}: UseMarkerTabActionsOptions) {
  const setConnectingPlayerId = useTacticalUnifiedStore(
    (s) => s.setConnectingPlayerId,
  );

  const up = (p: Partial<Player>) => updatePlayer(slideId, player.id, p);
  const upStyle = (s: Partial<Player['style']>) =>
    up({ style: { ...player.style, ...s } });

  const handleTabClick = (tab: MarkerOptionTab) => {
    onSelectTab(tab);
    if (tab === 'vision' && !player.visionCone?.visible) {
      up({ visionCone: createVisionCone(player) });
    } else if (tab === 'connect') {
      setConnectingPlayerId(player.id);
    } else if (tab === 'arrow_solid') {
      addArrow(slideId, createArrowAnnotation(player, 'pass'));
    } else if (tab === 'arrow_dash') {
      addArrow(slideId, createArrowAnnotation(player, 'move'));
    } else if (tab === 'focus' && !player.focus?.enabled) {
      up({
        focus: {
          enabled: true,
          color: '#ffffff',
          radius: 3,
          opacity: 0.35,
          style: 'spotlight',
        },
      });
    }
  };

  const handleSpuit = async () => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        // @ts-expect-error EyeDropper is a modern browser API
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          upStyle({ color: result.sRGBHex });
        }
      } catch {
        // user cancelled
      }
    } else {
      handleTabClick('basic');
    }
  };

  return { handleTabClick, handleSpuit };
}
