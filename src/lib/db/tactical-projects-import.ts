/**
 * tactical-projects-import.ts
 *
 * Import functions for TacticalProject entities from JSON and ZIP files.
 */

import { strFromU8, unzipSync } from 'fflate';
import { attachProjectSlidesGetter } from '@/lib/types/tactical/project';
import {
  type TacticalProject,
  TacticalProjectSchema,
} from '@/lib/types/tactical-unified';
import { saveTacticalProject } from './tactical-projects-db';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * Sanitize tactical project raw JSON before Zod validation to ensure resilience.
 * Truncates overlong text fields and clamps duration / angles.
 */
export function sanitizeTacticalProjectForImport(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;

  const title =
    typeof raw.title === 'string' ? raw.title.slice(0, 500) : raw.title;
  const phases = Array.isArray(raw.phases)
    ? raw.phases.map((ph) => {
        if (!isRecord(ph)) return ph;
        const name =
          typeof ph.name === 'string' ? ph.name.slice(0, 200) : ph.name;
        const slides = Array.isArray(ph.slides)
          ? ph.slides.map((sl) => {
              if (!isRecord(sl)) return sl;
              return {
                ...sl,
                label:
                  typeof sl.label === 'string'
                    ? sl.label.slice(0, 200)
                    : sl.label,
                transitionDurationMs:
                  typeof sl.transitionDurationMs === 'number'
                    ? clamp(sl.transitionDurationMs, 100, 30000)
                    : sl.transitionDurationMs,
                pauseMs:
                  typeof sl.pauseMs === 'number'
                    ? clamp(sl.pauseMs, 0, 10000)
                    : sl.pauseMs,
                cameraDurationMs:
                  typeof sl.cameraDurationMs === 'number'
                    ? clamp(sl.cameraDurationMs, 500, 60000)
                    : sl.cameraDurationMs,
                texts: Array.isArray(sl.texts)
                  ? sl.texts.map((t) =>
                      isRecord(t) && typeof t.content === 'string'
                        ? { ...t, content: t.content.slice(0, 10000) }
                        : t,
                    )
                  : sl.texts,
                arrows: Array.isArray(sl.arrows)
                  ? sl.arrows.map((a) =>
                      isRecord(a) && typeof a.label === 'string'
                        ? { ...a, label: a.label.slice(0, 200) }
                        : a,
                    )
                  : sl.arrows,
                zones: Array.isArray(sl.zones)
                  ? sl.zones.map((z) =>
                      isRecord(z) && typeof z.label === 'string'
                        ? { ...z, label: z.label.slice(0, 200) }
                        : z,
                    )
                  : sl.zones,
                players: Array.isArray(sl.players)
                  ? sl.players.map((pl) => {
                      if (!isRecord(pl)) return pl;
                      const badges = Array.isArray(pl.badges)
                        ? pl.badges.map((b) =>
                            isRecord(b) && typeof b.label === 'string'
                              ? { ...b, label: b.label.slice(0, 100) }
                              : b,
                          )
                        : pl.badges;
                      let visionCone = pl.visionCone;
                      if (
                        isRecord(visionCone) &&
                        typeof visionCone.angleRad === 'number' &&
                        visionCone.angleRad > Math.PI * 2 + 0.1
                      ) {
                        visionCone = { ...visionCone, angleRad: Math.PI * 2 };
                      }
                      return { ...pl, badges, visionCone };
                    })
                  : sl.players,
              };
            })
          : ph.slides;
        return { ...ph, name, slides };
      })
    : raw.phases;

  return { ...raw, title, phases };
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

  const sanitized = sanitizeTacticalProjectForImport(rawJson);
  const parseResult = TacticalProjectSchema.safeParse(sanitized);
  if (!parseResult.success) {
    const details = parseResult.error.issues
      .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
      .join(', ');
    throw new Error(`Invalid tactical project JSON format: ${details}`);
  }

  const project = parseResult.data;
  const now = new Date().toISOString();

  const importedProject: TacticalProject = attachProjectSlidesGetter({
    ...project,
    id: assignNewId ? crypto.randomUUID() : project.id,
    title: project.title?.trim() || 'Untitled Project',
    createdAt: assignNewId ? now : project.createdAt,
    updatedAt: now,
  } as TacticalProject);

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
            const sanitized = sanitizeTacticalProjectForImport(raw);
            const parsed = TacticalProjectSchema.safeParse(sanitized);
            if (!parsed.success) {
              const details = parsed.error.issues
                .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
                .join(', ');
              errors.push(
                `${relativePath}: スキーマ検証に失敗しました (${details})`,
              );
              continue;
            }

            const now = new Date().toISOString();
            const proj: TacticalProject = attachProjectSlidesGetter({
              ...parsed.data,
              id: crypto.randomUUID(),
              title: parsed.data.title?.trim() || 'Untitled Project',
              createdAt: now,
              updatedAt: now,
            } as TacticalProject);
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
