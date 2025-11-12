import {
  type ActionMaster,
  type Event,
  type Match,
  type Player,
} from '@/lib/db';

import { CATEGORY_META, DEFAULT_CATEGORY_META } from './constants';
import type { CategoryMeta } from './types';

export const resolveTeamIds = (match: Match): number[] => {
  const ids: number[] = [];

  if (typeof match.team1Id === 'number') {
    ids.push(match.team1Id);
  }

  if (typeof match.team2Id === 'number' && match.team2Id !== match.team1Id) {
    ids.push(match.team2Id);
  }

  return ids;
};

export const getCategoryMeta = (action?: ActionMaster | null): CategoryMeta => {
  if (!action?.category) {
    return DEFAULT_CATEGORY_META;
  }

  return CATEGORY_META[action.category] ?? DEFAULT_CATEGORY_META;
};

export const resolveEventSubjectLabel = (
  event: Event,
  player: Player | null
): string => {
  if (event.opponentPosition) {
    return event.opponentPosition;
  }

  if (player?.name) {
    return player.name;
  }

  if (event.positionName) {
    return event.positionName;
  }

  if (typeof event.playerId === 'number') {
    return '選手未登録';
  }

  return '記録対象なし';
};

export const buildMemoSummary = (memo?: string | null): string | null => {
  const value = memo?.trim();
  return value && value.length > 0 ? value : null;
};

export const createTeamDisplayName = (
  teamId: number | undefined,
  teamNameMap: Map<number, string>,
  fallbackLabel: string
): string => {
  if (typeof teamId !== 'number') {
    return fallbackLabel;
  }

  return teamNameMap.get(teamId) ?? `Team #${teamId}`;
};
