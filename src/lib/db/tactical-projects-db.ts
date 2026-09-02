/**
 * tactical-projects-db.ts
 *
 * Dexie.js (IndexedDB) Multi-Project Persistence Layer.
 * Provides CRUD operations, active project synchronization, duplication,
 * and JSON export/import for TacticalProject entities.
 */

import { db } from '@/lib/db/schema';
import {
  clearActiveProjectFromDb,
  loadActiveProjectFromDb,
  saveActiveProjectToDb,
} from '@/lib/tactical/tactical-storage';
import {
  createDefaultProject,
  type TacticalProject,
  TacticalProjectSchema,
} from '@/lib/types/tactical-unified';

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

/**
 * List all saved tactical projects ordered by latest updated.
 */
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
      slideCount: p.slides?.length ?? 0,
      aspectRatio: p.aspectRatio,
      thumbnail: p.thumbnail,
      backgroundType: p.backgroundType,
    }));
  } catch (error) {
    console.error('Failed to list tactical projects from Dexie:', error);
    return [];
  }
}

/**
 * Get a full tactical project by ID.
 */
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

/**
 * Create a new tactical project in DB and optionally activate it.
 */
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

/**
 * Rename an existing tactical project.
 */
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

/**
 * Duplicate a tactical project with a new ID and title suffix.
 */
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

/**
 * Delete a tactical project from DB.
 * If the deleted project was active, clears active keyval store.
 */
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

/**
 * Delete multiple tactical projects from DB.
 */
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

/**
 * Format local date time string as YYYYMMDD_HHmm for filenames.
 */
function getTimestampForFilename(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}`;
}

/**
 * Sanitize a project title for safe filesystem filenames while preserving Japanese/alphanumeric characters.
 */
function sanitizeFilenameTitle(rawTitle?: string): string {
  const fallback = 'untitled';
  if (!rawTitle) return fallback;
  // Replace invalid OS filename characters: \ / : * ? " < > | and whitespace
  const sanitized = rawTitle
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return sanitized || fallback;
}

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

  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  let count = 0;
  for (const id of ids) {
    const proj = await getTacticalProjectById(id);
    if (!proj) continue;

    const safeTitle = sanitizeFilenameTitle(proj.title);
    const filename = `footics_tactical_${safeTitle}_${proj.id.slice(0, 8)}.json`;
    zip.file(filename, JSON.stringify(proj, null, 2));
    count++;
  }

  if (count === 0) {
    throw new Error('エクスポート対象のプロジェクトが見つかりませんでした');
  }

  const content = await zip.generateAsync({ type: 'blob' });
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
 * Import a tactical project from a single JSON File.
 * Validates schema with Zod and assigns a fresh ID if conflict or preferred.
 * Retains original project title without appending suffixes.
 */
export async function importTacticalProjectFromJson(
  file: File,
  assignNewId = true,
): Promise<TacticalProject> {
  const text = await file.text();
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(text);
  } catch (_e) {
    throw new Error('Invalid file format: JSON could not be parsed.');
  }

  const parseResult = TacticalProjectSchema.safeParse(rawJson);
  if (!parseResult.success) {
    throw new Error(
      `Invalid tactical project JSON format: ${parseResult.error.issues[0]?.message ?? 'Schema validation failed'}`,
    );
  }

  const project = parseResult.data;
  const now = new Date().toISOString();

  const importedProject: TacticalProject = {
    ...project,
    id: assignNewId ? crypto.randomUUID() : project.id,
    title: project.title?.trim() || 'Untitled Project',
    createdAt: assignNewId ? now : project.createdAt,
    updatedAt: now,
  };

  await saveTacticalProject(importedProject, false);
  return importedProject;
}

/**
 * Import multiple tactical projects from files (supports multiple .json files, or a .zip archive containing .json files).
 * Retains original project titles without appending suffixes.
 */
export async function importMultipleTacticalProjects(
  files: FileList | File[],
): Promise<{ imported: TacticalProject[]; errors: string[] }> {
  const fileArray = Array.from(files);
  const imported: TacticalProject[] = [];
  const errors: string[] = [];

  for (const file of fileArray) {
    if (file.name.endsWith('.zip') || file.type.includes('zip')) {
      // Handle ZIP archive containing JSON projects
      try {
        const { default: JSZip } = await import('jszip');
        const zip = await JSZip.loadAsync(file);

        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
          if (zipEntry.dir || !relativePath.endsWith('.json')) continue;
          try {
            const jsonText = await zipEntry.async('string');
            const raw = JSON.parse(jsonText);
            const parsed = TacticalProjectSchema.safeParse(raw);
            if (!parsed.success) {
              errors.push(
                `${relativePath}: スキーマ検証に失敗しました (${parsed.error.issues[0]?.message})`,
              );
              continue;
            }

            const now = new Date().toISOString();
            const proj: TacticalProject = {
              ...parsed.data,
              id: crypto.randomUUID(),
              title: parsed.data.title?.trim() || 'Untitled Project',
              createdAt: now,
              updatedAt: now,
            };
            await saveTacticalProject(proj, false);
            imported.push(proj);
          } catch (err: any) {
            errors.push(`${relativePath}: ${err.message || 'JSON解析エラー'}`);
          }
        }
      } catch (err: any) {
        errors.push(`${file.name}: ZIP展開エラー (${err.message})`);
      }
    } else {
      // Handle individual JSON file
      try {
        const proj = await importTacticalProjectFromJson(file, true);
        imported.push(proj);
      } catch (err: any) {
        errors.push(`${file.name}: ${err.message || 'インポート失敗'}`);
      }
    }
  }

  return { imported, errors };
}
