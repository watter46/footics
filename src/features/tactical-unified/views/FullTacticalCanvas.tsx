'use client';

import {
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';
import {
  type CanvasCoreHandle,
  type CanvasNodesRegistry,
  CanvasStageContainer,
  createCanvasNodesRegistry,
  PlayerPhotoProvider,
  usePlayerPhotoContext,
} from '@/features/tactical-unified/core';
import '@/features/tactical-unified/components/hud/ball-hud';
import { usePlayerPhotoRegistry } from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { DrawingToolbar } from '@/features/tactical-unified/panels/toolbar/drawing-toolbar';
import { selectDomainActivePhaseSlides } from '@/features/tactical-unified/stores/domain-selectors';
import {
  TacticalStoreProvider,
  TacticalStoresContext,
  useDocumentStore,
  usePlaybackStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';

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
  const resolvedImageAspect = imageAspect ?? 16 / 9;

  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const setStageAspect = useSessionStore((s) => s.setStageAspect);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const isExporting = useSessionStore((s) => s.isExporting);

  // アクティブフェーズの全スライドの選手写真を一括事前解決・キャッシュ
  // 親コンテキストに写真マップが存在する場合は重複ロードを防ぐため空配列を渡し、単体マウント時のみ自前解決
  const activeSlides = useDocumentStore((s) =>
    selectDomainActivePhaseSlides(s.project, activePhaseId),
  );
  const allPhasePlayers = useMemo(
    () => activeSlides.flatMap((s) => s.players ?? []),
    [activeSlides],
  );
  const parentPhotos = usePlayerPhotoContext();
  const fallbackPhotos = usePlayerPhotoRegistry(
    parentPhotos ? [] : allPhasePlayers,
  );
  const playerPhotos = parentPhotos ?? fallbackPhotos;

  const nodesRegistryRef = useRef<CanvasNodesRegistry>(
    createCanvasNodesRegistry(),
  );

  const resolvedToolbar = toolbar ?? <DrawingToolbar />;
  const handleStageSizeChange = useCallback(
    (size: { width: number; height: number }) =>
      setStageAspect(size.width / size.height),
    [setStageAspect],
  );

  return (
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
