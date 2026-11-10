import fs from 'node:fs';
import path from 'node:path';
import type Konva from 'konva';
import { describe, expect, it, vi } from 'vitest';
import type {
  ArrowNodeEntry,
  CanvasNodesRegistry,
} from '@/features/tactical-unified/core';
import type {
  InterpolatedArrowState,
  InterpolatedPlayerState,
  InterpolatedZoneState,
} from '@/lib/tactical/unified-interpolation';
import { createDefaultSlide } from '@/lib/types/tactical-unified';
import {
  updateArrowNodes,
  updatePlayerNodes,
  updateZoneNodes,
} from '../animation-node-updater';
import {
  calculatePitchDimensions,
  createTacticalTimeline,
  pausePlayback,
  renderFrameToCanvas,
  seekPlayback,
  stopPlayback,
} from '../tactical-animation-canvas';

describe('calculatePitchDimensions', () => {
  it('registry に pitchRect がある場合、pitchRect の width, height, x: 0, y: 0 を返す', () => {
    const mockStage = {
      width: () => 1000,
      height: () => 600,
    } as Konva.Stage;

    const registryRef = {
      current: {
        stage: mockStage,
        pitchRect: { x: 50, y: 30, width: 900, height: 540 },
      } as unknown as CanvasNodesRegistry,
    };

    const dims = calculatePitchDimensions(
      undefined,
      registryRef as unknown as React.MutableRefObject<CanvasNodesRegistry>,
    );
    expect(dims).toEqual({
      width: 900,
      height: 540,
      x: 0,
      y: 0,
    });
  });

  it('stage が registry にある場合、Stage の幅と高さをそのままピッチ実サイズ (x: 0, y: 0) として返す', () => {
    // 任意のStage寸法（レターボックス計算を通すと縮小されてしまうような値）
    const mockStage = {
      width: () => 1000,
      height: () => 600,
    } as Konva.Stage;

    const registryRef = {
      current: {
        stage: mockStage,
      } as CanvasNodesRegistry,
    };

    const dims = calculatePitchDimensions(undefined, registryRef);
    expect(dims).toEqual({
      width: 1000,
      height: 600,
      x: 0,
      y: 0,
    });
  });

  it('pitchSize が明示的に渡された場合、その寸法をそのまま返す', () => {
    const custom = { width: 640, height: 480, x: 10, y: 20 };
    const dims = calculatePitchDimensions(custom);
    expect(dims).toEqual({
      width: 640,
      height: 480,
      x: 10,
      y: 20,
    });
  });

  it('stage も pitchSize もない場合、デフォルトの 800x450 (x: 0, y: 0) を返す', () => {
    const dims = calculatePitchDimensions();
    expect(dims).toEqual({
      width: 800,
      height: 450,
      x: 0,
      y: 0,
    });
  });
});

describe('createTacticalTimeline (GSAP integration)', () => {
  const slide1 = createDefaultSlide(0, 'slide-1');
  slide1.transitionDurationMs = 1000;
  slide1.pauseMs = 500;
  const slide2 = createDefaultSlide(1, 'slide-2');
  slide2.transitionDurationMs = 1000;
  slide2.pauseMs = 500;
  const slides = [slide1, slide2];

  it('GSAP Timeline インスタンスを生成し、シーク時に onUpdate(timeMs) を呼び出す', () => {
    const onUpdate = vi.fn();
    const tl = createTacticalTimeline(slides, onUpdate);

    expect(tl).toBeDefined();
    expect(typeof tl.play).toBe('function');
    expect(typeof tl.pause).toBe('function');
    expect(typeof tl.seek).toBe('function');
    expect(typeof tl.kill).toBe('function');

    // Total duration: slide1 transition(1000) + pause(500) = 1500ms = 1.5s
    expect(tl.duration()).toBe(1.5);

    // シークテスト (0.75秒 = 750ms)
    tl.seek(0.75, false);
    expect(onUpdate).toHaveBeenCalledWith(expect.closeTo(750, 0));

    // クリーンアップ
    tl.kill();
  });

  it('loop: true の場合、タイムラインが repeat 設定される', () => {
    const onUpdate = vi.fn();
    const tl = createTacticalTimeline(slides, onUpdate, { loop: true });

    expect(tl.repeat()).toBe(-1);
    tl.kill();
  });

  it('スライド数が 0枚の場合、duration 0 のタイムラインを返す', () => {
    const onUpdate = vi.fn();
    const tl = createTacticalTimeline([], onUpdate);

    expect(tl.duration()).toBe(0);
    tl.kill();
  });

  it('スライド数が 1枚の場合、resolvePlaybackDurationMs に基づく duration のタイムラインを返す', () => {
    const onUpdate = vi.fn();
    const tl = createTacticalTimeline([slide1], onUpdate);

    // slide1: transitionDurationMs(1000) + pauseMs(500) = 1500ms = 1.5s
    expect(tl.duration()).toBe(1.5);
    tl.kill();
  });
});

