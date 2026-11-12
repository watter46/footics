import { describe, expect, it, vi } from 'vitest';
import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import type {
  ResolvedBillboardPlayerItem,
  ResolvedSceneGraphDTO,
} from '@/lib/tactical/compiler/scene-graph-dto';
import { evaluateStaticSlideFrame } from '@/lib/tactical/engine/timeline-evaluator';
import { renderPlayerItem } from '@/lib/tactical/export/scene-graph-billboard-rasterizer';
import {
  type RasterizeSceneGraphOptions,
  rasterizeSceneGraphToCanvas2D,
} from '@/lib/tactical/export/scene-graph-canvas2d-rasterizer';
import {
  _resetSharedOffscreenCanvas,
  renderTacticalFrameToCanvas,
  renderTacticalPhaseFrameToCanvas,
} from '@/lib/tactical/export/tactical-frame-renderer';
import {
  toScreenNormCoord,
  toScreenNormPoint,
  toStagePixelPoint,
} from '@/lib/types/tactical/branded';
import type {
  DomainArrowAnnotation,
  DomainPlayer,
  DomainZoneAnnotation,
} from '@/lib/types/tactical/domain-entities';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';

function createMockCanvasContext() {
  const calls: { method: string; args: unknown[] }[] = [];
  const record = (method: string) =>
    vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
    });

  return {
    calls,
    save: record('save'),
    restore: record('restore'),
    beginPath: record('beginPath'),
    closePath: record('closePath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    stroke: record('stroke'),
    fill: record('fill'),
    arc: record('arc'),
    ellipse: record('ellipse'),
    rect: record('rect'),
    fillRect: record('fillRect'),
    strokeRect: record('strokeRect'),
    fillText: record('fillText'),
    strokeText: record('strokeText'),
    setLineDash: record('setLineDash'),
    drawImage: record('drawImage'),
    translate: record('translate'),
    rotate: record('rotate'),
    scale: record('scale'),
    clip: record('clip'),
    measureText: vi.fn(() => ({
      width: 20,
      actualBoundingBoxLeft: 10,
      actualBoundingBoxRight: 10,
    })),
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    globalAlpha: 1,
    lineDashOffset: 0,
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
  } as unknown as CanvasRenderingContext2D & {
    calls: { method: string; args: unknown[] }[];
  };
}

