import {
  type StageViewport,
  screenNormToStagePixel,
} from '@/lib/tactical/engine/coordinates';
import { computeRippleRings } from '@/lib/tactical/engine/effect-geometry';
import {
  computeBillboardDepthKey,
  projectStagePixelWithPitchTransform,
} from '@/lib/tactical/engine/projection-3d';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  type ScreenNormPoint,
  type StagePixelPoint,
  toScreenNormPoint,
  toStagePixelPoint,
} from '@/lib/types/tactical/branded';
import type { PitchPlayer } from '@/lib/types/tactical/domain-entities';
import {
  computeBallRadiusPx,
  computePlayerRadiusPx,
} from './geometry-primitives';
import type {
  EphemeralSessionState,
  ResolvedBillboardItem,
  ResolvedBillboardPlayerItem,
  ResolvedPlayerFocusDTO,
  ResolvedVisionConeDTO,
} from './scene-graph-dto';

export interface ResolvedPlayerInternal {
  readonly player: PitchPlayer;
  readonly screenNormPos: ScreenNormPoint;
  readonly positionPx: StagePixelPoint;
  readonly radiusPx: number;
  readonly depthSortKey: number;
  readonly opacity: number;
  readonly visible: boolean;
  readonly selected: boolean;
  readonly rippleRingsPx: readonly {
    readonly radiusPx: number;
    readonly opacity: number;
    readonly color: string;
  }[];
}

export function compileBillboardItems(
  frame: EvaluatedTimelineFrame,
  session: EphemeralSessionState | null,
  viewport: StageViewport,
): {
  readonly billboardItems: readonly ResolvedBillboardItem[];
  readonly resolvedPlayersMap: ReadonlyMap<string, ResolvedPlayerInternal>;
  readonly billboardPlayers: readonly ResolvedBillboardPlayerItem[];
} {
  const selectedIds = new Set(session?.selectedIds ?? []);
  const pitchTransform = frame.slide.pitchTransform;
  const tiltDeg = pitchTransform?.tilt ?? 0;
  const zoom = pitchTransform?.zoom ?? 1;
  const scale = viewport.width > 0 ? viewport.width / 1200 : 1;

  const resolvedPlayersMap = new Map<string, ResolvedPlayerInternal>();
  const billboardPlayers: ResolvedBillboardPlayerItem[] = [];

  for (const player of frame.slide.players) {
    if (player.area !== 'pitch') continue;
    const pitchPlayer = player as PitchPlayer;

    const screenNormPos = toScreenNormPoint(player.x, player.y, false);
    const rawPosPx = screenNormToStagePixel(screenNormPos, viewport);
    const projectedPos = projectStagePixelWithPitchTransform(
      rawPosPx,
      viewport,
      pitchTransform,
    );
    const positionPx = toStagePixelPoint(projectedPos.x, projectedPos.y);

    const radiusPx = computePlayerRadiusPx(
      viewport,
      pitchPlayer.style?.sizeScale,
    );
    const depthSortKey = computeBillboardDepthKey(
      positionPx,
      'player',
      tiltDeg,
    );

    const playerEffect = frame.playerOpacityMap[player.id] ?? {
      opacity: 1,
      visible: true,
    };
    const isSelected = selectedIds.has(player.id);

    const rings = computeRippleRings(
      frame.timeInSlideMs,
      pitchPlayer.markerEffect,
      radiusPx,
    );
    const rippleRingsPx = rings.map((r) => ({
      radiusPx: r.radius,
      opacity: r.opacity,
      color: r.color ?? pitchPlayer.style.color,
    }));

    const visionCone: ResolvedVisionConeDTO | null =
      pitchPlayer.visionCone && pitchPlayer.visionCone.visible !== false
        ? {
            id: pitchPlayer.visionCone.id ?? `${player.id}-vision`,
            angleRad: pitchPlayer.visionCone.angleRad,
            spreadRad: pitchPlayer.visionCone.spreadRad,
            radiusPx:
              (pitchPlayer.visionCone.radius / 100) *
              Math.min(viewport.width, viewport.height) *
              zoom,
            color: pitchPlayer.visionCone.color,
            opacity: pitchPlayer.visionCone.opacity,
            visible: true,
          }
        : null;

    const focus: ResolvedPlayerFocusDTO | null =
      pitchPlayer.focus && pitchPlayer.focus.enabled !== false
        ? {
            enabled: true,
            color: pitchPlayer.focus.color,
            radiusPx: radiusPx * pitchPlayer.focus.radius,
            opacity: pitchPlayer.focus.opacity,
            style: pitchPlayer.focus.style,
          }
        : null;

    const resolvedPlayer: ResolvedPlayerInternal = {
      player: pitchPlayer,
      screenNormPos,
      positionPx,
      radiusPx,
      depthSortKey,
      opacity: playerEffect.opacity,
      visible: playerEffect.visible,
      selected: isSelected,
      rippleRingsPx,
    };

    resolvedPlayersMap.set(player.id, resolvedPlayer);

    billboardPlayers.push({
      kind: 'player',
      id: player.id,
      positionPx,
      radiusPx,
      depthSortKey,
      opacity: playerEffect.opacity,
      visible: playerEffect.visible,
      selected: isSelected,
      player: pitchPlayer,
      rippleRingsPx,
      visionCone,
      focus,
    });
  }

  // Ball
  const rawBallPos = screenNormToStagePixel(
    toScreenNormPoint(frame.slide.ball.x, frame.slide.ball.y, false),
    viewport,
  );
  const projectedBall = projectStagePixelWithPitchTransform(
    rawBallPos,
    viewport,
    pitchTransform,
  );
  const ballPos = toStagePixelPoint(projectedBall.x, projectedBall.y);
  const ballRadiusPx = computeBallRadiusPx(
    viewport,
    frame.slide.ball.sizeScale,
  );
  const ballDepthSortKey = computeBillboardDepthKey(ballPos, 'ball', tiltDeg);

  const billboardBall: ResolvedBillboardItem = {
    kind: 'ball',
    positionPx: ballPos,
    radiusPx: ballRadiusPx,
    depthSortKey: ballDepthSortKey,
    opacity: 1,
    visible: frame.slide.ball.visible,
    color: frame.slide.ball.color,
  };

  // Texts
  const billboardTexts: ResolvedBillboardItem[] = frame.slide.texts.map(
    (text) => {
      const rawTextPos = screenNormToStagePixel(
        toScreenNormPoint(text.x, text.y, false),
        viewport,
      );
      const projectedText = projectStagePixelWithPitchTransform(
        rawTextPos,
        viewport,
        pitchTransform,
      );
      const textPos = toStagePixelPoint(projectedText.x, projectedText.y);
      const depthSortKey = computeBillboardDepthKey(textPos, 'text', tiltDeg);
      const fontSizePx = Math.max(8, Math.round(text.fontSize * scale));

      return {
        kind: 'text',
        id: text.id,
        positionPx: textPos,
        depthSortKey,
        content: text.content,
        fontSizePx,
        color: text.color,
        bold: text.bold,
        italic: text.italic,
        opacity: 1,
        visible: true,
        selected: selectedIds.has(text.id),
      };
    },
  );

  const billboardItems: ResolvedBillboardItem[] = [
    ...billboardPlayers,
    billboardBall,
    ...billboardTexts,
  ].sort((a, b) => a.depthSortKey - b.depthSortKey);

  return {
    billboardItems,
    resolvedPlayersMap,
    billboardPlayers,
  };
}
