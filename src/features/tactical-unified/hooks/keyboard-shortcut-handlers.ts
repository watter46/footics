/**
 * keyboard-shortcut-handlers.ts
 * Pure-ish action handlers for tactical board keyboard shortcuts.
 */

import { toast } from 'sonner';
import { getSlideSnapTime } from '@/features/tactical-unified/hooks/tactical-playback-controls';
import {
  selectDomainActivePhaseSlides,
  selectDomainActiveSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import type { useTacticalStoresContext } from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  cloneAndOffsetClipboard,
  extractSelectedObjects,
} from '@/lib/tactical/domain/clipboard';

export type ShortcutStores = ReturnType<typeof useTacticalStoresContext>;

const OBJECT_KIND_TO_COLLECTION: Record<
  string,
  'players' | 'arrows' | 'zones' | 'texts'
> = {
  player: 'players',
  arrow: 'arrows',
  zone: 'zones',
  text: 'texts',
};

function isClipboardEmpty(clipboard: {
  players: readonly unknown[];
  arrows: readonly unknown[];
  zones: readonly unknown[];
  texts: readonly unknown[];
}): boolean {
  return (
    clipboard.players.length === 0 &&
    clipboard.arrows.length === 0 &&
    clipboard.zones.length === 0 &&
    clipboard.texts.length === 0
  );
}

export function handleCopyObjects({
  documentStore,
  sessionStore,
}: ShortcutStores): void {
  const { activePhaseId, activeSlideId, selectedObjects } =
    sessionStore.getState();
  if (selectedObjects.length === 0) return;
  const slide = selectDomainActiveSlide(
    documentStore.getState().project,
    activePhaseId,
    activeSlideId,
  );
  if (!slide) return;
  const extracted = extractSelectedObjects(slide, selectedObjects);
  if (isClipboardEmpty(extracted)) return;
  sessionStore.getState().setClipboard(extracted);
}

export function handlePasteObjects({
  documentStore,
  sessionStore,
}: ShortcutStores): void {
  const { activePhaseId, activeSlideId, clipboard } = sessionStore.getState();
  if (!clipboard || isClipboardEmpty(clipboard)) return;
  const targetSlide = selectDomainActiveSlide(
    documentStore.getState().project,
    activePhaseId,
    activeSlideId,
  );
  if (!targetSlide) return;
  const cloned = cloneAndOffsetClipboard(clipboard);
  documentStore.getState().dispatchSlide(activePhaseId, targetSlide.id, {
    type: 'INSERT_ENTITIES',
    players: cloned.players,
    arrows: cloned.arrows,
    zones: cloned.zones,
    texts: cloned.texts,
  });
  sessionStore.getState().selectObjects(cloned.selectedRefs);
}

export function handleDuplicateObjects({
  documentStore,
  sessionStore,
}: ShortcutStores): void {
  const { activePhaseId, activeSlideId, selectedObjects } =
    sessionStore.getState();
  if (selectedObjects.length === 0) return;
  const slide = selectDomainActiveSlide(
    documentStore.getState().project,
    activePhaseId,
    activeSlideId,
  );
  if (!slide) return;
  const extracted = extractSelectedObjects(slide, selectedObjects);
  if (isClipboardEmpty(extracted)) return;
  sessionStore.getState().setClipboard(extracted);
  const cloned = cloneAndOffsetClipboard(extracted);
  documentStore.getState().dispatchSlide(activePhaseId, slide.id, {
    type: 'INSERT_ENTITIES',
    players: cloned.players,
    arrows: cloned.arrows,
    zones: cloned.zones,
    texts: cloned.texts,
  });
  sessionStore.getState().selectObjects(cloned.selectedRefs);
}

export function handleDuplicateScene({
  documentStore,
  sessionStore,
}: ShortcutStores): void {
  const { activePhaseId, activeSlideId } = sessionStore.getState();
  const newSlideId = crypto.randomUUID();
  documentStore.getState().dispatch({
    type: 'DUPLICATE_SLIDE',
    phaseId: activePhaseId,
    slideId: activeSlideId,
    newSlideId,
  });
  sessionStore.getState().setActiveSlideId(newSlideId);
  toast.success('シーンを複製しました');
}