describe('rasterizeSceneGraphToCanvas2D (Dumb Rasterizer)', () => {
  const viewport = { width: 1000, height: 600 };

  function buildSampleSceneGraph(): ResolvedSceneGraphDTO {
    const p1: DomainPlayer = {
      id: 'p1',
      area: 'pitch',
      team: 'home',
      shirtNo: '10',
      name: 'Lionel Messi',
      x: toScreenNormCoord(10),
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

    const p2: DomainPlayer = {
      id: 'p2',
      area: 'pitch',
      team: 'away',
      shirtNo: '7',
      name: 'Cristiano Ronaldo',
      x: toScreenNormCoord(90),
      y: toScreenNormCoord(50),
      style: {
        markerType: 'circle',
        insideContent: 'number',
        bottomLabel: 'name',
        color: '#ef4444',
        strokeColor: '#ffffff',
        strokeWidth: 2,
        sizeScale: 1.0,
        numberSizeScale: 1.0,
        labelSizeScale: 1.0,
      },
      connectLines: [],
      badges: [],
    };

    const arrow: DomainArrowAnnotation = {
      id: 'a1',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [toScreenNormPoint(10, 50), toScreenNormPoint(90, 50)],
      color: '#ffffff',
      strokeWidth: 3,
      dashArray: [],
      startMarker: 'none',
      endMarker: 'arrow',
      sourcePlayerId: 'p1',
      targetPlayerId: 'p2',
    };

    const zone: DomainZoneAnnotation = {
      id: 'z1',
      annotationType: 'zone',
      zoneType: 'generic',
      shapeType: 'polygon',
      points: [
        toScreenNormPoint(20, 20),
        toScreenNormPoint(40, 20),
        toScreenNormPoint(30, 40),
      ],
      color: '#22c55e',
      opacity: 0.3,
      strokeColor: '#22c55e',
      strokeOpacity: 0.8,
      strokeWidth: 2,
    };

    const slide: DomainSlide = {
      id: 'slide-1',
      index: 0,
      players: [p1, p2],
      arrows: [arrow],
      zones: [zone],
      texts: [],
      ball: {
        x: toScreenNormCoord(50),
        y: toScreenNormCoord(50),
        visible: true,
      },
      transitionDurationMs: 1000,
      pauseMs: 500,
      easing: 'linear',
    };

    const frame = evaluateStaticSlideFrame(slide);
    return compileSceneGraph(frame, null, viewport);
  }

  it('renders primitives directly using flatPointsPx and positionPx without recalculating geometry', () => {
    const sceneGraph = buildSampleSceneGraph();
    const ctx = createMockCanvasContext();

    rasterizeSceneGraphToCanvas2D({
      ctx,
      sceneGraph,
    });

    // 1. Verify Polygon Zone coordinates match sceneGraph.zones[0].flatPointsPx exactly
    const zoneDto = sceneGraph.zones[0];
    expect(zoneDto).toBeDefined();
    expect(zoneDto.flatPointsPx).toBeDefined();
    const [zX0, zY0, zX1, zY1, zX2, zY2] = zoneDto.flatPointsPx!;

    expect(ctx.moveTo).toHaveBeenCalledWith(zX0, zY0);
    expect(ctx.lineTo).toHaveBeenCalledWith(zX1, zY1);
    expect(ctx.lineTo).toHaveBeenCalledWith(zX2, zY2);

    // 2. Verify Arrow coordinates match sceneGraph.arrows[0].flatPointsPx exactly
    const arrowDto = sceneGraph.arrows[0];
    expect(arrowDto).toBeDefined();
    expect(arrowDto.flatPointsPx.length).toBeGreaterThanOrEqual(4);
    const aStartX = arrowDto.flatPointsPx[0];
    const aStartY = arrowDto.flatPointsPx[1];
    const aEndX = arrowDto.flatPointsPx[arrowDto.flatPointsPx.length - 2];
    const aEndY = arrowDto.flatPointsPx[arrowDto.flatPointsPx.length - 1];

    expect(ctx.moveTo).toHaveBeenCalledWith(aStartX, aStartY);
    expect(ctx.lineTo).toHaveBeenCalledWith(aEndX, aEndY);

    // 3. Verify Billboard Players match sceneGraph.billboardItems positionPx
    const player1Item = sceneGraph.billboardItems.find(
      (
        item,
      ): item is import('@/lib/tactical/compiler/scene-graph-dto').ResolvedBillboardPlayerItem =>
        item.kind === 'player' && item.id === 'p1',
    );
    expect(player1Item).toBeDefined();
    expect(ctx.arc).toHaveBeenCalledWith(
      player1Item!.positionPx.x,
      player1Item!.positionPx.y,
      player1Item!.radiusPx,
      0,
      Math.PI * 2,
    );

    // 4. Verify Ball matches sceneGraph.billboardItems ball positionPx
    const ballItem = sceneGraph.billboardItems.find(
      (item) => item.kind === 'ball',
    );
    expect(ballItem).toBeDefined();

    // 5. Verify render ordering: zones -> arrows -> billboardItems
    const moveToIndexZone = ctx.calls.findIndex(
      (c) => c.method === 'moveTo' && c.args[0] === zX0 && c.args[1] === zY0,
    );
    const moveToIndexArrow = ctx.calls.findIndex(
      (c) =>
        c.method === 'moveTo' && c.args[0] === aStartX && c.args[1] === aStartY,
    );
    const arcIndexPlayer = ctx.calls.findIndex(
      (c) =>
        c.method === 'arc' &&
        c.args[0] === player1Item!.positionPx.x &&
        c.args[1] === player1Item!.positionPx.y,
    );

    expect(moveToIndexZone).toBeGreaterThan(-1);
    expect(moveToIndexArrow).toBeGreaterThan(moveToIndexZone);
    expect(arcIndexPlayer).toBeGreaterThan(moveToIndexArrow);
  });

  it('renders complete frame via renderTacticalPhaseFrameToCanvas pipeline', () => {
    const slide = buildSampleSceneGraph();
    const phase: DomainTacticalPhase = {
      id: 'phase-1',
      name: 'Build up',
      aspectRatio: '16:9',
      boundaryBox: { x: 0, y: 0, width: 100, height: 100, enabled: false },
      backgroundType: 'pitch',
      slides: [
        {
          id: 'slide-1',
          index: 0,
          players: [
            {
              id: 'p1',
              area: 'pitch',
              team: 'home',
              shirtNo: '10',
              name: 'Messi',
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
            },
          ],
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
        },
      ],
    };

    const ctx = createMockCanvasContext();
    renderTacticalPhaseFrameToCanvas({
      ctx,
      phase,
      timeMs: 0,
      width: 1920,
      height: 1080,
    });

    // Pitch draw (cached offscreen transfer)
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      1920,
      1080,
    );
    // Player arc & text
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith(
      '10',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('delegates to renderTacticalPhaseFrameToCanvas when phase is passed in renderTacticalFrameToCanvas', () => {
    const phase: DomainTacticalPhase = {
      id: 'phase-1',
      name: 'Build up',
      aspectRatio: '16:9',
      boundaryBox: { x: 0, y: 0, width: 100, height: 100, enabled: false },
      backgroundType: 'pitch',
      slides: [
        {
          id: 'slide-1',
          index: 0,
          players: [],
          arrows: [],
          zones: [],
          texts: [],
          ball: {
            x: toScreenNormCoord(50),
            y: toScreenNormCoord(50),
            visible: false,
          },
          transitionDurationMs: 1000,
          pauseMs: 500,
          easing: 'linear',
        },
      ],
    };

    const ctx = createMockCanvasContext();
    renderTacticalFrameToCanvas(ctx, {
      slides: [],
      phase,
      timeMs: 0,
      width: 1920,
      height: 1080,
      aspectRatio: '16:9',
    });

    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      1920,
      1080,
    );
  });

  it('renders player vision cone and focus in renderPlayerItem before marker body', () => {
    const ctx = createMockCanvasContext();
    const playerItem: ResolvedBillboardPlayerItem = {
      kind: 'player',
      id: 'p-focus',
      positionPx: toStagePixelPoint(200, 300),
      radiusPx: 18,
      depthSortKey: 300,
      opacity: 1,
      visible: true,
      selected: false,
      rippleRingsPx: [],
      focus: {
        enabled: true,
        color: '#ffffff',
        radiusPx: 54,
        opacity: 0.4,
        style: 'spotlight',
      },
      visionCone: {
        id: 'vc-1',
        radiusPx: 160,
        angleRad: 0,
        spreadRad: 1.0,
        color: '#38bdf8',
        opacity: 0.3,
        visible: true,
      },
      player: {
        id: 'p-focus',
        area: 'pitch',
        team: 'home',
        shirtNo: '10',
        name: 'Player',
        x: toScreenNormCoord(20),
        y: toScreenNormCoord(30),
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
      },
    };

    renderPlayerItem(ctx, playerItem);

    // Focus: arc at (200, 300) with radius 54
    expect(ctx.arc).toHaveBeenCalledWith(200, 300, 54, 0, Math.PI * 2);

    // Vision cone: moveTo(200, 300) -> arc with radius 160, angleRad - spreadRad / 2 (-0.5) to angleRad + spreadRad / 2 (0.5)
    expect(ctx.moveTo).toHaveBeenCalledWith(200, 300);
    expect(ctx.arc).toHaveBeenCalledWith(200, 300, 160, -0.5, 0.5);
  });

  it('caches pitch background across consecutive renderTacticalPhaseFrameToCanvas calls', () => {
    const phase: DomainTacticalPhase = {
      id: 'phase-cached',
      name: 'Build up',
      aspectRatio: '16:9',
      boundaryBox: { x: 0, y: 0, width: 100, height: 100, enabled: false },
      backgroundType: 'pitch',
      slides: [
        {
          id: 'slide-1',
          index: 0,
          players: [],
          arrows: [],
          zones: [],
          texts: [],
          ball: {
            x: toScreenNormCoord(50),
            y: toScreenNormCoord(50),
            visible: false,
          },
          transitionDurationMs: 1000,
          pauseMs: 500,
          easing: 'linear',
        },
      ],
    };

    const ctx1 = createMockCanvasContext();
    renderTacticalPhaseFrameToCanvas({
      ctx: ctx1,
      phase,
      timeMs: 0,
      width: 800,
      height: 600,
    });

    const ctx2 = createMockCanvasContext();
    renderTacticalPhaseFrameToCanvas({
      ctx: ctx2,
      phase,
      timeMs: 500,
      width: 800,
      height: 600,
    });

    // 2nd call should draw cached pitch canvas via drawImage
    expect(ctx2.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      800,
      600,
    );
  });

  it('filters out away team players when teamVisibility is "home"', () => {
    const phase: DomainTacticalPhase = {
      id: 'phase-visibility',
      name: 'Team Visibility Test',
      aspectRatio: '16:9',
      boundaryBox: { x: 0, y: 0, width: 100, height: 100, enabled: false },
      backgroundType: 'pitch',
      slides: [
        {
          id: 'slide-1',
          index: 0,
          players: [
            {
              id: 'p1',
              area: 'pitch',
              team: 'home',
              shirtNo: '10',
              name: 'Messi',
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
            },
            {
              id: 'p2',
              area: 'pitch',
              team: 'away',
              shirtNo: '7',
              name: 'Ronaldo',
              x: toScreenNormCoord(80),
              y: toScreenNormCoord(50),
              style: {
                markerType: 'circle',
                insideContent: 'number',
                bottomLabel: 'name',
                color: '#ef4444',
                strokeColor: '#ffffff',
                strokeWidth: 2,
                sizeScale: 1.0,
                numberSizeScale: 1.0,
                labelSizeScale: 1.0,
              },
              connectLines: [],
              badges: [],
            },
          ],
          arrows: [],
          zones: [],
          texts: [],
          ball: {
            x: toScreenNormCoord(50),
            y: toScreenNormCoord(50),
            visible: false,
          },
          transitionDurationMs: 1000,
          pauseMs: 500,
          easing: 'linear',
        },
      ],
    };

    const ctx = createMockCanvasContext();
    renderTacticalPhaseFrameToCanvas({
      ctx,
      phase,
      timeMs: 0,
      width: 1000,
      height: 600,
      teamVisibility: 'home',
    });

    expect(ctx.fillText).toHaveBeenCalledWith(
      '10',
      expect.any(Number),
      expect.any(Number),
    );
    expect(ctx.fillText).not.toHaveBeenCalledWith(
      '7',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('executes boundary cropping when boundaryBox is provided with phase in renderTacticalFrameToCanvas', () => {
    _resetSharedOffscreenCanvas();
    const offscreenCtx = createMockCanvasContext();
    const origCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string) => {
        if (tagName.toLowerCase() === 'canvas') {
          const mockC = origCreateElement('canvas');
          vi.spyOn(mockC, 'getContext').mockReturnValue(offscreenCtx as any);
          return mockC;
        }
        return origCreateElement(tagName);
      });

    const phase: DomainTacticalPhase = {
      id: 'phase-crop',
      name: 'Boundary Crop Test',
      aspectRatio: '16:9',
      boundaryBox: { x: 0, y: 0, width: 100, height: 100, enabled: false },
      backgroundType: 'pitch',
      slides: [
        {
          id: 'slide-1',
          index: 0,
          players: [],
          arrows: [],
          zones: [],
          texts: [],
          ball: {
            x: toScreenNormCoord(50),
            y: toScreenNormCoord(50),
            visible: false,
          },
          transitionDurationMs: 1000,
          pauseMs: 500,
          easing: 'linear',
        },
      ],
    };

    try {
      const ctx = createMockCanvasContext();
      renderTacticalFrameToCanvas(ctx, {
        slides: [],
        phase,
        timeMs: 0,
        width: 500,
        height: 300,
        aspectRatio: '16:9',
        boundaryBox: {
          x: 10,
          y: 10,
          width: 50,
          height: 50,
          enabled: true,
        },
      });

      // When boundaryBox is enabled and active, renderBoundaryCropSlice draws offscreen slice to ctx via drawImage
      // cropX = 10% * canonicalW, cropY = 10% * canonicalH
      expect(ctx.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        0,
        0,
        500,
        300,
      );
    } finally {
      createElementSpy.mockRestore();
      _resetSharedOffscreenCanvas();
    }
  });

  it('delegates to renderTacticalPhaseFrameToCanvas even when directorCamera is active', () => {
    const phase: DomainTacticalPhase = {
      id: 'phase-director',
      name: 'Director Camera Phase',
      aspectRatio: '16:9',
      boundaryBox: { x: 0, y: 0, width: 100, height: 100, enabled: false },
      backgroundType: 'pitch',
      slides: [
        {
          id: 'slide-1',
          index: 0,
          players: [
            {
              id: 'p1',
              area: 'pitch',
              team: 'home',
              shirtNo: '10',
              name: 'Messi',
              x: toScreenNormCoord(30),
              y: toScreenNormCoord(40),
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
            },
          ],
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
        },
      ],
    };

    const ctx = createMockCanvasContext();
    renderTacticalFrameToCanvas(ctx, {
      slides: [],
      phase,
      timeMs: 200,
      width: 1280,
      height: 720,
      aspectRatio: '16:9',
      directorCamera: {
        enabled: true,
        globalKeyframes: [
          {
            id: 'kf-1',
            timeMs: 0,
            tilt: 25,
            yaw: 90,
            easing: 'ease-in-out',
          },
        ],
        actionCues: [
          {
            id: 'cue-1',
            startTimeMs: 0,
            durationMs: 1000,
            zoom: 1.4,
            panX: 10,
            panY: -5,
            autoReturn: false,
          },
        ],
      },
      applyEffects: false,
    });

    // Cached offscreen pitch transfer + SceneGraph player render
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      1280,
      720,
    );
    expect(ctx.fillText).toHaveBeenCalledWith(
      '10',
      expect.any(Number),
      expect.any(Number),
    );
  });
});
