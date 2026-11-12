'use client';

import {
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  type CanvasCoreHandle,
  type CanvasNodesRegistry,
  CanvasStageContainer,
  CanvasStoreProvider,
  createCanvasNodesRegistry,
  createCanvasStore,
  PlayerPhotoProvider,
  usePlayerPhotoContext,
} from '@/features/tactical-unified/core';
import type {
  CanvasStore,
  SelectedObject,
  SelectedObjectKind,
} from '@/features/tactical-unified/core/types';
import '@/features/tactical-unified/components/hud/ball-hud';
import { useTacticalAnimation } from '@/features/tactical-unified/hooks/use-tactical-animation';
import { usePlayerPhotoRegistry } from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { DrawingToolbar } from '@/features/tactical-unified/panels/toolbar/drawing-toolbar';
import {
  TacticalStoreProvider,
  TacticalStoresContext,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { selectActivePhaseSlides } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import {
  useTacticalUnifiedStoreApi,
  useTacticalUnifiedStoreContext,
} from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import type { EvaluatedTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import type {
  ArrowAnnotation,
  DrawingTool,
  Player,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';

export interface FullTacticalCanvasProps {
  className?: string;
  imageAspect?: number;
  toolbar?: ReactNode;
  ref?: Ref<CanvasCoreHandle>;
}

function FullTacticalCanvasInner({
  className = '',
  imageAspect,
  toolbar,
  ref,
}: FullTacticalCanvasProps) {
  const storeApi = useTacticalUnifiedStoreApi();
  const { documentStore, sessionStore, playbackStore } =
    useTacticalStoresContext();
  const resolvedImageAspect = imageAspect ?? 16 / 9;

  // アクティブフェーズの全スライドの選手写真を一括事前解決・キャッシュ
  // 親コンテキストに写真マップが存在する場合は重複ロードを防ぐため空配列を渡し、単体マウント時のみ自前解決
  const activeSlides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const allPhasePlayers = useMemo(
    () => activeSlides.flatMap((s) => s.players ?? []),
    [activeSlides],
  );
  const parentPhotos = usePlayerPhotoContext();
  const fallbackPhotos = usePlayerPhotoRegistry(
    parentPhotos ? [] : allPhasePlayers,
  );
  const playerPhotos = parentPhotos ?? fallbackPhotos;

  // Canvas 専用ストアを初期化し、TacticalUnifiedStore へアクションを委譲
  const canvasStore = useMemo(() => {
    const store = createCanvasStore({ mode: 'tactical-board' });
    const s = () => storeApi.getState();

    store.setState({
      updateMarker: (id, patch) =>
        s().updatePlayer(s().activeSlideId, id, patch),
      updateMarkers: (updates) => s().updatePlayers(s().activeSlideId, updates),
      updateArrow: (id, patch) => s().updateArrow(s().activeSlideId, id, patch),
      updateZone: (id, patch) => s().updateZone(s().activeSlideId, id, patch),
      updateText: (id, patch) => s().updateText(s().activeSlideId, id, patch),
      addArrow: (arrow) => s().addArrow(s().activeSlideId, arrow),
      addZone: (zone) => s().addZone(s().activeSlideId, zone),
      addText: (text) => s().addText(s().activeSlideId, text),
      selectObject: (target, isShiftOrMulti) => {
        if (!target) return s().selectObject(null);
        if (typeof target !== 'string')
          return s().selectObject(target, isShiftOrMulti);
        const p =
          s().project.phases.find((x) => x.id === s().activePhaseId) ??
          s().project.phases[0];
        const sl =
          p?.slides.find((x) => x.id === s().activeSlideId) ?? p?.slides[0];
        const kind: SelectedObjectKind =
          target === 'ball'
            ? 'ball'
            : sl?.arrows.some((a) => a.id === target)
              ? 'arrow'
              : sl?.zones.some((z) => z.id === target)
                ? 'zone'
                : sl?.texts.some((t) => t.id === target)
                  ? 'text'
                  : 'player';
        s().selectObject({ id: target, kind }, isShiftOrMulti);
      },
      setActiveTool: (tool) => s().setActiveTool(tool),
      setPitchTransform: (patch) => {
        const cur = store.getState().pitchTransform;
        const next = typeof patch === 'function' ? patch(cur) : patch;
        s().updatePitchTransform(s().activeSlideId, next);
      },
      moveMarkerToBench: (id, x, y) =>
        s().movePlayerToBench(s().activeSlideId, id, x, y),
    });

    return store;
  }, [storeApi]);

  // TacticalUnifiedStore ⇄ canvasStore & documentStore & sessionStore & playbackStore の同期
  useEffect(() => {
    const syncState = (state: ReturnType<typeof storeApi.getState>) => {
      const activePhase =
        state.project.phases.find((p) => p.id === state.activePhaseId) ??
        state.project.phases[0];
      const activeSlides = activePhase?.slides ?? [];
      const activeSlide =
        activeSlides.find((s) => s.id === state.activeSlideId) ??
        activeSlides[0];

      canvasStore.setState({
        annotations: {
          markers: activeSlide?.players ?? [],
          arrows: activeSlide?.arrows ?? [],
          zones: activeSlide?.zones ?? [],
          texts: activeSlide?.texts ?? [],
        },
        ball: activeSlide?.ball ?? { x: 50, y: 50, visible: true },
        activeSlideId: activeSlide?.id,
        selectedIds: state.selectedObjects.map((o) => o.id),
        activeTool: state.activeTool,
        pitchTransform: activeSlide?.pitchTransform ?? {
          panX: 0,
          panY: 0,
          zoom: 1,
          tilt: 0,
          yaw: 90,
          isLocked: true,
        },
        aspectRatio: activePhase?.aspectRatio ?? '4:5',
        teamVisibility: state.teamVisibility ?? 'both',
        markerMode: state.markerMode,
        connectingPlayerId: state.connectingPlayerId,
      });

      try {
        const { project } = normalizeTacticalProject({
          ...state.project,
          phases: state.project.phases,
          activePhaseId: state.activePhaseId,
          activeSlideId: state.activeSlideId,
        });
        documentStore.getState().loadProject(project);
        sessionStore.getState().resetSession({
          activePhaseId: state.activePhaseId,
          activeSlideId: state.activeSlideId,
          activeTool: state.activeTool,
          selectedIds: state.selectedObjects.map((o) => o.id),
        });
      } catch {}

      if (state.isPlaying !== playbackStore.getState().isPlaying) {
        if (state.isPlaying) playbackStore.getState().startPlayback();
        else playbackStore.getState().pausePlayback();
      }
    };

    syncState(storeApi.getState());
    return storeApi.subscribe(syncState);
  }, [storeApi, canvasStore, documentStore, sessionStore, playbackStore]);

  // 再生フレームの canvasStore への反映
  const handleFrameEvaluated = useCallback(
    (evaluated: EvaluatedTimelineFrame) => {
      const sl = evaluated.slide;
      canvasStore.setState({
        annotations: {
          markers: sl.players.map((p) => ({
            ...p,
            connectLines: 'connectLines' in p ? p.connectLines : [],
            badges: 'badges' in p ? p.badges : [],
          })),
          arrows: sl.arrows.map((a) => ({
            ...a,
            arrowHead: true,
          })),
          zones: sl.zones.map((z) => ({
            ...z,
            points: 'points' in z ? z.points : [{ x: z.x, y: z.y }],
          })),
          texts: sl.texts.map((t) => ({ ...t })),
        },
        ball: sl.ball ?? { x: 50, y: 50, visible: true },
      });
    },
    [canvasStore],
  );

  // 再生配線: レジストリを親で保持して core に注入し、アニメーション hook と共有
  const nodesRegistryRef = useRef<CanvasNodesRegistry>(
    createCanvasNodesRegistry(),
  );
  const { playAnimation, pauseAnimation, stopAnimation } = useTacticalAnimation(
    {
      nodesRegistryRef,
      onFrameEvaluated: handleFrameEvaluated,
    },
  );
  const isPlaying = useTacticalUnifiedStoreContext((s) => s.isPlaying);
  const isExporting = useTacticalUnifiedStoreContext((s) => s.isExporting);
  const stopPlayback = useTacticalUnifiedStoreContext((s) => s.stopPlayback);

  const playRef = useRef(playAnimation);
  const pauseRef = useRef(pauseAnimation);
  const stopRef = useRef(stopAnimation);
  playRef.current = playAnimation;
  pauseRef.current = pauseAnimation;
  stopRef.current = stopAnimation;
  const wasPlayingRef = useRef(false);

  useEffect(() => {
    if (isPlaying !== wasPlayingRef.current) {
      wasPlayingRef.current = isPlaying;
      if (isPlaying) playRef.current(stopPlayback);
      else pauseRef.current();
    }
  }, [isPlaying, stopPlayback]);

  // unmount: RAF 停止 + isPlaying=false
  useEffect(
    () => () => {
      if (wasPlayingRef.current) {
        wasPlayingRef.current = false;
        stopRef.current();
      }
      storeApi.getState().setIsPlaying(false);
    },
    [storeApi],
  );

  const resolvedToolbar = toolbar ?? <DrawingToolbar />;
  const setStageAspect = useTacticalUnifiedStoreContext(
    (s) => s.setStageAspect,
  );
  const handleStageSizeChange = useCallback(
    (size: { width: number; height: number }) =>
      setStageAspect(size.width / size.height),
    [setStageAspect],
  );

  return (
    <CanvasStoreProvider store={canvasStore}>
      <PlayerPhotoProvider photos={playerPhotos}>
        <CanvasStageContainer
          ref={ref}
          className={className}
          imageAspect={resolvedImageAspect}
          nodesRegistryRef={nodesRegistryRef}
          onStageSizeChange={handleStageSizeChange}
          toolbar={resolvedToolbar}
          cleanRender={isPlaying || isExporting}
        />
      </PlayerPhotoProvider>
    </CanvasStoreProvider>
  );
}

export function FullTacticalCanvas(props: FullTacticalCanvasProps) {
  const tacticalStores = useContext(TacticalStoresContext);
  return tacticalStores ? (
    <FullTacticalCanvasInner {...props} />
  ) : (
    <TacticalStoreProvider>
      <FullTacticalCanvasInner {...props} />
    </TacticalStoreProvider>
  );
}
