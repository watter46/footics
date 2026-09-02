/**
 * tactical-storage.ts
 * Dexie.js (IndexedDB) persistence for Tactical Projects.
 */

import { db } from '@/lib/db/schema';
import type { TacticalProject } from '@/lib/types/tactical-unified';

export const TACTICAL_PROJECT_STORAGE_KEY = 'tactical_active_project';

/**
 * Save active tactical project to Dexie IndexedDB keyval store and tactical_projects table.
 */
export async function saveActiveProjectToDb(
  project: TacticalProject,
): Promise<void> {
  try {
    await db.keyval.put({
      key: TACTICAL_PROJECT_STORAGE_KEY,
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
export async function loadActiveProjectFromDb(): Promise<TacticalProject | null> {
  try {
    const entry = await db.keyval.get(TACTICAL_PROJECT_STORAGE_KEY);
    if (
      entry?.value &&
      typeof entry.value === 'object' &&
      Array.isArray(entry.value.slides) &&
      entry.value.slides.length > 0
    ) {
      return entry.value as TacticalProject;
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
export async function clearActiveProjectFromDb(): Promise<void> {
  try {
    await db.keyval.delete(TACTICAL_PROJECT_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear tactical project from Dexie:', error);
  }
}
