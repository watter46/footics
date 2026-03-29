export interface Team {
  id: number;
  name: string;
}

export interface MatchSummary {
  id: string;
  fileName: string;
  homeTeam: Team;
  awayTeam: Team;
  date: string;
  score: string;
}

export const MATCHES: MatchSummary[] = [
  {
    "id": "1968803",
    "fileName": "match_1968803.json",
    "homeTeam": {
      "id": 13,
      "name": "Arsenal"
    },
    "awayTeam": {
      "id": 167,
      "name": "Man City"
    },
    "date": "2026-03-22",
    "score": "0 : 2"
  },
  {
    "id": "1903463",
    "fileName": "match_1903463.json",
    "homeTeam": {
      "id": 31,
      "name": "Everton"
    },
    "awayTeam": {
      "id": 15,
      "name": "Chelsea"
    },
    "date": "2026-03-21",
    "score": "3 : 0"
  },
  {
    "id": "1972192",
    "fileName": "match_1972192.json",
    "homeTeam": {
      "id": 304,
      "name": "PSG"
    },
    "awayTeam": {
      "id": 15,
      "name": "Chelsea"
    },
    "date": "2026-03-11",
    "score": "5 : 2"
  }
];
