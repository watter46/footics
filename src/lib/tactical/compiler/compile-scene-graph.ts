import {
  type StageViewport,
  screenNormToStagePixel,
} from '@/lib/tactical/engine/coordinates';
import { projectStagePixelWithPitchTransform } from '@/lib/tactical/engine/projection-3d';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  type ScreenNormPoint,
  type StagePixelPoint,
  toScreenNormPoint,
  toStagePixelPoint,
} from '@/lib/types/tactical/branded';
import type { PitchTransform } from '@/lib/types/tactical/camera-config';
import type { PitchPlayer } from '@/lib/types/tactical/domain-entities';
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
  type: 'straight' | 'arc_left' | 'arc_right' | 'custom',
  curveOffsetPercent: number | undefined,
  controlPointNorm: ScreenNormPoint | undefined,
  viewport: StageViewport,
  pitchTransform: PitchTransform | null | undefined,
): readonly number[] {
  let rawPoints: readonly number[];

  if (type === 'custom' && controlPointNorm) {
    const rawCpPx = screenNormToStagePixel(controlPointNorm, viewport);
    rawPoints = subdivideQuadraticBezier(
      startRawPx.x,
      startRawPx.y,
      rawCpPx.x,
      rawCpPx.y,
      endRawPx.x,
      endRawPx.y,
      30,
    );
  } else if (type === 'arc_left' || type === 'arc_right') {
    const midX = (startRawPx.x + endRawPx.x) / 2;
    const midY = (startRawPx.y + endRawPx.y) / 2;
    const dx = endRawPx.x - startRawPx.x;
    const dy = endRawPx.y - startRawPx.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) {
      rawPoints = [startRawPx.x, startRawPx.y, endRawPx.x, endRawPx.y];
    } else {
      const offsetFactor = (curveOffsetPercent ?? 15) / 100;
      const offset = dist * offsetFactor;
      const sign = type === 'arc_left' ? 1 : -1;
      const nx = (dy / dist) * sign;
      const ny = (-dx / dist) * sign;
      const cpX = midX + nx * offset;
      const cpY = midY + ny * offset;
      rawPoints = subdivideQuadraticBezier(
        startRawPx.x,
        startRawPx.y,
        cpX,
        cpY,
        endRawPx.x,
        endRawPx.y,
        30,
      );
    }
  } else {
    // default / straight
    rawPoints = [startRawPx.x, startRawPx.y, endRawPx.x, endRawPx.y];
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

  if (prevSlide) {
    const prevPlayersMap = new Map(
      prevSlide.players
        .filter((p) => p.area === 'pitch')
        .map((p) => [p.id, p as PitchPlayer]),
    );

    for (const [playerId, resolvedPlayer] of resolvedPlayersMap.entries()) {
      const prevPlayer = prevPlayersMap.get(playerId);
      if (!prevPlayer) continue;

      const currPlayer = resolvedPlayer.player;
      const effPos = resolvedPlayer.screenNormPos;
      const dist = Math.hypot(effPos.x - prevPlayer.x, effPos.y - prevPlayer.y);
      if (dist < 1) continue;

      const isEnabled =
        currPlayer.trajectoryEffect?.enabled === true ||
        selectedIds.has(playerId);
      if (!isEnabled) continue;

      const prevPosNorm = toScreenNormPoint(prevPlayer.x, prevPlayer.y, false);
      const rawStartPx = screenNormToStagePixel(prevPosNorm, viewport);
      const rawEndPx = screenNormToStagePixel(effPos, viewport);

      const trajType = currPlayer.trajectory?.type ?? 'straight';
      const flatPointsPx = computeTrajectoryPoints(
        rawStartPx,
        rawEndPx,
        trajType,
        currPlayer.trajectory?.curveOffset,
        currPlayer.trajectory?.controlPoint
          ? toScreenNormPoint(
              currPlayer.trajectory.controlPoint.x,
              currPlayer.trajectory.controlPoint.y,
              false,
            )
          : undefined,
        viewport,
        pitchTransform,
      );

      const isDashed = currPlayer.trajectoryEffect?.lineStyle === 'dashed';
      const dashArrayPx = isDashed ? [6, 4] : [];
      const color =
        currPlayer.trajectoryEffect?.color ?? currPlayer.style.color;

      trajectories.push({
        playerId,
        flatPointsPx,
        color,
        dashArrayPx,
        visible: true,
      });
    }

    if (prevSlide.ball) {
      const prevBall = prevSlide.ball;
      const currBall = frame.slide.ball;
      const effBallPos = toScreenNormPoint(currBall.x, currBall.y, false);
      const ballDist = Math.hypot(
        effBallPos.x - prevBall.x,
        effBallPos.y - prevBall.y,
      );
      if (
        ballDist >= 1 &&
        (selectedIds.has('ball') || Boolean(currBall.trajectory))
      ) {
        const prevBallNorm = toScreenNormPoint(prevBall.x, prevBall.y, false);
        const rawBallStartPx = screenNormToStagePixel(prevBallNorm, viewport);
        const rawBallEndPx = screenNormToStagePixel(effBallPos, viewport);

        const trajType = currBall.trajectory?.type ?? 'straight';
        const flatPointsPx = computeTrajectoryPoints(
          rawBallStartPx,
          rawBallEndPx,
          trajType,
          currBall.trajectory?.curveOffset,
          currBall.trajectory?.controlPoint
            ? toScreenNormPoint(
                currBall.trajectory.controlPoint.x,
                currBall.trajectory.controlPoint.y,
                false,
              )
            : undefined,
          viewport,
          pitchTransform,
        );

        trajectories.push({
          playerId: 'ball',
          flatPointsPx,
          color: currBall.color ?? '#ffffff',
          dashArrayPx: [6, 4],
          visible: currBall.visible,
        });
      }
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
