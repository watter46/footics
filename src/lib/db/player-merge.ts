import { db } from './schema';

// ──────────────────────────────────────────────
// Player Merge Helpers
// ──────────────────────────────────────────────

export function generatePlayerMasterId(
  season: string,
  playerId: number,
): string {
  return `${season}_${playerId}`;
}

export function normalizePlayerNameForMatch(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveMergedShirtNo(
  manualNo: number | undefined,
  officialNo: number | undefined,
): number | undefined {
  return manualNo !== undefined && manualNo !== 99
    ? manualNo
    : (officialNo ?? manualNo);
}

export function resolveMergedPosition(
  manualPos: string | undefined,
  officialPos: string | undefined,
): string {
  if (manualPos && manualPos !== 'Sub' && manualPos !== 'Other') {
    return manualPos;
  }
  if (officialPos && officialPos !== 'Sub') {
    return officialPos;
  }
  return manualPos ?? officialPos ?? 'Other';
}

export async function updateTacticalProjectsPlayerIds(
  idMap: Map<string, string>,
): Promise<void> {
  if (idMap.size === 0) return;
  const projects = await db.tactical_projects.toArray();
  for (const project of projects) {
    let updated = false;
    for (const phase of project.phases ?? []) {
      for (const slide of phase.slides ?? []) {
        for (const player of slide.players ?? []) {
          if (player.playerId && idMap.has(player.playerId)) {
            player.playerId = idMap.get(player.playerId)!;
            updated = true;
          }
        }
      }
    }
    if (updated) {
      await db.tactical_projects.put({
        ...project,
        updatedAt: new Date().toISOString(),
      });
    }
  }
}
