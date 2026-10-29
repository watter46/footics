/**
 * tactical-projects-import.ts
 *
 * Import functions for TacticalProject entities from JSON and ZIP files.
 */

import { strFromU8, unzipSync } from 'fflate';
import {
  type TacticalProject,
  TacticalProjectSchema,
} from '@/lib/types/tactical-unified';
import { saveTacticalProject } from './tactical-projects-db';

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
  } as unknown as TacticalProject;

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
        const buffer = await file.arrayBuffer();
        const unzipped = unzipSync(new Uint8Array(buffer));

        for (const [relativePath, bytes] of Object.entries(unzipped)) {
          if (relativePath.endsWith('/') || !relativePath.endsWith('.json')) {
            continue;
          }
          try {
            const jsonText = strFromU8(bytes);
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
            } as unknown as TacticalProject;
            await saveTacticalProject(proj, false);
            imported.push(proj);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : 'JSON解析エラー';
            errors.push(`${relativePath}: ${message}`);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${file.name}: ZIP展開エラー (${message})`);
      }
    } else {
      // Handle individual JSON file
      try {
        const proj = await importTacticalProjectFromJson(file, true);
        imported.push(proj);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'インポート失敗';
        errors.push(`${file.name}: ${message}`);
      }
    }
  }

  return { imported, errors };
}

/**
 * Format local date time string as YYYYMMDD_HHmm for filenames.
 */
export function getTimestampForFilename(): string {
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
export function sanitizeFilenameTitle(rawTitle?: string): string {
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
