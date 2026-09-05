/**
 * use-tactical-auto-save.ts
 *
 * Automatically saves tactical project to Dexie.js (IndexedDB) with debounce,
 * and restores saved project on first mount.
 */

import { useEffect, useRef } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  loadActiveProjectFromDb,
  saveActiveProjectToDb,
} from '@/lib/tactical/tactical-storage';

const AUTO_SAVE_DEBOUNCE_MS = 800;

export interface UseTacticalAutoSaveOptions {
  skipRestore?: boolean;
}

export function useTacticalAutoSave(options: UseTacticalAutoSaveOptions = {}) {
  const { skipRestore = false } = options;
  const isLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const project = useTacticalUnifiedStore((s) => s.project);
  const isDirty = useTacticalUnifiedStore((s) => s.isDirty);
  const loadProject = useTacticalUnifiedStore((s) => s.loadProject);
  const setSaveStatus = useTacticalUnifiedStore((s) => s.setSaveStatus);
  const setLastSavedAt = useTacticalUnifiedStore((s) => s.setLastSavedAt);

  // 1. Initial Load from Dexie IndexedDB
  useEffect(() => {
    if (skipRestore) {
      isLoadedRef.current = true;
      return;
    }

    let isMounted = true;

    async function initProject() {
      try {
        const savedProject = await loadActiveProjectFromDb();
        if (isMounted) {
          if (savedProject) {
            loadProject(savedProject);
            setSaveStatus('saved');
          } else {
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
  }, [loadProject, setSaveStatus, skipRestore]);

  // 2. Debounced Auto-Save
  useEffect(() => {
    // Do not save before initial load completes or when clean
    if (!isLoadedRef.current || !isDirty) {
      return;
    }

    setSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveActiveProjectToDb(project);
        setSaveStatus('saved');
        setLastSavedAt(Date.now());
        useTacticalUnifiedStore.setState({ isDirty: false });
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
  }, [project, isDirty, setSaveStatus, setLastSavedAt]);

  // 3. Save on BeforeUnload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = useTacticalUnifiedStore.getState();
      if (state.isDirty && isLoadedRef.current) {
        saveActiveProjectToDb(state.project).catch((err) =>
          console.error('Beforeunload save failed:', err),
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