export function handleNavigateScene(
  { documentStore, sessionStore, playbackStore }: ShortcutStores,
  direction: 'prev' | 'next',
): void {
  const { activePhaseId, activeSlideId } = sessionStore.getState();
  const slides = selectDomainActivePhaseSlides(
    documentStore.getState().project,
    activePhaseId,
  );
  const currentIndex = slides.findIndex((s) => s.id === activeSlideId);
  const targetIndex =
    direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= slides.length) {
    return;
  }
  const target = slides[targetIndex];
  sessionStore.getState().setActiveSlideId(target.id);
  playbackStore.getState().setPlaybackIndices(targetIndex, null);
  const snapTime = getSlideSnapTime(slides, targetIndex);
  playbackStore.getState().seekTo(snapTime);
}

export function handleRestartPlayback({
  documentStore,
  sessionStore,
  playbackStore,
}: ShortcutStores): void {
  const { activePhaseId } = sessionStore.getState();
  const slides = selectDomainActivePhaseSlides(
    documentStore.getState().project,
    activePhaseId,
  );
  if (slides.length > 0) {
    sessionStore.getState().setActiveSlideId(slides[0].id);
    playbackStore.getState().setPlaybackIndices(0, null);
    playbackStore.getState().seekTo(0);
    playbackStore.getState().startPlayback();
  }
}

export function handleEscapeKey(
  { sessionStore }: ShortcutStores,
  e: KeyboardEvent,
): void {
  // 1. フォーム入力中ならフォーカス解除
  const activeTag = document.activeElement?.tagName?.toLowerCase();
  if (activeTag === 'input' || activeTag === 'textarea') {
    (document.activeElement as HTMLElement)?.blur();
    e.preventDefault();
    return;
  }
  // 2. ピッチ上のオブジェクトが選択されている場合は選択解除
  const session = sessionStore.getState();
  if (session.selectedObjects.length > 0) {
    session.clearSelection();
    e.preventDefault();
    return;
  }
  // 3. 何も選択されていない場合は右パネルを閉じる
  if (session.panels.isRightPanelOpen) {
    session.setRightPanelOpen(false);
    (document.activeElement as HTMLElement)?.blur();
    e.preventDefault();
  }
}

export function handleDeleteOrBackspace({
  documentStore,
  sessionStore,
}: ShortcutStores): void {
  const { activePhaseId, activeSlideId, selectedObjects } =
    sessionStore.getState();
  const project = documentStore.getState().project;

  if (selectedObjects.length > 0) {
    const slide = selectDomainActiveSlide(
      project,
      activePhaseId,
      activeSlideId,
    );
    const lockedRefs = selectedObjects.filter((obj) => {
      const collectionKey = OBJECT_KIND_TO_COLLECTION[obj.kind];
      if (!collectionKey || !slide) return false;
      const list = slide[collectionKey];
      return Boolean(
        (list as readonly { id: string; locked?: boolean }[]).find(
          (item) => item.id === obj.id,
        )?.locked,
      );
    });
    const lockedIdSet = new Set(lockedRefs.map((obj) => obj.id));
    const deletableIds = selectedObjects
      .filter((obj) => !lockedIdSet.has(obj.id))
      .map((obj) => obj.id);

    if (deletableIds.length > 0 && slide) {
      documentStore.getState().dispatchSlide(activePhaseId, slide.id, {
        type: 'DELETE_ENTITIES',
        ids: deletableIds,
      });
    }

    if (lockedRefs.length > 0) {
      sessionStore.getState().selectObjects(lockedRefs);
      toast.info('ロック中のオブジェクトは保護されています');
    } else {
      sessionStore.getState().clearSelection();
    }
    return;
  }

  // ピッチ上オブジェクト非選択時はアクティブスライドを削除
  const activeSlides = selectDomainActivePhaseSlides(project, activePhaseId);
  if (activeSlides.length <= 1) {
    toast.error('これ以上スライドを削除できません（最低1枚必要です）');
    return;
  }
  const deletedIndex = activeSlides.findIndex((s) => s.id === activeSlideId);
  const remaining = activeSlides.filter((s) => s.id !== activeSlideId);
  const nextSlide =
    remaining[Math.min(deletedIndex, remaining.length - 1)] ?? remaining[0];
  documentStore.getState().dispatch({
    type: 'DELETE_SLIDE',
    phaseId: activePhaseId,
    slideId: activeSlideId,
  });
  if (nextSlide) {
    sessionStore.getState().setActiveSlideId(nextSlide.id);
  }
  toast.success('スライドを削除しました（Ctrl+Zで復元可能）');
}
