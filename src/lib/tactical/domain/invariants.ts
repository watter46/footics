import {
  clampToScreenNorm,
  type ScreenNormCoord,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  BenchPlayer,
  DomainArrowAnnotation,
  DomainPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { EntityKind, SlideCommand } from './commands';

/**
 * PitchPlayer / BenchPlayer を純粋な BenchPlayer 型に変換し、
 * ピッチ専用属性（visionCone, connectLines, badges, focus, trajectory 等）を完全に剥離する。
 */
export function toBenchPlayer(
  player: DomainPlayer,
  x?: ScreenNormCoord,
  y?: ScreenNormCoord,
): BenchPlayer {
  const targetX =
    x !== undefined ? clampToScreenNorm(x) : clampToScreenNorm(player.x);
  const targetY =
    y !== undefined ? clampToScreenNorm(y) : clampToScreenNorm(player.y);

  return {
    id: player.id,
    playerId: player.playerId,
    name: player.name,
    shirtNo: player.shirtNo,
    position: player.position,
    team: player.team,
    x: targetX,
    y: targetY,
    style: player.style,
    locked: player.locked,
    isCustom: player.isCustom,
    area: 'bench',
  };
}

function restoreLocked<T extends { id: string; locked?: boolean }>(
  prevList: readonly T[],
  candidateList: readonly T[],
  isLockToggle: (id: string) => boolean,
): T[] {
  const lockedInPrev = new Map<string, T>();
  for (const item of prevList) {
    if (item.locked && !isLockToggle(item.id)) {
      lockedInPrev.set(item.id, item);
    }
  }

  if (lockedInPrev.size === 0) {
    return [...candidateList];
  }

  const result: T[] = [];
  const handledIds = new Set<string>();

  for (const item of candidateList) {
    const prevLocked = lockedInPrev.get(item.id);
    if (prevLocked) {
      result.push(prevLocked);
      handledIds.add(item.id);
    } else {
      result.push(item);
    }
  }

  for (const [id, prevLocked] of lockedInPrev.entries()) {
    if (!handledIds.has(id)) {
      result.push(prevLocked);
    }
  }

  return result;
}

/**
 * 単一不変条件ノーマライザ
 * 実行順序:
 * 1. Lock Guard: prevSlide で locked === true のエンティティは TOGGLE_ENTITY_LOCK 以外では prevSlide の状態を強制復元
 * 2. Coordinate Clamp: 選手とボールの座標を clampToScreenNorm で正規化し、area === 'bench' の選手は toBenchPlayer でピッチ専用属性を剥離
 * 3. Cascade Clean: area === 'pitch' の選手ID集合 (activePitchIds) に存在しない toPlayerId の ConnectLine と、sourcePlayerId / targetPlayerId が activePitchIds に存在しない追従矢印を除去
 * 4. Endpoint Sync: sourcePlayerId / targetPlayerId がバインドされた矢印の始点 points[0] / 終点 points[last] を該当 PitchPlayer の {x, y} に強制同期
 */
export function enforceSlideInvariants(
  prevSlide: DomainSlide,
  candidateSlide: DomainSlide,
  command: SlideCommand,
): DomainSlide {
  // 1. Lock Guard
  const isToggle = (kind: EntityKind) => (id: string) =>
    command.type === 'TOGGLE_ENTITY_LOCK' &&
    command.kind === kind &&
    command.id === id;

  const lockedGuardedPlayers = restoreLocked(
    prevSlide.players,
    candidateSlide.players,
    isToggle('player'),
  );
  const lockedGuardedArrows = restoreLocked(
    prevSlide.arrows,
    candidateSlide.arrows,
    isToggle('arrow'),
  );
  const lockedGuardedZones = restoreLocked(
    prevSlide.zones,
    candidateSlide.zones,
    isToggle('zone'),
  );
  const lockedGuardedTexts = restoreLocked(
    prevSlide.texts,
    candidateSlide.texts,
    isToggle('text'),
  );

  // 2. Coordinate Clamp & Bench Player Normalization
  const normalizedPlayers: DomainPlayer[] = lockedGuardedPlayers.map(
    (player) => {
      if (player.area === 'pitch') {
        return {
          ...player,
          x: clampToScreenNorm(player.x),
          y: clampToScreenNorm(player.y),
        };
      }
      return toBenchPlayer(player, player.x, player.y);
    },
  );

  const normalizedBall = {
    ...candidateSlide.ball,
    x: clampToScreenNorm(candidateSlide.ball.x),
    y: clampToScreenNorm(candidateSlide.ball.y),
  };

  // 3. Cascade Clean
  const activePitchPlayers = normalizedPlayers.filter(
    (p): p is PitchPlayer => p.area === 'pitch',
  );
  const activePitchIds = new Set(activePitchPlayers.map((p) => p.id));

  const cascadeCleanedPlayers: DomainPlayer[] = normalizedPlayers.map(
    (player) => {
      if (player.area !== 'pitch' || player.connectLines.length === 0) {
        return player;
      }
      const validConnectLines = player.connectLines.filter((cl) =>
        activePitchIds.has(cl.toPlayerId),
      );
      if (validConnectLines.length === player.connectLines.length) {
        return player;
      }
      return {
        ...player,
        connectLines: validConnectLines,
      };
    },
  );

  const cascadeCleanedArrows = lockedGuardedArrows.filter((arrow) => {
    if (arrow.sourcePlayerId && !activePitchIds.has(arrow.sourcePlayerId)) {
      return false;
    }
    if (arrow.targetPlayerId && !activePitchIds.has(arrow.targetPlayerId)) {
      return false;
    }
    return true;
  });

  // 4. Endpoint Sync
  const pitchPlayerMap = new Map(activePitchPlayers.map((p) => [p.id, p]));

  const syncedArrows: DomainArrowAnnotation[] = cascadeCleanedArrows.map(
    (arrow) => {
      let nextPoints = arrow.points;
      const srcPlayer = arrow.sourcePlayerId
        ? pitchPlayerMap.get(arrow.sourcePlayerId)
        : undefined;
      const tgtPlayer = arrow.targetPlayerId
        ? pitchPlayerMap.get(arrow.targetPlayerId)
        : undefined;

      if (srcPlayer && nextPoints.length > 0) {
        const startPt = toScreenNormPoint(srcPlayer.x, srcPlayer.y);
        nextPoints = [startPt, ...nextPoints.slice(1)];
      }

      if (tgtPlayer && nextPoints.length > 1) {
        const endPt = toScreenNormPoint(tgtPlayer.x, tgtPlayer.y);
        nextPoints = [...nextPoints.slice(0, nextPoints.length - 1), endPt];
      }

      if (nextPoints === arrow.points) {
        return arrow;
      }

      return {
        ...arrow,
        points: nextPoints,
      };
    },
  );

  return {
    ...candidateSlide,
    players: cascadeCleanedPlayers,
    arrows: syncedArrows,
    zones: lockedGuardedZones,
    texts: lockedGuardedTexts,
    ball: normalizedBall,
  };
}
