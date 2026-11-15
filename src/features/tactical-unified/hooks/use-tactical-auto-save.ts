/**
 * use-tactical-auto-save.ts
 *
 * Automatically saves tactical project to Dexie.js (IndexedDB) with debounce,
 * and restores saved project on first mount.
 * matchId 指定時は試合専用キーで保存・復元する（試合ごとにスライドを分離）。
 */

import { useEffect, useRef, useState } from 'react';
import {
  createDefaultTacticalProject,
  useDocumentStore,
  usePlaybackStore,
  useSessionStore,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import {
  loadActiveProjectFromDb,
  saveActiveProjectToDb,
} from '@/lib/tactical/tactical-storage';

const AUTO_SAVE_DEBOUNCE_MS = 800;

export interface UseTacticalAutoSaveOptions {
  skipRestore?: boolean;
  matchId?: string | null;
}

export function useTacticalAutoSave(options: UseTacticalAutoSaveOptions = {}) {
  const { skipRestore = false, matchId = null } = options;
  const { documentStore, sessionStore } = useTacticalStoresContext();
  const isLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPointerDown, setIsPointerDown] = useState(false);

  const project = useDocumentStore((s) => s.project);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const loadProject = useDocumentStore((s) => s.loadProject);
  const markSaved = useDocumentStore((s) => s.markSaved);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const setSaveStatus = useSessionStore((s) => s.setSaveStatus);
  const setLastSavedAt = useSessionStore((s) => s.setLastSavedAt);

  // ポインタドラッグ中の保存保留（RAII監視）
  useEffect(() => {
    const handleDown = (e: globalThis.PointerEvent) => {
      if (e.button === 0) {
        setIsPointerDown(true);
      }
    };
    const handleUp = () => {
      setIsPointerDown(false);
    };

    window.addEventListener('pointerdown', handleDown, { passive: true });
    window.addEventListener('pointerup', handleUp, { passive: true });
    window.addEventListener('pointercancel', handleUp, { passive: true });
    window.addEventListener('blur', handleUp, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
      window.removeEventListener('blur', handleUp);
    };
  }, []);

  // 1. Initial Load from Dexie IndexedDB (matchId 変化時は新キーで再復元)
  useEffect(() => {
    if (skipRestore) {
      isLoadedRef.current = true;
      return;
    }

    isLoadedRef.current = false;
    let isMounted = true;

    async function initProject() {
      try {
        const savedProject = await loadActiveProjectFromDb(matchId);
        if (isMounted) {
          if (savedProject) {
            const bundle = normalizeTacticalProject(savedProject);
            loadProject(bundle.project);
            sessionStore.getState().setActivePhaseId(bundle.activePhaseId);
            sessionStore.getState().setActiveSlideId(bundle.activeSlideId);
            setSaveStatus('saved');
          } else {
            const currentMatchId = documentStore.getState().project.matchId;
            if (
              (matchId && currentMatchId !== matchId) ||
              (!matchId && currentMatchId)
            ) {
              const fresh = createDefaultTacticalProject();
              loadProject(fresh);
              const firstPhase = fresh.phases[0];
              if (firstPhase) {
                sessionStore.getState().setActivePhaseId(firstPhase.id);
                sessionStore
                  .getState()
                  .setActiveSlideId(firstPhase.slides[0]?.id ?? '');
              }
            }
            setSaveStatus('idle');
          }
          isLoadedRef.current = true;
        }
      } catch (err) {
        console.error('Failed to restore tactical project:', err);
        if (isMounted) {
          setSaveStatus('error');
          isLoadedRef.current = true;
        }
      }
    }

    initProject();

    return () => {
      isMounted = false;
    };
  }, [
    loadProject,
    setSaveStatus,
    skipRestore,
    matchId,
    documentStore,
    sessionStore,
  ]);

  // 2. Debounced Auto-Save
  useEffect(() => {
    // Do not save before initial load completes, when clean, while playing, or during pointer interaction
    if (!isLoadedRef.current || !isDirty || isPlaying || isPointerDown) {
      return;
    }
    // 他試合のプロジェクトを今の試合キーへ保存しない
    if (matchId && project.matchId !== matchId) {
      return;
    }

    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveActiveProjectToDb(project, matchId);
        setSaveStatus('saved');
        setLastSavedAt(Date.now());
        markSaved();
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('error');
      }
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    project,
    isDirty,
    isPlaying,
    isPointerDown,
    matchId,
    setSaveStatus,
    setLastSavedAt,
    markSaved,
  ]);

  // 3. Save on BeforeUnload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = documentStore.getState();
      if (
        state.isDirty &&
        isLoadedRef.current &&
        (!matchId || state.project.matchId === matchId)
      ) {
        saveActiveProjectToDb(state.project, matchId).catch((err) =>
          console.error('Beforeunload save failed:', err),
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [matchId, documentStore]);
}
