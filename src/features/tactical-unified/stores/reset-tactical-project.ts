import { getMatchForTacticalProject } from '@/lib/db/tactical-match-helper';
import { buildMatchToDomainProject } from '@/lib/tactical/acl/match-project-translator';
import { clearActiveProjectFromDb } from '@/lib/tactical/tactical-storage';
import type { DomainTacticalProject } from '@/lib/types/tactical/domain-hierarchy';

export interface ResetProjectPayload {
  project: DomainTacticalProject;
  activePhaseId: string;
  activeSlideId: string;
}

export async function buildMatchResetPayload(
  matchId: string,
): Promise<ResetProjectPayload | null> {
  const match = await getMatchForTacticalProject(matchId);
  if (!match) return null;

  const bundle = buildMatchToDomainProject(match, { minute: 0 });
  await clearActiveProjectFromDb(matchId);
  return {
    project: bundle.project,
    activePhaseId: bundle.activePhaseId,
    activeSlideId: bundle.activeSlideId,
  };
}
