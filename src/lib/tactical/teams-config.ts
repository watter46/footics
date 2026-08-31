export interface SupportedTeam {
  id: string; // URL slug, e.g. 'chelsea', 'arsenal', 'manchester-city'
  name: string; // Display name, e.g. 'Chelsea FC'
  shortName: string; // e.g. 'Chelsea'
  league: string; // e.g. 'Premier League'
  officialTeamId?: number; // WhoScored Team ID if known
  accentColor: string; // Tailwind color class or hex
}

export const SUPPORTED_TEAMS: SupportedTeam[] = [
  {
    id: 'chelsea',
    name: 'Chelsea FC',
    shortName: 'Chelsea',
    league: 'Premier League',
    officialTeamId: 15,
    accentColor: 'blue',
  },
  {
    id: 'arsenal',
    name: 'Arsenal FC',
    shortName: 'Arsenal',
    league: 'Premier League',
    officialTeamId: 13,
    accentColor: 'red',
  },
  {
    id: 'manchester-city',
    name: 'Manchester City',
    shortName: 'Man City',
    league: 'Premier League',
    officialTeamId: 167,
    accentColor: 'sky',
  },
  {
    id: 'liverpool',
    name: 'Liverpool FC',
    shortName: 'Liverpool',
    league: 'Premier League',
    officialTeamId: 26,
    accentColor: 'red',
  },
  {
    id: 'real-madrid',
    name: 'Real Madrid',
    shortName: 'Real Madrid',
    league: 'La Liga',
    officialTeamId: 52,
    accentColor: 'amber',
  },
  {
    id: 'barcelona',
    name: 'FC Barcelona',
    shortName: 'Barcelona',
    league: 'La Liga',
    officialTeamId: 65,
    accentColor: 'blue',
  },
];

export function getTeamConfig(teamId: string): SupportedTeam {
  const normalizedId = teamId.toLowerCase().trim();
  const found = SUPPORTED_TEAMS.find(
    (t) =>
      t.id === normalizedId ||
      t.shortName.toLowerCase() === normalizedId ||
      t.name.toLowerCase() === normalizedId,
  );
  if (found) return found;

  // 動的未登録クラブのフォールバック生成
  const formattedName = teamId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    id: normalizedId,
    name: formattedName,
    shortName: formattedName,
    league: 'Club',
    accentColor: 'blue',
  };
}
