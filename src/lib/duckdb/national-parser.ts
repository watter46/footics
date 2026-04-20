import type { MatchMetadata } from '@/types';

/**
 * ナショナルデータ特有の構造をパースして正規化する
 */
export function parseNationalMatchData(data: any) {
  const matchId = data.matchId;
  const scrap = data.initialMatchDataForScrappers;

  // scrap[0][0] contains match info
  const info = scrap[0][0];
  const homeTeamId = info[0];
  const awayTeamId = info[1];
  const homeTeamName = info[2] || info[13] || 'Home';
  const awayTeamName = info[3] || info[14] || 'Away';
  const score = info[12] || info[8] || '0 : 0';
  const rawDate = info[4] || '';

  let date = '';
  if (rawDate) {
    const parts = rawDate.split(' ')[0].split('/');
    if (parts.length === 3) {
      date = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  const playerInfo = scrap[0][2];
  const homeLineup = playerInfo[9] || [];
  const awayLineup = playerInfo[10] || [];
  const homeSubsList = playerInfo[11] || [];
  const awaySubsList = playerInfo[12] || [];

  const playerIdNameDictionary: Record<string, string> = {};

  const mapPlayers = (list: any[], teamId: number, isFirstEleven: boolean) => {
    return list.map((p: any) => {
      const name = p[0];
      const playerId = p[3] || Math.floor(Math.random() * 1000000);
      playerIdNameDictionary[String(playerId)] = name;
      return {
        match_id: matchId,
        team_id: teamId,
        player_id: playerId,
        shirt_no: 0,
        name: name,
        position: isFirstEleven ? 'FW' : 'Sub',
        is_first_eleven: isFirstEleven,
      };
    });
  };

  const players = [
    ...mapPlayers(homeLineup, homeTeamId, true),
    ...mapPlayers(homeSubsList, homeTeamId, false),
    ...mapPlayers(awayLineup, awayTeamId, true),
    ...mapPlayers(awaySubsList, awayTeamId, false),
  ];

  const matches = [
    {
      match_id: matchId,
      start_time: date,
      venue_name: 'International Venue',
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      score: score,
      match_type: 'national',
    },
  ];

  const events: any[] = [];

  const metadata: MatchMetadata = {
    matchId: String(matchId),
    date: date,
    score: score,
    matchType: 'national',
    playerIdNameDictionary,
    teams: {
      home: { teamId: homeTeamId, name: homeTeamName, players: [] } as any,
      away: { teamId: awayTeamId, name: awayTeamName, players: [] } as any,
    },
  };

  return { matches, players, events, metadata };
}
