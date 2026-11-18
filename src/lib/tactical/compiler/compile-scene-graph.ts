import {
  type StageViewport,
  screenNormToStagePixel,
} from '@/lib/tactical/engine/coordinates';
import { projectStagePixelWithPitchTransform } from '@/lib/tactical/engine/projection-3d';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import { getBezierControlPointPx } from '@/lib/tactical/engine/trajectory';
import {
  type StagePixelPoint,
  toScreenNormPoint,
  toStagePixelPoint,
} from '@/lib/types/tactical/branded';
import type { PitchTransform } from '@/lib/types/tactical/camera-config';
import type {
  DomainPlayerTrajectory,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { compileArrows, compileConnectLines } from './compile-arrows';
import {
  compileBillboardItems,
  type ResolvedPlayerInternal,
} from './compile-billboards';
import { compileZones } from './compile-zones';
import { subdivideQuadraticBezier } from './geometry-primitives';
import type {
  EphemeralSessionState,
  ResolvedSceneGraphDTO,
  ResolvedTrajectoryPrimitive,
} from './scene-graph-dto';

function computeTrajectoryPoints(
  startRawPx: StagePixelPoint,
  endRawPx: StagePixelPoint,
  trajectory: DomainPlayerTrajectory | undefined,
  viewport: StageViewport,
  pitchTransform: PitchTransform | null | undefined,
  maxT = 1,
): readonly number[] {
  const clampedMaxT = Math.max(0, Math.min(1, maxT));
  const type = trajectory?.type ?? 'straight';
  let rawPoints: readonly number[];

  if (
    type === 'arc_left' ||
    type === 'arc_right' ||
    (type === 'custom' && trajectory?.controlPoint)
  ) {
    const dist = Math.hypot(
      endRawPx.x - startRawPx.x,
      endRawPx.y - startRawPx.y,
    );
    if (dist < 1) {
      const endX = startRawPx.x + (endRawPx.x - startRawPx.x) * clampedMaxT;
      const endY = startRawPx.y + (endRawPx.y - startRawPx.y) * clampedMaxT;
      rawPoints = [startRawPx.x, startRawPx.y, endX, endY];
    } else {
      const normalizedTrajectory: DomainPlayerTrajectory = {
        ...trajectory,
        type,
        curveOffset: trajectory?.curveOffset ?? 25,
      };
      const cp = getBezierControlPointPx(
        startRawPx,
        endRawPx,
        normalizedTrajectory,
        viewport,
      );
      rawPoints = subdivideQuadraticBezier(
        startRawPx.x,
        startRawPx.y,
        cp.x,
        cp.y,
        endRawPx.x,
        endRawPx.y,
        30,
        clampedMaxT,
      );
    }
  } else {
    const endX = startRawPx.x + (endRawPx.x - startRawPx.x) * clampedMaxT;
    const endY = startRawPx.y + (endRawPx.y - startRawPx.y) * clampedMaxT;
    rawPoints = [startRawPx.x, startRawPx.y, endX, endY];
  }

  const projected: number[] = [];
  for (let i = 0; i < rawPoints.length; i += 2) {
    const p = projectStagePixelWithPitchTransform(
      toStagePixelPoint(rawPoints[i], rawPoints[i + 1]),
      viewport,
      pitchTransform,
    );
    projected.push(p.x, p.y);
  }
  return projected;
}

export function compileTrajectories(
  frame: EvaluatedTimelineFrame,
  resolvedPlayersMap: ReadonlyMap<string, ResolvedPlayerInternal>,
  session: EphemeralSessionState | null,
  viewport: StageViewport,
  prevSlide?: DomainSlide | null,
): readonly ResolvedTrajectoryPrimitive[] {
  const trajectories: ResolvedTrajectoryPrimitive[] = [];
  const selectedIds = new Set(session?.selectedIds ?? []);
  const pitchTransform = frame.slide.pitchTransform;

  const isTransitioning =
    !frame.isPaused &&
    Boolean(frame.transitionSourceSlide && frame.transitionTargetSlide);
  const sourceSlide = isTransitioning ? frame.transitionSourceSlide : prevSlide;
  const targetSlide = isTransitioning
    ? frame.transitionTargetSlide
    : frame.slide;
  const maxT = isTransitioning ? frame.easedProgress : 1;

  if (!sourceSlide || !targetSlide || (isTransitioning && maxT <= 0)) {
    return trajectories;
  }

  const sourcePlayersMap = new Map(
    sourceSlide.players
      .filter((p) => p.area === 'pitch')
      .map((p) => [p.id, p as PitchPlayer]),
  );
  const targetPlayersMap = new Map(
    targetSlide.players
      .filter((p) => p.area === 'pitch')
      .map((p) => [p.id, p as PitchPlayer]),
  );

  for (const [playerId, resolvedPlayer] of resolvedPlayersMap.entries()) {
    const sourcePlayer = sourcePlayersMap.get(playerId);
    const targetPlayer = isTransitioning
      ? targetPlayersMap.get(playerId)
      : resolvedPlayer.player;
    if (!sourcePlayer || !targetPlayer) continue;

    const endNorm = isTransitioning
      ? toScreenNormPoint(targetPlayer.x, targetPlayer.y, false)
      : resolvedPlayer.screenNormPos;
    const dist = Math.hypot(
      endNorm.x - sourcePlayer.x,
      endNorm.y - sourcePlayer.y,
    );
    if (dist < 1) continue;

    const effect = targetPlayer.trajectoryEffect;
    const isEnabled = isTransitioning
      ? effect?.enabled === true || selectedIds.has(playerId)
      : selectedIds.has(playerId) ||
        (effect?.enabled === true && effect.exitAction !== 'auto-hide');
    if (!isEnabled) continue;

    const startNorm = toScreenNormPoint(sourcePlayer.x, sourcePlayer.y, false);
    const rawStartPx = screenNormToStagePixel(startNorm, viewport);
    const rawEndPx = screenNormToStagePixel(endNorm, viewport);

    const flatPointsPx = computeTrajectoryPoints(
      rawStartPx,
      rawEndPx,
      targetPlayer.trajectory,
      viewport,
      pitchTransform,
      maxT,
    );

    const isDashed = effect?.lineStyle === 'dashed';
    const dashArrayPx = isDashed ? [6, 4] : [];
    const color = effect?.color ?? targetPlayer.style.color;

    trajectories.push({
      playerId,
      flatPointsPx,
      color,
      dashArrayPx,
      visible: true,
    });
  }

  const sourceBall = sourceSlide.ball;
  const targetBall = targetSlide.ball;
  if (sourceBall && targetBall) {
    const endBallNorm = toScreenNormPoint(targetBall.x, targetBall.y, false);
    const ballDist = Math.hypot(
      endBallNorm.x - sourceBall.x,
      endBallNorm.y - sourceBall.y,
    );
    const ballEffect = targetBall.trajectoryEffect;
    const isBallEnabled = isTransitioning
      ? ballEffect?.enabled === true || selectedIds.has('ball')
      : selectedIds.has('ball') ||
        (ballEffect?.enabled === true && ballEffect.exitAction !== 'auto-hide');

    if (ballDist >= 1 && isBallEnabled) {
      const startBallNorm = toScreenNormPoint(
        sourceBall.x,
        sourceBall.y,
        false,
      );
      const rawBallStartPx = screenNormToStagePixel(startBallNorm, viewport);
      const rawBallEndPx = screenNormToStagePixel(endBallNorm, viewport);

      const flatPointsPx = computeTrajectoryPoints(
        rawBallStartPx,
        rawBallEndPx,
        targetBall.trajectory,
        viewport,
        pitchTransform,
        maxT,
      );

      trajectories.push({
        playerId: 'ball',
        flatPointsPx,
        color: ballEffect?.color ?? targetBall.color ?? '#ffffff',
        dashArrayPx: ballEffect?.lineStyle === 'dashed' ? [6, 4] : [],
        visible: targetBall.visible,
      });
    }
  }

  return trajectories;
}

export function compileSceneGraph(
  frame: EvaluatedTimelineFrame,
  session: EphemeralSessionState | null,
  viewport: StageViewport,
  prevSlide?: DomainSlide | null,
): ResolvedSceneGraphDTO {
  const scale = viewport.width > 0 ? viewport.width / 1200 : 1;

  // 1. Compile Billboards (players, ball, texts sorted by depthSortKey)
  const { billboardItems, resolvedPlayersMap, billboardPlayers } =
    compileBillboardItems(frame, session, viewport);

  // 2. Compile Zones
  const zones = compileZones(frame, session, viewport);

  // 3. Compile Connect Lines & Arrows
  const connectLines = compileConnectLines(
    billboardPlayers,
    resolvedPlayersMap,
    scale,
  );
  const arrows = compileArrows(frame, session, viewport, resolvedPlayersMap);

  // 4. Compile Trajectories
  const trajectories = compileTrajectories(
    frame,
    resolvedPlayersMap,
    session,
    viewport,
    prevSlide,
  );

  return {
    viewport,
    zones,
    connectLines,
    trajectories,
    arrows,
    billboardItems,
  };
}
