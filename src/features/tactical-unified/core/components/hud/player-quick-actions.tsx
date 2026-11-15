'use client';

import { Eye, Link, MoveRight, Sparkles } from 'lucide-react';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { toScreenNormPoint } from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import { WavyArrowIcon } from '../toolbar/core-toolbar-icons';
import { DashedArrowIcon } from './hud-icons';
import { MiniColorPicker } from './mini-color-picker';

export interface PlayerQuickActionsProps {
  player: DomainPlayer;
}

export function VisionConeAction({ player }: PlayerQuickActionsProps) {
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  if (player.area !== 'pitch') return null;
  const visible = player.visionCone?.visible ?? false;

  const toggleVisionCone = () => {
    dispatchSlide(activePhaseId, activeSlideId, {
      type: 'SET_PLAYER_VISION_CONE',
      playerId: player.id,
      cone: {
        id: player.visionCone?.id ?? `vc-${Date.now()}`,
        angleRad: player.visionCone?.angleRad ?? 0,
        spreadRad: player.visionCone?.spreadRad ?? (60 * Math.PI) / 180,
        radius: player.visionCone?.radius ?? 13,
        color: player.visionCone?.color ?? '#38bdf8',
        opacity: player.visionCone?.opacity ?? 0.3,
        visible: !visible,
      },
    });
  };

  return (
    <>
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
      {visible && player.visionCone && (
        <MiniColorPicker
          value={player.visionCone.color ?? '#38bdf8'}
          onChange={(color) => {
            if (player.visionCone) {
              dispatchSlide(activePhaseId, activeSlideId, {
                type: 'UPDATE_PLAYER',
                id: player.id,
                patch: {
                  visionCone: { ...player.visionCone, color },
                },
              });
            }
          }}
          title="視野カラー変更"
        />
      )}
    </>
  );
}

export function ConnectLineAction({ player }: PlayerQuickActionsProps) {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const slide = useDocumentStore((s) =>
    selectDomainActiveSlide(s.project, activePhaseId, activeSlideId),
  );
  const players = slide?.players ?? [];
  const selectedObjects = useSessionStore((s) => s.selectedObjects);
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const connectingPlayerId = useSessionStore((s) => s.connectingPlayerId);
  const setConnectingPlayerId = useSessionStore((s) => s.setConnectingPlayerId);

  if (player.area !== 'pitch') return null;
  const hasLines = (player.connectLines ?? []).length > 0;
  const isConnecting = connectingPlayerId === player.id;

  const toggleConnectLine = () => {
    if (isConnecting) return setConnectingPlayerId(null);
    if (hasLines) {
      dispatchSlide(activePhaseId, activeSlideId, {
        type: 'UPDATE_PLAYER',
        id: player.id,
        patch: { connectLines: [] },
      });
      return setConnectingPlayerId(null);
    }
    const otherMarkers = players.filter((m) => m.id !== player.id);
    if (otherMarkers.length === 0) return;
    const selectedOther = otherMarkers.find((m) =>
      selectedObjects.some((obj) => obj.kind === 'player' && obj.id === m.id),
    );
    if (selectedOther) {
      dispatchSlide(activePhaseId, activeSlideId, {
        type: 'UPDATE_PLAYER',
        id: player.id,
        patch: {
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
        },
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
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const dir = player.team === 'away' ? -15 : 15;

  const addPlayerArrow = (
    arrowType: 'pass' | 'move' | 'dribble',
    color: string,
    dashArray: number[],
  ) => {
    dispatchSlide(activePhaseId, activeSlideId, {
      type: 'ADD_ARROW',
      arrow: {
        id: `arrow-${Date.now()}`,
        annotationType: 'arrow',
        arrowType,
        curveType: 'straight',
        sourcePlayerId: player.id,
        points: [
          toScreenNormPoint(player.x, player.y),
          toScreenNormPoint(player.x + dir, player.y),
        ],
        color,
        strokeWidth: 3,
        dashArray,
        startMarker: 'none',
        endMarker: 'arrow',
      },
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
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  if (player.area !== 'pitch') return null;
  const hasFocus = player.focus?.enabled ?? false;

  const toggleSpotlight = () => {
    dispatchSlide(activePhaseId, activeSlideId, {
      type: 'SET_PLAYER_FOCUS',
      playerId: player.id,
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
