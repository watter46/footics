'use client';

import { Eye, Link, MoveRight, Sparkles } from 'lucide-react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { Player } from '@/lib/types/tactical-unified';
import { DashedArrowIcon } from './hud-icons';

interface PlayerActionProps {
  player: Player;
  activeSlideId: string;
}

function VisionConeAction({ player, activeSlideId }: PlayerActionProps) {
  const updatePlayer = useTacticalUnifiedStore((s) => s.updatePlayer);
  const hasVisionCone = player.visionCone?.visible ?? false;

  return (
    <button
      type="button"
      onClick={() => {
        const nextVisible = !hasVisionCone;
        updatePlayer(activeSlideId, player.id, {
          visionCone: {
            id: player.visionCone?.id ?? crypto.randomUUID(),
            angleRad: player.visionCone?.angleRad ?? 0,
            spreadRad: player.visionCone?.spreadRad ?? (60 * Math.PI) / 180,
            radius: player.visionCone?.radius ?? 13,
            color: player.visionCone?.color ?? player.style?.color ?? '#38bdf8',
            opacity: player.visionCone?.opacity ?? 0.25,
            visible: nextVisible,
          },
        });
      }}
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

function ConnectLineAction({ player }: { player: Player }) {
  const connectingPlayerId = useTacticalUnifiedStore(
    (s) => s.connectingPlayerId,
  );
  const setConnectingPlayerId = useTacticalUnifiedStore(
    (s) => s.setConnectingPlayerId,
  );
  const isConnecting = connectingPlayerId === player.id;

  return (
    <button
      type="button"
      onClick={() => {
        setConnectingPlayerId(isConnecting ? null : player.id);
      }}
      className={`p-1 rounded-md transition-colors cursor-pointer ${
        isConnecting
          ? 'text-emerald-400 bg-emerald-500/30 animate-pulse'
          : player.connectLines?.length > 0
            ? 'text-emerald-400 bg-emerald-500/20'
            : 'text-white/70 hover:text-white hover:bg-white/10'
      }`}
      title={
        isConnecting
          ? '対象選手を選択中 (クリックでキャンセル)'
          : 'コネクトラインを追加 (クリック後に対象選手を選択)'
      }
    >
      <Link size={13} />
    </button>
  );
}

function ArrowActions({ player, activeSlideId }: PlayerActionProps) {
  const addArrow = useTacticalUnifiedStore((s) => s.addArrow);
  const dir = player.team === 'away' ? -15 : 15;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          addArrow(activeSlideId, {
            id: crypto.randomUUID(),
            annotationType: 'arrow',
            arrowType: 'pass',
            curveType: 'straight',
            sourcePlayerId: player.id,
            points: [
              { x: player.x, y: player.y },
              { x: player.x + dir, y: player.y },
            ],
            color: player.style?.color || '#38bdf8',
            strokeWidth: 3,
            dashArray: [],
            arrowHead: true,
            endMarker: 'arrow',
          });
        }}
        className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        title="実線矢印を追加 (パス/シュート)"
      >
        <MoveRight size={13} />
      </button>
      <button
        type="button"
        onClick={() => {
          addArrow(activeSlideId, {
            id: crypto.randomUUID(),
            annotationType: 'arrow',
            arrowType: 'move',
            curveType: 'straight',
            sourcePlayerId: player.id,
            points: [
              { x: player.x, y: player.y },
              { x: player.x + dir, y: player.y },
            ],
            color: '#ffffff',
            strokeWidth: 3,
            dashArray: [6, 4],
            arrowHead: true,
            endMarker: 'arrow',
          });
        }}
        className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        title="点線矢印を追加 (フリーラン/移動)"
      >
        <DashedArrowIcon size={13} />
      </button>
    </>
  );
}

function SpotlightAction({ player, activeSlideId }: PlayerActionProps) {
  const updatePlayer = useTacticalUnifiedStore((s) => s.updatePlayer);
  const hasFocus = player.focus?.enabled ?? false;

  return (
    <button
      type="button"
      onClick={() => {
        const nextEnabled = !hasFocus;
        updatePlayer(activeSlideId, player.id, {
          focus: {
            enabled: nextEnabled,
            color: player.focus?.color ?? '#ffffff',
            radius: player.focus?.radius ?? 3,
            opacity: player.focus?.opacity ?? 0.35,
            style: player.focus?.style ?? 'spotlight',
          },
        });
      }}
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

export interface PlayerQuickActionsProps {
  player: Player;
  activeSlideId: string;
}

export function PlayerQuickActions({
  player,
  activeSlideId,
}: PlayerQuickActionsProps) {
  return (
    <>
      <VisionConeAction player={player} activeSlideId={activeSlideId} />
      <ConnectLineAction player={player} />
      <ArrowActions player={player} activeSlideId={activeSlideId} />
      <SpotlightAction player={player} activeSlideId={activeSlideId} />
    </>
  );
}
