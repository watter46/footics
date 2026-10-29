/**
 * tactical-projects-db.ts
 *
 * Dexie.js (IndexedDB) Multi-Project Persistence Layer.
 * Provides CRUD operations, active project synchronization, duplication,
 * and JSON export/import for TacticalProject entities.
 */

import { strToU8, zipSync } from 'fflate';
import { db } from '@/lib/db/schema';
import {
  clearActiveProjectFromDb,
  loadActiveProjectFromDb,
  saveActiveProjectToDb,
} from '@/lib/tactical/tactical-storage';
import {
  createDefaultProject,
  type TacticalProject,
} from '@/lib/types/tactical-unified';
import type { Match } from '@/types';

export interface TacticalProjectSummary {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
  slideCount: number;
  aspectRatio: string;
  thumbnail?: string;
  backgroundType: 'pitch' | 'image' | 'blank';
}

/** List all saved tactical projects ordered by latest updated. */
export async function listTacticalProjects(): Promise<
  TacticalProjectSummary[]
> {
  try {
    const projects = await db.tactical_projects
      .orderBy('updatedAt')
      .reverse()
      .toArray();

    return projects.map((p) => ({
      id: p.id,
      title: p.title || 'Untitled Project',
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
      slideCount:
        p.phases?.reduce((acc, ph) => acc + (ph.slides?.length ?? 0), 0) ?? 0,
      aspectRatio: p.aspectRatio,
      thumbnail: p.thumbnail,
      backgroundType: p.backgroundType,
    }));
  } catch (error) {
    console.error('Failed to list tactical projects from Dexie:', error);
    return [];
  }
}

/** Get a full tactical project by ID. */
export async function getTacticalProjectById(
  id: string,
): Promise<TacticalProject | null> {
  try {
    const project = await db.tactical_projects.get(id);
    return project ?? null;
  } catch (error) {
    console.error(`Failed to get tactical project ${id}:`, error);
    return null;
  }
}

/**
 * Save or update a tactical project in the tactical_projects table.
 * If syncActive is true, also updates the active project keyval store.
 */
export async function saveTacticalProject(
  project: TacticalProject,
  syncActive = true,
): Promise<void> {
  try {
    const cleanProject: TacticalProject = {
      ...project,
      updatedAt: new Date().toISOString(),
      title: project.title?.trim() || 'Untitled Project',
    };

    await db.tactical_projects.put(cleanProject);

    if (syncActive) {
      await saveActiveProjectToDb(cleanProject);
    }
  } catch (error) {
    console.error('Failed to save tactical project:', error);
    throw error;
  }
}

/** Create a new tactical project in DB and optionally activate it. */
export async function createNewTacticalProject(
  title = 'Untitled Project',
  activate = true,
): Promise<TacticalProject> {
  const newId = crypto.randomUUID();
  const project = createDefaultProject(newId);
  project.title = title;

  await saveTacticalProject(project, activate);
  return project;
}

/** Rename an existing tactical project. */
export async function renameTacticalProject(
  id: string,
  newTitle: string,
): Promise<void> {
  try {
    const trimmedTitle = newTitle.trim() || 'Untitled Project';
    const now = new Date().toISOString();

    await db.tactical_projects.update(id, {
      title: trimmedTitle,
      updatedAt: now,
    });

    // Check if it is currently active in keyval
    const active = await loadActiveProjectFromDb();
    if (active && active.id === id) {
      active.title = trimmedTitle;
      active.updatedAt = now;
      await saveActiveProjectToDb(active);
    }
  } catch (error) {
    console.error(`Failed to rename project ${id}:`, error);
    throw error;
  }
}

/** Duplicate a tactical project with a new ID and title suffix. */
export async function duplicateTacticalProject(
  id: string,
): Promise<TacticalProject> {
  const original = await getTacticalProjectById(id);
  if (!original) {
    throw new Error(`Project ${id} not found to duplicate`);
  }

  const newId = crypto.randomUUID();
  const now = new Date().toISOString();
  const cloned: TacticalProject = {
    ...structuredClone(original),
    id: newId,
    title: `${original.title || 'Untitled Project'} (Copy)`,
    createdAt: now,
    updatedAt: now,
  };

  await saveTacticalProject(cloned, false);
  return cloned;
}

/** Delete a tactical project from DB. Clears active keyval store if active. */
export async function deleteTacticalProject(id: string): Promise<void> {
  try {
    await db.tactical_projects.delete(id);

    const active = await loadActiveProjectFromDb();
    if (active && active.id === id) {
      await clearActiveProjectFromDb();
    }
  } catch (error) {
    console.error(`Failed to delete project ${id}:`, error);
    throw error;
  }
}

/** Delete multiple tactical projects from DB. */
export async function deleteTacticalProjects(ids: string[]): Promise<void> {
  try {
    await db.tactical_projects.bulkDelete(ids);

    const active = await loadActiveProjectFromDb();
    if (active && ids.includes(active.id)) {
      await clearActiveProjectFromDb();
    }
  } catch (error) {
    console.error('Failed to bulk delete projects:', error);
    throw error;
  }
}

import {
  getTimestampForFilename,
  sanitizeFilenameTitle,
} from './tactical-projects-import';

/**
 * Export a tactical project as a formatted JSON blob file download.
 * Naming convention: footics_tactical_{title}_{YYYYMMDD_HHmm}.json
 */
export function exportTacticalProjectToJson(project: TacticalProject): void {
  const safeTitle = sanitizeFilenameTitle(project.title);
  const timestamp = getTimestampForFilename();
  const filename = `footics_tactical_${safeTitle}_${timestamp}.json`;

  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export multiple tactical projects into a single ZIP archive containing individual JSON files.
 * Naming convention: footics_tactical_projects_{YYYYMMDD_HHmm}.zip
 */
export async function exportTacticalProjectsAsZip(
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;

  const files: Record<string, Uint8Array> = {};

  let count = 0;
  for (const id of ids) {
    const proj = await getTacticalProjectById(id);
    if (!proj) continue;

    const safeTitle = sanitizeFilenameTitle(proj.title);
    const filename = `footics_tactical_${safeTitle}_${proj.id.slice(0, 8)}.json`;
    files[filename] = strToU8(JSON.stringify(proj, null, 2));
    count++;
  }

  if (count === 0) {
    throw new Error('エクスポート対象のプロジェクトが見つかりませんでした');
  }

  const zipped = zipSync(files, { level: 6 });
  const content = new Blob([zipped], {
    type: 'application/zip',
  });
  const timestamp = getTimestampForFilename();
  const zipFilename = `footics_tactical_projects_${timestamp}.zip`;

  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Tactical Project 用の Match データ取得ヘルパー。
 * UIコンポーネントからの DB 直接参照を防止する。
 */
export async function getMatchForTacticalProject(
  matchId: string | number,
): Promise<Match | null> {
  try {
    const numId = Number(matchId);
    const match =
      (!Number.isNaN(numId) ? await db.matches.get(numId as never) : null) ||
      (await db.matches.get(matchId as string)) ||
      (await db.matches.get(String(matchId)));
    return match ?? null;
  } catch (error) {
    console.error('Failed to get match for tactical project:', error);
    return null;
  }
}

export {
  importMultipleTacticalProjects,
  importTacticalProjectFromJson,
} from './tactical-projects-import';
