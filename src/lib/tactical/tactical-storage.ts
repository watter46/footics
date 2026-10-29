/**
 * tactical-storage.ts
 * Dexie.js (IndexedDB) persistence for Tactical Projects.
 */

import { db } from '@/lib/db/schema';
import {
  ensureTacticalProject,
  type TacticalProject,
} from '@/lib/types/tactical-unified';

export { getMatchForTacticalProject } from '@/lib/db/tactical-match-helper';
export const TACTICAL_PROJECT_STORAGE_KEY = 'tactical_active_project';

/**
 * matchId ありなら試合専用キー、なしならサンドボックス用の従来キーを返す。
 */
export function getTacticalProjectStorageKey(matchId?: string | null): string {
  return matchId
    ? `${TACTICAL_PROJECT_STORAGE_KEY}:${matchId}`
    : TACTICAL_PROJECT_STORAGE_KEY;
}

/**
 * Save active tactical project to Dexie IndexedDB keyval store and tactical_projects table.
 */
export async function saveActiveProjectToDb(
  project: TacticalProject,
  matchId?: string | null,
): Promise<void> {
  try {
    await db.keyval.put({
      key: getTacticalProjectStorageKey(matchId),
      value: project,
      updatedAt: Date.now(),
    });
    // Multi-project synchronization
    if (db.tactical_projects) {
      await db.tactical_projects.put(project);
    }
  } catch (error) {
    console.error('Failed to save tactical project to Dexie:', error);
    throw error;
  }
}

/**
 * Load active tactical project from Dexie IndexedDB.
 */
export async function loadActiveProjectFromDb(
  matchId?: string | null,
): Promise<TacticalProject | null> {
  try {
    const entry = await db.keyval.get(getTacticalProjectStorageKey(matchId));
    if (entry?.value && typeof entry.value === 'object') {
      const val = entry.value as { phases?: unknown[]; slides?: unknown[] };
      const hasPhases = Array.isArray(val.phases) && val.phases.length > 0;
      const hasSlides = Array.isArray(val.slides) && val.slides.length > 0;
      if (hasPhases || hasSlides) {
        return ensureTacticalProject(val);
      }
    }
    return null;
  } catch (error) {
    console.error('Failed to load tactical project from Dexie:', error);
    return null;
  }
}

/**
 * Clear active tactical project from Dexie IndexedDB.
 */
export async function clearActiveProjectFromDb(
  matchId?: string | null,
): Promise<void> {
  try {
    await db.keyval.delete(getTacticalProjectStorageKey(matchId));
  } catch (error) {
    console.error('Failed to clear tactical project from Dexie:', error);
  }
}
