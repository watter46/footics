export const matchKeys = {
  all: ['matches'] as const,
  lists: () => [...matchKeys.all, 'list'] as const,
  detail: (id: string) => [...matchKeys.all, 'detail', id] as const,
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