describe('playback control helpers with GSAP Timeline', () => {
  it('pausePlayback pauses the timeline and sets isPlaying to false', () => {
    const mockPause = vi.fn();
    const mockSeek = vi.fn();
    const refs = {
      timelineRef: { current: { pause: mockPause, seek: mockSeek } as any },
      currentPlaybackTimeRef: { current: 500 },
      lastActiveSlideIndexRef: { current: 0 },
      lastPlaybackIndicesRef: {
        current: { slideIndex: 0, transitionIndex: null },
      },
    };
    const setIsPlaying = vi.fn();
    const applyFrameToCanvas = vi.fn();
    const setActiveSlide = vi.fn();

    const slide1 = createDefaultSlide(0, 'slide-1');
    slide1.transitionDurationMs = 1000;
    slide1.pauseMs = 500;
    const slide2 = createDefaultSlide(1, 'slide-2');
    const slides = [slide1, slide2];

    pausePlayback(refs, setIsPlaying, {
      slides,
      registry: undefined,
      pitchDimensions: { width: 800, height: 450 },
      applyFrameToCanvas,
      setActiveSlide,
    });

    expect(mockPause).toHaveBeenCalled();
    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expect(applyFrameToCanvas).toHaveBeenCalledWith(
      1000,
      undefined,
      800,
      450,
      true, // must be synchronous
      0,
      0,
    );
  });

  it('stopPlayback pauses timeline at 0, resets refs, and resets slide', () => {
    const mockPause = vi.fn();
    const refs = {
      timelineRef: { current: { pause: mockPause } as any },
      currentPlaybackTimeRef: { current: 500 },
      lastActiveSlideIndexRef: { current: 1 },
      lastPlaybackIndicesRef: {
        current: { slideIndex: 0, transitionIndex: null },
      },
    };
    const setIsPlaying = vi.fn();
    const setActiveSlide = vi.fn();
    const applyFrameToCanvas = vi.fn();

    stopPlayback({
      slides: [createDefaultSlide(0, 'slide-1')],
      refs,
      registry: undefined,
      pitchDimensions: { width: 800, height: 450 },
      applyFrameToCanvas,
      setIsPlaying,
      setActiveSlide,
    });

    expect(mockPause).toHaveBeenCalledWith(0);
    expect(refs.currentPlaybackTimeRef.current).toBe(0);
    expect(refs.lastActiveSlideIndexRef.current).toBe(0);
    expect(setIsPlaying).toHaveBeenCalledWith(false);
    expect(applyFrameToCanvas).toHaveBeenCalledWith(
      0,
      undefined,
      800,
      450,
      true,
      0,
      0,
    );
  });

  it('seekPlayback updates currentPlaybackTimeRef and seeks the timeline', () => {
    const mockSeek = vi.fn();
    const refs = {
      timelineRef: { current: { seek: mockSeek } as any },
      currentPlaybackTimeRef: { current: 0 },
      lastActiveSlideIndexRef: { current: 0 },
      lastPlaybackIndicesRef: {
        current: { slideIndex: 0, transitionIndex: null },
      },
    };
    const applyFrameToCanvas = vi.fn();

    seekPlayback({
      timeMs: 600,
      totalDurationMs: 1500,
      refs,
      registry: undefined,
      pitchDimensions: { width: 800, height: 450 },
      applyFrameToCanvas,
    });

    expect(refs.currentPlaybackTimeRef.current).toBe(600);
    expect(mockSeek).toHaveBeenCalledWith(0.6, false);
    expect(applyFrameToCanvas).toHaveBeenCalledWith(
      600,
      undefined,
      800,
      450,
      false,
      0,
      0,
    );
  });
});

