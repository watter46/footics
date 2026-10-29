/**
 * use-tactical-auto-save.ts
 *
 * Automatically saves tactical project to Dexie.js (IndexedDB) with debounce,
 * and restores saved project on first mount.
 * matchId 指定時は試合専用キーで保存・復元する（試合ごとにスライドを分離）。
 */

import { useEffect, useRef } from 'react';
import {
  useTacticalUnifiedStoreApi,
  useTacticalUnifiedStoreContext,
} from '@/features/tactical-unified/stores/tactical-unified-store-provider';
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
  const storeApi = useTacticalUnifiedStoreApi();
  const isLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const project = useTacticalUnifiedStoreContext((s) => s.project);
  const isDirty = useTacticalUnifiedStoreContext((s) => s.isDirty);
  const isPlaying = useTacticalUnifiedStoreContext((s) => s.isPlaying);
  const loadProject = useTacticalUnifiedStoreContext((s) => s.loadProject);
  const resetProject = useTacticalUnifiedStoreContext((s) => s.resetProject);
  const setSaveStatus = useTacticalUnifiedStoreContext((s) => s.setSaveStatus);
  const setLastSavedAt = useTacticalUnifiedStoreContext(
    (s) => s.setLastSavedAt,
  );

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
            loadProject(savedProject);
            setSaveStatus('saved');
          } else {
            // 前試合のスライドを引き継がない
            if (matchId && storeApi.getState().project.matchId !== matchId) {
              resetProject();
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
    resetProject,
    setSaveStatus,
    skipRestore,
    matchId,
    storeApi,
  ]);

  // 2. Debounced Auto-Save
  useEffect(() => {
    // Do not save before initial load completes, when clean, or while playing
    if (!isLoadedRef.current || !isDirty || isPlaying) {
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
        storeApi.setState({ isDirty: false });
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
    matchId,
    setSaveStatus,
    setLastSavedAt,
    storeApi,
  ]);

  // 3. Save on BeforeUnload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = storeApi.getState();
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
  }, [matchId, storeApi]);
}
