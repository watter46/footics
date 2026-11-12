import { describe, expect, it } from 'vitest';
import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import type { EphemeralSessionState } from '@/lib/tactical/compiler/scene-graph-dto';
import {
  computeBillboardDepthKey,
  projectStagePixelWithPitchTransform,
} from '@/lib/tactical/engine/projection-3d';
import { evaluateStaticSlideFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  toScreenNormCoord,
  toScreenNormPoint,
  toStagePixelPoint,
} from '@/lib/types/tactical/branded';
import type {
  DomainPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

function createBaseSlide(overrides?: Partial<DomainSlide>): DomainSlide {
  const p1: PitchPlayer = {
    id: 'p1',
    area: 'pitch',
    team: 'home',
    x: toScreenNormCoord(20),
    y: toScreenNormCoord(50),
    style: {
      markerType: 'circle',
      insideContent: 'number',
      bottomLabel: 'name',
      color: '#034694',
      strokeColor: '#ffffff',
      strokeWidth: 2,
      sizeScale: 1.0,
      numberSizeScale: 1.0,
      labelSizeScale: 1.0,
    },
    connectLines: [],
    badges: [],
  };

  return {
    id: 'slide-1',
    index: 0,
    players: [p1],
    arrows: [],
    zones: [],
    texts: [],
    ball: {
      x: toScreenNormCoord(50),
      y: toScreenNormCoord(50),
      visible: true,
    },
    transitionDurationMs: 1000,
    pauseMs: 500,
    easing: 'linear',
    ...overrides,
  };
}

describe('Scene Compiler Phase 1 Tests', () => {
  const viewport = { width: 1000, height: 800 };

  it('1. compiles visionCone correctly', () => {
    const slide = createBaseSlide();
    const p1 = slide.players[0] as PitchPlayer;
    (p1 as { visionCone?: unknown }).visionCone = {
      id: 'cone-1',
      radius: 20,
      angleRad: 0,
      spreadRad: 1.0,
      color: '#38bdf8',
      opacity: 0.3,
      visible: true,
    };

    const frame = evaluateStaticSlideFrame(slide);
    const scene = compileSceneGraph(frame, null, viewport);

    const playerItem = scene.billboardItems.find(
      (item) => item.kind === 'player' && item.id === 'p1',
    );
    expect(playerItem).toBeDefined();
    if (playerItem && playerItem.kind === 'player') {
      expect(playerItem.visionCone).toBeDefined();
      expect(playerItem.visionCone?.radiusPx).toBe(160); // 0.20 * Math.min(1000, 800) = 160
      expect(playerItem.visionCone?.angleRad).toBe(0);
      expect(playerItem.visionCone?.spreadRad).toBe(1.0);
      expect(playerItem.visionCone?.color).toBe('#38bdf8');
      expect(playerItem.visionCone?.opacity).toBe(0.3);
      expect(playerItem.visionCone?.visible).toBe(true);
    }
  });

  it('2. compiles focus correctly', () => {
    const slide = createBaseSlide();
    const p1 = slide.players[0] as PitchPlayer;
    (p1 as { focus?: unknown }).focus = {
      enabled: true,
      color: '#ffffff',
      radius: 3,
      opacity: 0.4,
      style: 'spotlight',
    };

    const frame = evaluateStaticSlideFrame(slide);
    const scene = compileSceneGraph(frame, null, viewport);

    const playerItem = scene.billboardItems.find(
      (item) => item.kind === 'player' && item.id === 'p1',
    );
    expect(playerItem).toBeDefined();
    if (playerItem && playerItem.kind === 'player') {
      expect(playerItem.focus).toBeDefined();
      expect(playerItem.focus?.radiusPx).toBe(playerItem.radiusPx * 3);
      expect(playerItem.focus?.color).toBe('#ffffff');
      expect(playerItem.focus?.opacity).toBe(0.4);
      expect(playerItem.focus?.style).toBe('spotlight');
    }
  });

  it('3. applies activeDragDelta to ball and text', () => {
    const slide = createBaseSlide({
      texts: [
        {
          id: 'txt-1',
          annotationType: 'text',
          x: toScreenNormCoord(20),
          y: toScreenNormCoord(30),
          content: 'Label',
          fontSize: 16,
          color: '#ffffff',
          bold: false,
          italic: false,
        },
      ],
      ball: {
        x: toScreenNormCoord(50),
        y: toScreenNormCoord(50),
        visible: true,
      },
    });

    const session: EphemeralSessionState = {
      activePhaseId: 'phase-1',
      activeSlideId: 'slide-1',
      selectedIds: ['ball', 'txt-1'],
      activeDragDelta: {
        entityIds: ['ball', 'txt-1'],
        deltaScreenNormX: 10,
        deltaScreenNormY: -5,
      },
    };

    const frame = evaluateStaticSlideFrame(slide);
    const scene = compileSceneGraph(frame, session, viewport);

    const ballItem = scene.billboardItems.find((item) => item.kind === 'ball');
    expect(ballItem).toBeDefined();
    expect(ballItem?.positionPx).toEqual({ x: 600, y: 360 }); // 60% of 1000, 45% of 800

    const textItem = scene.billboardItems.find(
      (item) => item.kind === 'text' && item.id === 'txt-1',
    );
    expect(textItem).toBeDefined();
    expect(textItem?.positionPx).toEqual({ x: 300, y: 200 }); // 30% of 1000, 25% of 800
  });

  it('4. compiles trajectories from prevSlide', () => {
    const prevSlide = createBaseSlide({
      id: 'slide-0',
      index: 0,
      players: [
        {
          ...(createBaseSlide().players[0] as PitchPlayer),
          x: toScreenNormCoord(20),
          y: toScreenNormCoord(50),
        },
      ],
    });

    const currSlide = createBaseSlide({
      id: 'slide-1',
      index: 1,
      players: [
        {
          ...(createBaseSlide().players[0] as PitchPlayer),
          x: toScreenNormCoord(50),
          y: toScreenNormCoord(50),
          trajectoryEffect: {
            enabled: true,
            lineStyle: 'dashed',
            color: '#f59e0b',
            exitAction: 'keep',
          },
        },
      ],
    });

    const frame = evaluateStaticSlideFrame(currSlide);
    const scene = compileSceneGraph(frame, null, viewport, prevSlide);

    expect(scene.trajectories).toHaveLength(1);
    const traj = scene.trajectories[0];
    expect(traj.playerId).toBe('p1');
    expect(traj.flatPointsPx).toEqual([200, 400, 500, 400]);
    expect(traj.dashArrayPx).toEqual([6, 4]);
    expect(traj.color).toBe('#f59e0b');
    expect(traj.visible).toBe(true);
  });

  it('5. projects stage pixels with pitchTransform and computes tilt depth key', () => {
    const pt = toStagePixelPoint(500, 400); // Center in 1000x800
    const projectedCenter = projectStagePixelWithPitchTransform(pt, viewport, {
      zoom: 1.5,
      panX: 0,
      panY: 0,
      tilt: 45,
      isLocked: false,
    });
    // Center stays at center
    expect(projectedCenter.x).toBeCloseTo(500, 1);
    expect(projectedCenter.y).toBeCloseTo(400, 1);

    const offCenter = toStagePixelPoint(600, 500);
    const projectedOffCenter = projectStagePixelWithPitchTransform(
      offCenter,
      viewport,
      {
        zoom: 2,
        panX: 10,
        panY: 10,
        tilt: 30,
        isLocked: false,
      },
    );
    expect(projectedOffCenter.x).not.toBe(600);
    expect(projectedOffCenter.y).not.toBe(500);

    const depthTilt0 = computeBillboardDepthKey(pt, 'player', 0);
    const depthTilt60 = computeBillboardDepthKey(pt, 'player', 60);
    expect(depthTilt60).toBeLessThan(depthTilt0);
  });

  it('6. projects zones, arrows, and billboard items uniformly when slide.pitchTransform is set', () => {
    const pitchTransform = {
      zoom: 2,
      panX: 10,
      panY: -10,
      tilt: 20,
      isLocked: false,
    };
    const slide = createBaseSlide({
      pitchTransform,
      zones: [
        {
          id: 'z-poly',
          annotationType: 'zone',
          zoneType: 'generic',
          shapeType: 'polygon',
          points: [
            toScreenNormPoint(20, 50, false),
            toScreenNormPoint(40, 50, false),
            toScreenNormPoint(30, 70, false),
          ],
          color: '#22c55e',
          opacity: 0.3,
          strokeColor: '#22c55e',
          strokeOpacity: 0.8,
          strokeWidth: 2,
        },
      ],
      arrows: [
        {
          id: 'a-1',
          annotationType: 'arrow',
          arrowType: 'pass',
          curveType: 'straight',
          points: [
            toScreenNormPoint(20, 50, false),
            toScreenNormPoint(80, 50, false),
          ],
          color: '#ffffff',
          strokeWidth: 3,
          dashArray: [],
          startMarker: 'none',
          endMarker: 'arrow',
        },
      ],
    });

    const frame = evaluateStaticSlideFrame(slide);
    const scene = compileSceneGraph(frame, null, viewport);

    const expectedP1 = projectStagePixelWithPitchTransform(
      toStagePixelPoint(200, 400),
      viewport,
      pitchTransform,
    );

    const playerItem = scene.billboardItems.find(
      (item) => item.kind === 'player' && item.id === 'p1',
    );
    expect(playerItem?.positionPx.x).toBeCloseTo(expectedP1.x, 2);
    expect(playerItem?.positionPx.y).toBeCloseTo(expectedP1.y, 2);

    // Zone first vertex is also at (20%, 50%) -> must match player positionPx exactly!
    const zoneDto = scene.zones[0];
    expect(zoneDto.flatPointsPx?.[0]).toBeCloseTo(expectedP1.x, 2);
    expect(zoneDto.flatPointsPx?.[1]).toBeCloseTo(expectedP1.y, 2);

    // Arrow start is also at (20%, 50%) -> must match player positionPx!
    const arrowDto = scene.arrows[0];
    expect(arrowDto.flatPointsPx[0]).toBeCloseTo(expectedP1.x, 2);
    expect(arrowDto.flatPointsPx[1]).toBeCloseTo(expectedP1.y, 2);
  });
});