describe('Phase 2: Animation node updaters (Zone pulse, Arrow dashOffset, Player trajectory)', () => {
  it('updateZoneNodes applies pulse opacity when effect is pulse', () => {
    const mockRect = {
      visible: vi.fn(),
      opacity: vi.fn(),
      position: vi.fn(),
      width: vi.fn(),
      height: vi.fn(),
      offsetX: vi.fn(),
      offsetY: vi.fn(),
      rotation: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      strokeWidth: vi.fn(),
    } as unknown as Konva.Rect;

    const registry = {
      zoneNodes: new Map([['zone-1', mockRect]]),
    } as unknown as CanvasNodesRegistry;

    const zoneState: InterpolatedZoneState = {
      id: 'zone-1',
      zoneType: 'generic',
      shapeType: 'rect',
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      color: '#22c55e',
      opacity: 0.25,
      strokeWidth: 2,
      points: [],
      visible: true,
      effect: {
        type: 'pulse',
        duration: 1.0,
        minOpacity: 0.1,
        maxOpacity: 0.5,
      },
    };

    // t=0s: minOpacity (0.1) -> 0.1 * 255 ≈ 26 (0x1a)
    updateZoneNodes({ 'zone-1': zoneState }, registry, 800, 450, 0, 0, 0);
    expect(mockRect.fill).toHaveBeenCalledWith('#22c55e1a');

    // t=500ms (0.5s): maxOpacity (0.5) -> 0.5 * 255 ≈ 128 (0x80)
    updateZoneNodes({ 'zone-1': zoneState }, registry, 800, 450, 0, 0, 500);
    expect(mockRect.fill).toHaveBeenCalledWith('#22c55e80');
  });

  it('updateArrowNodes updates dashOffset on Konva node when aState.dashOffset is present', () => {
    const mockArrow = {
      points: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      strokeWidth: vi.fn(),
      opacity: vi.fn(),
      visible: vi.fn(),
      dash: vi.fn(),
      dashOffset: vi.fn(),
    } as unknown as Konva.Arrow;

    const registry = {
      arrowNodes: new Map<string, ArrowNodeEntry>([
        ['arrow-1', { node: mockArrow }],
      ]),
    } as unknown as CanvasNodesRegistry;

    const arrowState: InterpolatedArrowState & { dashOffset?: number } = {
      id: 'arrow-1',
      arrowType: 'generic',
      curveType: 'straight',
      points: [
        { x: 10, y: 10 },
        { x: 30, y: 30 },
      ],
      color: '#ffffff',
      strokeWidth: 3,
      opacity: 1,
      visible: true,
      dashOffset: -35,
    };

    updateArrowNodes({ 'arrow-1': arrowState }, registry, 800, 450);
    expect(mockArrow.dashOffset).toHaveBeenCalledWith(-35);
  });

  it('updatePlayerNodes creates and updates trajectory nodes when trajectoryEffect.enabled and moving', () => {
    const createdNodes: any[] = [];
    const mockPlayerGroup = {
      position: vi.fn(),
      opacity: vi.fn(),
      visible: vi.fn(),
      findOne: vi.fn().mockReturnValue(null),
      add: vi.fn((node: any) => {
        createdNodes.push(node);
      }),
      find: vi.fn().mockReturnValue([]),
    } as unknown as Konva.Group;

    const registry = {
      playerNodes: new Map([['p-1', mockPlayerGroup]]),
    } as unknown as CanvasNodesRegistry;

    const playerState: InterpolatedPlayerState = {
      id: 'p-1',
      x: 30, // currently at 30% (moved from 10%)
      y: 40,
      opacity: 1,
      visible: true,
      team: 'home',
      area: 'pitch',
      connectLines: [],
      badges: [],
      style: {
        markerType: 'circle',
        insideContent: 'number',
        bottomLabel: 'name',
        color: '#ff0000',
        strokeColor: '#ffffff',
        strokeWidth: 2,
        sizeScale: 1,
        numberSizeScale: 1,
        labelSizeScale: 1,
      },
      startPos: { x: 10, y: 20 },
      trajectoryEffect: {
        enabled: true,
        lineStyle: 'dashed',
        color: '#00ff00',
        exitAction: 'keep',
      },
    };

    updatePlayerNodes(
      { 'p-1': playerState },
      registry,
      1000,
      500,
      0,
      0,
      500,
      true, // isPlaying
    );

    // 始点マーカーと軌跡ラインが playerGroup に追加されること
    expect(mockPlayerGroup.add).toHaveBeenCalledTimes(2);
    const marker = createdNodes.find(
      (n) => n.name() === 'trajectory-start-marker',
    );
    const line = createdNodes.find((n) => n.name() === 'trajectory-line');
    expect(marker).toBeDefined();
    expect(line).toBeDefined();
    expect(line.dash()).toEqual([6, 4]);
    expect(line.stroke()).toBe('#00ff00');
  });

  describe('Turbopack HMR & Clean Module Imports (TASK-175)', () => {
    it('tactical-timeline.ts starts with use client directive', () => {
      const filePath = path.resolve(__dirname, '../tactical-timeline.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(
        content.startsWith("'use client';") ||
          content.startsWith('"use client";'),
      ).toBe(true);
    });

    it('tactical-playback-controls.ts imports AnimationPlaybackRefs directly from ./tactical-timeline to avoid circular dependencies', () => {
      const filePath = path.resolve(
        __dirname,
        '../tactical-playback-controls.ts',
      );
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain("from './tactical-timeline'");
      expect(content).not.toContain("from './tactical-animation-canvas'");
    });

    it('use-tactical-animation.ts directly imports from tactical-timeline and tactical-playback-controls', () => {
      const filePath = path.resolve(__dirname, '../use-tactical-animation.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain("from './tactical-timeline'");
      expect(content).toContain("from './tactical-playback-controls'");
    });

    it('timeline-bar.tsx directly imports getSlideSnapTime from tactical-playback-controls', () => {
      const filePath = path.resolve(
        __dirname,
        '../../panels/timeline/timeline-bar.tsx',
      );
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain(
        "from '@/features/tactical-unified/hooks/tactical-playback-controls'",
      );
      expect(content).not.toContain(
        "from '@/features/tactical-unified/hooks/tactical-animation-canvas'",
      );
    });
  });

  describe('renderFrameToCanvas - React re-render optimization during playback', () => {
    it('isPlaying === true の状態でスライド遷移境界を越えたとき、setActiveSlide は呼ばれず setPlaybackIndices のみ呼ばれる', () => {
      const slide1 = createDefaultSlide(0, 'slide-1');
      slide1.transitionDurationMs = 1000;
      slide1.pauseMs = 500;
      const slide2 = createDefaultSlide(1, 'slide-2');
      slide2.transitionDurationMs = 1000;
      slide2.pauseMs = 500;

      const setPlaybackIndicesMock = vi.fn();
      const mockStoreApi = {
        getState: () => ({
          project: {
            activePhaseId: 'phase-1',
            phases: [{ id: 'phase-1', slides: [slide1, slide2] }],
          },
          activeSlideId: 'slide-1',
          isPlaying: true,
          setPlaybackIndices: setPlaybackIndicesMock,
        }),
      } as any;

      const lastActiveSlideIndexRef = { current: 0 };
      const lastPlaybackIndicesRef = {
        current: { slideIndex: 0, transitionIndex: null },
      };
      const setActiveSlide = vi.fn();

      const mockRegistry = {
        playerNodes: new Map(),
        arrowNodes: new Map(),
        zoneNodes: new Map(),
        textNodes: new Map(),
        playerLayer: { batchDraw: vi.fn() },
        ballLayer: { batchDraw: vi.fn() },
        annotationLayer: { batchDraw: vi.fn() },
      } as any;

      // 1500ms: Slide 0 から Slide 1 のポーズ区間へ突入 (currentSlideIndex === 1)
      renderFrameToCanvas(
        1500,
        mockRegistry,
        800,
        450,
        lastActiveSlideIndexRef,
        setActiveSlide,
        false,
        0,
        0,
        lastPlaybackIndicesRef,
        mockStoreApi,
      );

      expect(setActiveSlide).not.toHaveBeenCalled();
      expect(setPlaybackIndicesMock).toHaveBeenCalledWith(1, null);
    });

    it('isPlaying === false (シーク操作時) にスライド遷移境界を越えたとき、setActiveSlide が呼ばれる', () => {
      const slide1 = createDefaultSlide(0, 'slide-1');
      slide1.transitionDurationMs = 1000;
      slide1.pauseMs = 500;
      const slide2 = createDefaultSlide(1, 'slide-2');
      slide2.transitionDurationMs = 1000;
      slide2.pauseMs = 500;

      const setPlaybackIndicesMock = vi.fn();
      const mockStoreApi = {
        getState: () => ({
          project: {
            activePhaseId: 'phase-1',
            phases: [{ id: 'phase-1', slides: [slide1, slide2] }],
          },
          activeSlideId: 'slide-1',
          isPlaying: false,
          setPlaybackIndices: setPlaybackIndicesMock,
        }),
      } as any;

      const lastActiveSlideIndexRef = { current: 0 };
      const lastPlaybackIndicesRef = {
        current: { slideIndex: 0, transitionIndex: null },
      };
      const setActiveSlide = vi.fn();

      const mockRegistry = {
        playerNodes: new Map(),
        arrowNodes: new Map(),
        zoneNodes: new Map(),
        textNodes: new Map(),
        playerLayer: { batchDraw: vi.fn() },
        ballLayer: { batchDraw: vi.fn() },
        annotationLayer: { batchDraw: vi.fn() },
      } as any;

      // 1500ms: Slide 0 から Slide 1 のポーズ区間へ突入 (currentSlideIndex === 1)
      renderFrameToCanvas(
        1500,
        mockRegistry,
        800,
        450,
        lastActiveSlideIndexRef,
        setActiveSlide,
        false,
        0,
        0,
        lastPlaybackIndicesRef,
        mockStoreApi,
      );

      expect(setActiveSlide).toHaveBeenCalledWith('slide-2');
    });
  });
});
