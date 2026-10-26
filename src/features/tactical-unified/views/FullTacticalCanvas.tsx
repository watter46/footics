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
} from '@/features/tactical-unified/core';
import { useTacticalAnimation } from '@/features/tactical-unified/hooks/use-tactical-animation';
import { DrawingToolbar } from '@/features/tactical-unified/panels/toolbar/drawing-toolbar';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { ASPECT_RATIOS } from '@/lib/types/tactical-unified';

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
  // 現在のアスペクト比をマスターストアから取得し、Stage 矩形をピッチ比率に完全一致させる
  const projectAspectRatio = useTacticalUnifiedStore(
    (s) => s.project.aspectRatio,
  );
  const activeSlideAspectRatio = useTacticalUnifiedStore((s) => {
    const slide = s.project.slides.find((sl) => sl.id === s.activeSlideId);
    return slide?.aspectRatio;
  });
  const currentAspect = activeSlideAspectRatio ?? projectAspectRatio ?? '4:5';
  const resolvedImageAspect =
    imageAspect ?? ASPECT_RATIOS[currentAspect] ?? 4 / 5;

  // マスターストア（useTacticalUnifiedStore）を唯一の真実源としてアダプター経由で接続
  const storeApi = useMemo(() => {
    return createTacticalCanvasStoreAdapter(useTacticalUnifiedStore);
  }, []);

  // 再生配線: レジストリを親で保持して core に注入し、アニメーション hook と共有
  const nodesRegistryRef = useRef<CanvasNodesRegistry>(
    createCanvasNodesRegistry(),
  );
  const { playAnimation, pauseAnimation, stopAnimation } = useTacticalAnimation(
    { nodesRegistryRef },
  );
  const isPlaying = useTacticalUnifiedStore((s) => s.isPlaying);
  const isExporting = useTacticalUnifiedStore((s) => s.isExporting);
  const stopPlayback = useTacticalUnifiedStore((s) => s.stopPlayback);

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
      useTacticalUnifiedStore.getState().setIsPlaying(false);
    };
  }, []);

  const resolvedToolbar = toolbar ?? <DrawingToolbar />;

  // Stage 実サイズをストアへ通知（ピッチ矩形写像用。座標系自体は変更しない）
  const setStageAspect = useTacticalUnifiedStore((s) => s.setStageAspect);
  const handleStageSizeChange = useCallback(
    (size: { width: number; height: number }) =>
      setStageAspect(size.width / size.height),
    [setStageAspect],
  );

  return (
    <CanvasStoreProvider store={storeApi}>
      <CanvasStageContainer
        ref={ref}
        className={className}
        imageAspect={resolvedImageAspect}
        nodesRegistryRef={nodesRegistryRef}
        onStageSizeChange={handleStageSizeChange}
        toolbar={resolvedToolbar}
        cleanRender={isPlaying || isExporting}
      />
    </CanvasStoreProvider>
  );
}
