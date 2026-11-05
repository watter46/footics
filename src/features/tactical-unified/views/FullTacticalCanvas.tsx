'use client';

import {
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { createTacticalCanvasStoreAdapter } from '@/features/tactical-unified/adapters/tactical-canvas-store-adapter';
import {
  type CanvasCoreHandle,
  type CanvasNodesRegistry,
  CanvasStageContainer,
  CanvasStoreProvider,
  createCanvasNodesRegistry,
  PlayerPhotoProvider,
  usePlayerPhotoContext,
} from '@/features/tactical-unified/core';
import { useTacticalAnimation } from '@/features/tactical-unified/hooks/use-tactical-animation';
import { usePlayerPhotoRegistry } from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { DrawingToolbar } from '@/features/tactical-unified/panels/toolbar/drawing-toolbar';
import {
  selectActivePhaseAspectRatio,
  selectActivePhaseBoundaryBox,
  selectActivePhaseSlides,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import {
  useTacticalUnifiedStoreApi,
  useTacticalUnifiedStoreContext,
} from '@/features/tactical-unified/stores/tactical-unified-store-provider';

export interface FullTacticalCanvasProps {
  className?: string;
  imageAspect?: number;
  toolbar?: ReactNode;
  ref?: Ref<CanvasCoreHandle>;
}

export function FullTacticalCanvas({
  className = '',
  imageAspect,
  toolbar,
  ref,
}: FullTacticalCanvasProps) {
  const storeApi = useTacticalUnifiedStoreApi();

  // 16:9 固定スクリーン。アクティブフェーズの設定をセレクタ経由で取得
  const _activePhaseAspectRatio = useTacticalUnifiedStoreContext(
    selectActivePhaseAspectRatio,
  );
  const _activePhaseBoundaryBox = useTacticalUnifiedStoreContext(
    selectActivePhaseBoundaryBox,
  );
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

  // マスターストア（storeApi）を唯一の真実源としてアダプター経由で接続
  const canvasStore = useMemo(() => {
    return createTacticalCanvasStoreAdapter(storeApi);
  }, [storeApi]);

  // 再生配線: レジストリを親で保持して core に注入し、アニメーション hook と共有
  const nodesRegistryRef = useRef<CanvasNodesRegistry>(
    createCanvasNodesRegistry(),
  );
  const { playAnimation, pauseAnimation, stopAnimation } = useTacticalAnimation(
    { nodesRegistryRef },
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
    if (isPlaying && !wasPlayingRef.current) {
      wasPlayingRef.current = true;
      playRef.current(stopPlayback);
    } else if (!isPlaying && wasPlayingRef.current) {
      wasPlayingRef.current = false;
      pauseRef.current();
    }
  }, [isPlaying, stopPlayback]);

  // unmount: RAF 停止 + isPlaying=false
  useEffect(() => {
    return () => {
      if (wasPlayingRef.current) {
        wasPlayingRef.current = false;
        stopRef.current();
      }
      storeApi.getState().setIsPlaying(false);
    };
  }, [storeApi]);

  const resolvedToolbar = toolbar ?? <DrawingToolbar />;

  // Stage 実サイズをストアへ通知（ピッチ矩形写像用。座標系自体は変更しない）
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
