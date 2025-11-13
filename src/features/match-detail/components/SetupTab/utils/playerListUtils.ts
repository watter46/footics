import type { TempPlayer } from '@/lib/db';

const POSITION_ORDER = ['FW', 'MF', 'DF', 'GK'] as const;

const POSITION_MAP: Record<string, string> = {
  GOALKEEPER: 'GK',
  DEFENDER: 'DF',
  MIDFIELDER: 'MF',
  ATTACKER: 'FW',
};

const normalizePosition = (position?: string | null): string | undefined => {
  if (!position) {
    return undefined;
  }

  const upper = position.trim().toUpperCase();
  if (!upper) {
    return undefined;
  }

  return POSITION_MAP[upper] ?? upper;
};

export const groupAndSortPlayers = (players: TempPlayer[]) => {
  const groups: Record<string, TempPlayer[]> = {
    FW: [],
    MF: [],
    DF: [],
    GK: [],
    その他: [],
  };

  players.forEach(player => {
    if (!player) {
      return;
    }

    const mapped = normalizePosition(player.position);
    if (mapped && POSITION_ORDER.includes(mapped as (typeof POSITION_ORDER)[number])) {
      groups[mapped].push(player);
    } else {
      groups.その他.push(player);
    }
  });

  Object.values(groups).forEach(group => {
    group.sort((a, b) => {
      const numA = Number.isFinite(a.number) ? Number(a.number) : Number.POSITIVE_INFINITY;
      const numB = Number.isFinite(b.number) ? Number(b.number) : Number.POSITIVE_INFINITY;

      if (numA === Number.POSITIVE_INFINITY && numB === Number.POSITIVE_INFINITY) {
        const nameA = a.name?.trim() ?? '';
        const nameB = b.name?.trim() ?? '';
        return nameA.localeCompare(nameB, 'ja');
      }

      return numA - numB;
    });
  });

  const orderedGroups: Record<string, TempPlayer[]> = {};
  [...POSITION_ORDER, 'その他'].forEach(key => {
    if (groups[key]?.length) {
      orderedGroups[key] = groups[key];
    }
  });

  return orderedGroups;
};
