import type {
  ClubMatchRoot,
  EventRow,
  Match,
  MatchEvent,
  NationalMatchRoot,
} from '@/types';
import { saveMatchUnified } from './db';
import { NATIONAL_INFO_IDX, parseNationalDate } from './national-match-schema';

function isClubMatch(data: unknown): data is ClubMatchRoot {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as ClubMatchRoot).matchId === 'number' &&
    typeof (data as ClubMatchRoot).matchCentreData === 'object'
  );
}

function isNationalMatch(data: unknown): data is NationalMatchRoot {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as NationalMatchRoot).matchId === 'number' &&
    Array.isArray((data as NationalMatchRoot).initialMatchDataForScrappers)
  );
}

function mapEvent(e: MatchEvent, matchId: string): EventRow {
  return {
    id: e.id,
    match_id: matchId,
    event_id: e.eventId ?? 0,
    team_id: e.teamId ?? 0,
    player_id: e.playerId ?? null,
    period: e.period?.value ?? 1,
    minute: e.minute ?? 0,
    second: e.second ?? 0,
    expanded_minute: e.expandedMinute ?? e.minute ?? 0,
    x: e.x ?? 0,
    y: e.y ?? 0,
    end_x: e.endX ?? null,
    end_y: e.endY ?? null,
    type_value: e.type?.value ?? 0,
    type_name: e.type?.displayName ?? '',
    outcome: e.outcomeType?.value === 1,
    is_touch: e.isTouch ?? false,
    is_shot: e.isShot === true ? true : undefined,
    is_goal: e.isGoal === true ? true : undefined,
    qualifiers: e.qualifiers ?? [],
    source: 'whoscored',
  };
}

export async function importMatchJsonFile(file: File): Promise<string> {
  const text = await file.text();
  const rawData: unknown = JSON.parse(text);
  return processMatchData(rawData);
}

export interface BatchImportResult {
  success: number;
  failed: number;
  errors: Array<{ filename: string; message: string }>;
}

export async function importMatchesBatch(
  files: File[],
  onProgress?: (current: number, total: number) => void,
): Promise<BatchImportResult> {
  let success = 0;
  let failed = 0;
  const errors: Array<{ filename: string; message: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      if (onProgress) onProgress(i + 1, files.length);
      await importMatchJsonFile(file);
      success++;
    } catch (e) {
      failed++;
      errors.push({
        filename: file.name,
        message: e instanceof Error ? e.message : 'Unknown error',
      });
      console.error(`[footics] Failed to import ${file.name}:`, e);
    }
  }

  return { success, failed, errors };
}

async function processClubMatch(rawData: ClubMatchRoot): Promise<string> {
  const matchId = String(rawData.matchId);
  const center = rawData.matchCentreData;

  const match: Match = {
    id: matchId,
    date: center.startDate ?? '',
    score: center.score ?? '',
    matchType: 'club',
    homeTeam: { id: center.home.teamId, name: center.home.name },
    awayTeam: { id: center.away.teamId, name: center.away.name },
    playerIdNameDictionary: center.playerIdNameDictionary ?? {},
    teams: { home: center.home, away: center.away },
  };

  const events = (center.events ?? []).map((e) => mapEvent(e, matchId));

  await saveMatchUnified(match, events);
  return matchId;
}

async function processNationalMatch(
  rawData: NationalMatchRoot,
): Promise<string> {
  const matchId = String(rawData.matchId);
  const d0 = rawData.initialMatchDataForScrappers[0];
  const info = d0[0];

  const match: Match = {
    id: matchId,
    date: parseNationalDate(info[NATIONAL_INFO_IDX.DATE_FULL]),
    score: info[NATIONAL_INFO_IDX.SCORE] || 'vs',
    matchType: 'national',
    homeTeam: {
      id: info[NATIONAL_INFO_IDX.HOME_TEAM_ID],
      name: info[NATIONAL_INFO_IDX.HOME_TEAM_NAME],
    },
    awayTeam: {
      id: info[NATIONAL_INFO_IDX.AWAY_TEAM_ID],
      name: info[NATIONAL_INFO_IDX.AWAY_TEAM_NAME],
    },
    playerIdNameDictionary: {},
    teams: {
      home: {
        teamId: info[NATIONAL_INFO_IDX.HOME_TEAM_ID],
        name: info[NATIONAL_INFO_IDX.HOME_TEAM_NAME],
        players: [],
      },
      away: {
        teamId: info[NATIONAL_INFO_IDX.AWAY_TEAM_ID],
        name: info[NATIONAL_INFO_IDX.AWAY_TEAM_NAME],
        players: [],
      },
    },
  };

  // 国際試合のイベント詳細は別ルートで読み込まれるため、DBには空配列を保存して初期化する
  await saveMatchUnified(match, []);
  return matchId;
}

async function processMatchData(rawData: unknown): Promise<string> {
  if (isClubMatch(rawData)) {
    return processClubMatch(rawData);
  }

  if (isNationalMatch(rawData)) {
    return processNationalMatch(rawData);
  }

  throw new Error(
    'Unsupported match data format. Currently only Whoscored Club and National formats are supported.',
  );
}

export async function cleanupOldCache() {
  // Dexie manages its own storage efficiently. No special cleanup required.
}
