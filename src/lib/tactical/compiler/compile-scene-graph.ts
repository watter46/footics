import type { StageViewport } from '@/lib/tactical/engine/coordinates';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import { compileArrows, compileConnectLines } from './compile-arrows';
import { compileBillboardItems } from './compile-billboards';
import { compileDrawingPreview, compileZones } from './compile-zones';
import type {
  EphemeralSessionState,
  ResolvedSceneGraphDTO,
  ResolvedTrajectoryPrimitive,
} from './scene-graph-dto';

export function compileSceneGraph(
  frame: EvaluatedTimelineFrame,
  session: EphemeralSessionState | null,
  viewport: StageViewport,
): ResolvedSceneGraphDTO {
  const scale = viewport.width > 0 ? viewport.width / 1200 : 1;

  // 1. Compile Billboards (players, ball, texts sorted by depthSortKey)
  const { billboardItems, resolvedPlayersMap, billboardPlayers } =
    compileBillboardItems(frame, session, viewport);

  // 2. Compile Zones & Drawing Preview
  const zones = compileZones(frame, session, viewport);
  const drawingPreview = compileDrawingPreview(session, viewport);

  // 3. Compile Connect Lines & Arrows
  const connectLines = compileConnectLines(
    billboardPlayers,
    resolvedPlayersMap,
    scale,
  );
  const arrows = compileArrows(frame, session, viewport, resolvedPlayersMap);

  // 4. Trajectories (empty placeholder for Phase 2)
  const trajectories: readonly ResolvedTrajectoryPrimitive[] = [];

  return {
    viewport,
    zones,
    connectLines,
    trajectories,
    arrows,
    billboardItems,
    drawingPreview,
  };
}
