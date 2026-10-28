'use client';

import { Eye, Link, MoveRight, Sparkles } from 'lucide-react';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';
import type { Player } from '@/lib/types/tactical-unified';
import { WavyArrowIcon } from '../toolbar/core-toolbar-icons';
import { DashedArrowIcon } from './hud-icons';

export interface PlayerQuickActionsProps {
  player: Player;
}

export function VisionConeAction({ player }: PlayerQuickActionsProps) {
  const updateMarker = useCanvasStore((s) => s.updateMarker);
  const visible = player.visionCone?.visible ?? false;

  const toggleVisionCone = () => {
    updateMarker(player.id, {
      visionCone: {
        id: player.visionCone?.id ?? `vc-${Date.now()}`,
        angleRad: player.visionCone?.angleRad ?? 0,
        spreadRad: player.visionCone?.spreadRad ?? (60 * Math.PI) / 180,
        radius: player.visionCone?.radius ?? 13,
        color: player.visionCone?.color ?? '#034694',
        opacity: player.visionCone?.opacity ?? 0.3,
        visible: !visible,
      },
    });
  };

  return (
    <button
      type="button"
      onClick={toggleVisionCone}
      style={
        visible ? { backgroundColor: '#FF8100', color: '#ffffff' } : undefined
      }
      className={`p-1 rounded-md transition-all cursor-pointer ${
        visible
          ? 'bg-[#FF8100] text-white shadow-sm'
          : 'text-white/80 hover:text-white hover:bg-white/[0.08]'
      }`}
      title={visible ? '視野コーンON (クリックでOFF)' : '視野コーンを追加'}
    >
      <Eye size={13} />
    </button>
  );
}

export function ConnectLineAction({ player }: PlayerQuickActionsProps) {
  const markers = useCanvasStore((s) => s.annotations.markers);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const updateMarker = useCanvasStore((s) => s.updateMarker);
  const connectingPlayerId = useCanvasStore((s) => s.connectingPlayerId);
  const setConnectingPlayerId = useCanvasStore((s) => s.setConnectingPlayerId);

  const hasLines = (player.connectLines ?? []).length > 0;
  const isConnecting = connectingPlayerId === player.id;

  const toggleConnectLine = () => {
    if (isConnecting) return setConnectingPlayerId(null);
    if (hasLines) {
      updateMarker(player.id, { connectLines: [] });
      return setConnectingPlayerId(null);
    }
    const otherMarkers = markers.filter((m) => m.id !== player.id);
    if (otherMarkers.length === 0) return;
    const selectedOther = otherMarkers.find((m) => selectedIds.includes(m.id));
    if (selectedOther) {
      updateMarker(player.id, {
        connectLines: [
          ...(player.connectLines ?? []),
          {
            id: `cl-${Date.now()}`,
            toPlayerId: selectedOther.id,
            lineStyle: 'solid',
            color: player.style?.color ?? '#034694',
            strokeWidth: 2,
            visible: true,
          },
        ],
      });
      return;
    }
    setConnectingPlayerId(player.id);
  };

  const btnStyle = isConnecting
    ? { backgroundColor: '#FF8100', color: '#ffffff' }
    : hasLines
      ? { backgroundColor: '#10b981', color: '#ffffff' }
      : undefined;

  return (
    <button
      type="button"
      onClick={toggleConnectLine}
      style={btnStyle}
      className={`p-1 rounded-md transition-all cursor-pointer ${
        isConnecting
          ? 'bg-[#FF8100] text-white animate-pulse shadow-md'
          : hasLines
            ? 'bg-emerald-500 text-white shadow-sm'
            : 'text-white/80 hover:text-white hover:bg-white/[0.08]'
      }`}
      title={
        isConnecting
          ? '接続先マーカーをクリックしてください (クリックで解除)'
          : hasLines
            ? 'コネクトラインON (クリックでOFF)'
            : 'コネクトラインを追加 (相手マーカー選択)'
      }
    >
      <Link size={13} />
    </button>
  );
}

export function ArrowActionGroup({ player }: PlayerQuickActionsProps) {
  const addArrow = useCanvasStore((s) => s.addArrow);
  const dir = player.team === 'away' ? -15 : 15;

  const addPlayerArrow = (
    arrowType: 'pass' | 'move' | 'dribble',
    color: string,
    dashArray: number[],
  ) => {
    addArrow({
      id: `arrow-${Date.now()}`,
      annotationType: 'arrow',
      arrowType,
      curveType: 'straight',
      sourcePlayerId: player.id,
      points: [
        { x: player.x, y: player.y },
        { x: player.x + dir, y: player.y },
      ],
      color,
      strokeWidth: 3,
      dashArray,
      arrowHead: true,
      endMarker: 'arrow',
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => addPlayerArrow('pass', '#ffffff', [])}
        className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        title="実線矢印を追加 (パス/シュート)"
      >
        <MoveRight size={13} />
      </button>
      <button
        type="button"
        onClick={() => addPlayerArrow('move', '#ffffff', [6, 4])}
        className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        title="点線矢印を追加 (フリーラン/移動)"
      >
        <DashedArrowIcon size={13} />
      </button>
      <button
        type="button"
        onClick={() => addPlayerArrow('dribble', '#eab308', [])}
        className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        title="波線矢印を追加 (ドリブル/波線)"
      >
        <WavyArrowIcon size={13} />
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
      style={
        hasFocus ? { backgroundColor: '#f59e0b', color: '#ffffff' } : undefined
      }
      className={`p-1 rounded-md transition-all cursor-pointer ${
        hasFocus
          ? 'bg-amber-500 text-white shadow-sm'
          : 'text-white/80 hover:text-white hover:bg-white/[0.08]'
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
