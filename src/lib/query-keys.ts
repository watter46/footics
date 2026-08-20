export const matchKeys = {
  all: ['matches'] as const,
  lists: () => [...matchKeys.all, 'list'] as const,
  detail: (id: string) => [...matchKeys.all, 'detail', id] as const,
  memo: (id: string) => [...matchKeys.all, 'memo', id] as const,
};

export const nationalMatchKeys = {
  all: ['national-match-data'] as const,
  detail: (id: string) => [...nationalMatchKeys.all, id] as const,
};

export const customEventKeys = {
  all: ['custom-events'] as const,
  byMatch: (matchId: string) =>
    [...customEventKeys.all, 'by-match', matchId] as const,
};

export const eventKeys = {
  all: ['events'] as const,
  filtered: (filters: any) => [...eventKeys.all, 'filtered', filters] as const,
};

export const playerKeys = {
  all: ['players'] as const,
  lists: () => [...playerKeys.all, 'list'] as const,
  detail: (playerId: number) =>
    [...playerKeys.all, 'detail', playerId] as const,
  batch: (playerIds: number[]) =>
    [
      ...playerKeys.all,
      'batch',
      playerIds
        .slice()
        .sort((a, b) => a - b)
        .join(','),
    ] as const,
};
