'use client';

import { Eye, Link, MoveRight, Sparkles } from 'lucide-react';
import type { Player } from '@/lib/types/tactical-unified';
import { useCanvasStore } from '../../hooks/use-canvas-store';
import { DashedArrowIcon } from './hud-icons';

export interface PlayerQuickActionsProps {
  player: Player;
}

export function VisionConeAction({ player }: PlayerQuickActionsProps) {
  const updateMarker = useCanvasStore((s) => s.updateMarker);
  const hasVisionCone = player.visionCone?.visible ?? false;

  const toggleVisionCone = () => {
    updateMarker(player.id, {
      visionCone: {
        id: player.visionCone?.id ?? `vc-${Date.now()}`,
        angleRad: player.visionCone?.angleRad ?? 0,
        spreadRad: player.visionCone?.spreadRad ?? (60 * Math.PI) / 180,
        radius: player.visionCone?.radius ?? 13,
        color: player.visionCone?.color ?? player.style?.color ?? '#38bdf8',
        opacity: player.visionCone?.opacity ?? 0.25,
        visible: !hasVisionCone,
      },
    });
  };

  return (
    <button
      type="button"
      onClick={toggleVisionCone}
      className={`p-1 rounded-md transition-colors cursor-pointer ${
        hasVisionCone
          ? 'text-sky-400 bg-sky-500/20'
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
      title={
        hasVisionCone ? '視野コーンON (クリックでOFF)' : '視野コーンを追加'
      }
    >
      <Eye size={13} />
    </button>
  );
}

export function ConnectLineAction({ player }: PlayerQuickActionsProps) {
  const markers = useCanvasStore((s) => s.annotations.markers);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const updateMarker = useCanvasStore((s) => s.updateMarker);
  const hasLines = (player.connectLines ?? []).length > 0;

  const toggleConnectLine = () => {
    if (hasLines) {
      updateMarker(player.id, { connectLines: [] });
      return;
    }
    const otherMarkers = markers.filter((m) => m.id !== player.id);
    if (otherMarkers.length === 0) return;

    const selectedOther = otherMarkers.find((m) => selectedIds.includes(m.id));
    const target =
      selectedOther ??
      otherMarkers.reduce((prev, curr) => {
        const dPrev = Math.hypot(prev.x - player.x, prev.y - player.y);
        const dCurr = Math.hypot(curr.x - player.x, curr.y - player.y);
        return dCurr < dPrev ? curr : prev;
      });

    updateMarker(player.id, {
      connectLines: [
        {
          id: `cl-${Date.now()}`,
          toPlayerId: target.id,
          lineStyle: 'solid',
          color: player.style?.color ?? '#38bdf8',
          strokeWidth: 2,
          visible: true,
        },
      ],
    });
  };

  return (
    <button
      type="button"
      onClick={toggleConnectLine}
      className={`p-1 rounded-md transition-colors cursor-pointer ${
        hasLines
          ? 'text-emerald-400 bg-emerald-500/20'
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
      title={
        hasLines ? 'コネクトラインON (クリックでOFF)' : 'コネクトラインを追加'
      }
    >
      <Link size={13} />
    </button>
  );
}

export function ArrowActionGroup({ player }: PlayerQuickActionsProps) {
  const addArrow = useCanvasStore((s) => s.addArrow);
  const dir = player.team === 'away' ? -15 : 15;

  const createArrow = (isDashed: boolean) => {
    addArrow({
      id: `arrow-${Date.now()}`,
      annotationType: 'arrow',
      arrowType: isDashed ? 'move' : 'pass',
      curveType: 'straight',
      sourcePlayerId: player.id,
      points: [
        { x: player.x, y: player.y },
        { x: player.x + dir, y: player.y },
      ],
      color: isDashed ? '#ffffff' : player.style?.color || '#38bdf8',
      strokeWidth: 3,
      dashArray: isDashed ? [6, 4] : [],
      arrowHead: true,
      endMarker: 'arrow',
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => createArrow(false)}
        className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        title="実線矢印を追加 (パス/シュート)"
      >
        <MoveRight size={13} />
      </button>
      <button
        type="button"
        onClick={() => createArrow(true)}
        className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        title="点線矢印を追加 (フリーラン/移動)"
      >
        <DashedArrowIcon size={13} />
      </button>
    </>
  );
}

export function SpotlightAction({ player }: PlayerQuickActionsProps) {
  const updateMarker = useCanvasStore((s) => s.updateMarker);
  const hasFocus = player.focus?.enabled ?? false;

  const toggleSpotlight = () => {
    updateMarker(player.id, {
      focus: {
        enabled: !hasFocus,
        color: player.focus?.color ?? '#ffffff',
        radius: player.focus?.radius ?? 3,
        opacity: player.focus?.opacity ?? 0.35,
        style: player.focus?.style ?? 'spotlight',
      },
    });
  };

  return (
    <button
      type="button"
      onClick={toggleSpotlight}
      className={`p-1 rounded-md transition-colors cursor-pointer ${
        hasFocus
          ? 'text-yellow-400 bg-yellow-500/20'
          : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
      title={
        hasFocus ? 'スポットライトON (クリックでOFF)' : 'スポットライトを追加'
      }
    >
      <Sparkles size={13} />
    </button>
  );
}

export function PlayerQuickActions({ player }: PlayerQuickActionsProps) {
  return (
    <>
      <VisionConeAction player={player} />
      <ConnectLineAction player={player} />
      <ArrowActionGroup player={player} />
      <SpotlightAction player={player} />
    </>
  );
}
