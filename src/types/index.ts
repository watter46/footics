import type { AsyncDuckDBConnection, AsyncDuckDB } from "@duckdb/duckdb-wasm";

// ──────────────────────────────────────────────
// Domain Models (Match Data)
// ──────────────────────────────────────────────

export type MatchRoot = ClubMatchRoot | NationalMatchRoot;

export interface ClubMatchRoot {
  matchId: number;
  matchCentreData: MatchCentreData;
  matchCentreEventTypeJson: Record<string, number>;
  formationIdNameMappings: Record<string, string>;
}

export interface NationalMatchRoot {
  matchId: number;
  initialMatchDataForScrappers: any[][][]; // 複雑なネスト構造のため、一旦 any で定義しつつ必要な箇所を抽出
}

export interface MatchCentreData {
  playerIdNameDictionary: Record<string, string>;
  periodMinuteLimits: Record<string, number>;
  periodEndMinutes: Record<string, number>;
  timeStamp: string;
  attendance: number;
  venueName: string;
  referee: Referee;
  weatherCode: string;
  elapsed: string;
  startTime: string;
  startDate: string;
  score: string;
  htScore: string;
  ftScore: string;
  statusCode: number;
  periodCode: number;
  home: Team;
  away: Team;
  maxMinute: number;
  minuteExpanded: number;
  maxPeriod: number;
  expandedMinutes: Record<string, Record<string, number>>;
  expandedMaxMinute: number;
  events: MatchEvent[];
}

export interface Referee {
  officialId: number;
  firstName: string;
  lastName: string;
  name: string;
}

export interface Team {
  teamId: number;
  name: string;
  countryName: string;
  managerName: string;
  field: "home" | "away";
  averageAge: number;
  players: Player[];
  formations: Formation[];
  stats: Record<string, unknown>;
}

export interface Player {
  playerId: number;
  shirtNo: number;
  name: string;
  position:
    | "GK"
    | "DR"
    | "DC"
    | "DL"
    | "DMC"
    | "MC"
    | "AMC"
    | "AMR"
    | "AML"
    | "FW"
    | "Sub";
  height: number;
  weight: number;
  age: number;
  isFirstEleven: boolean;
  isManOfTheMatch: boolean;
  field: "home" | "away";
  stats: Record<string, unknown>;
}

export interface Formation {
  formationId: number;
  formationName: string;
  captainPlayerId: number;
  startMinuteExpanded: number;
  endMinuteExpanded: number;
  playerIds: number[];
  jerseyNumbers: number[];
}

export interface MatchEvent {
  id: number;
  eventId: number;
  minute: number;
  second: number;
  expandedMinute: number;
  teamId: number;
  playerId?: number;
  x: number;
  y: number;
  endX?: number;
  endY?: number;
  isTouch: boolean;
  isShot?: boolean;
  isGoal?: boolean;
  period: EventTypeObj<1 | 2 | 3 | 4 | 5 | 14 | 16>;
  type: EventTypeObj<number>;
  outcomeType: EventTypeObj<0 | 1>;
  qualifiers?: Qualifier[];
  satisfiedEventsTypes: number[];
}

export interface EventTypeObj<T = number> {
  value: T;
  displayName: string;
}

export interface Qualifier {
  type: EventTypeObj<number>;
  value?: string;
}

// ──────────────────────────────────────────────
// Database State
// ──────────────────────────────────────────────

export type DatabaseStatus =
  | "idle"
  | "initializing"
  | "loading-data"
  | "ready"
  | "error";

export interface DatabaseState {
  status: DatabaseStatus;
  db: AsyncDuckDB | null;
  connection: AsyncDuckDBConnection | null;
  error: string | null;
  metadata: MatchMetadata | null;
  cacheMissing: boolean;
}

export interface MatchMetadata {
  matchId: string;
  date: string;
  score: string;
  matchType: "club" | "national";
  playerIdNameDictionary: Record<string, string>;
  teams: {
    home: Team;
    away: Team;
  };
}

export interface MatchBlobEntry {
  matchId: string;
  version: number;
  matchesParquet: ArrayBuffer;
  playersParquet: ArrayBuffer;
  eventsParquet: ArrayBuffer;
  metadata: MatchMetadata;
}

// ──────────────────────────────────────────────
// UI / Filter State
// ──────────────────────────────────────────────

export type OutcomeFilter = "all" | "success" | "fail";

export interface FilterState {
  selectedTeam: string;
  selectedPlayers: Set<number>;
  outcomeFilter: OutcomeFilter;
  activeStrategies: Set<string>;
  activeStrategyParams: Record<string, Record<string, unknown>>;
  timelineSource: "all" | "whoscored" | "custom";
}

// ──────────────────────────────────────────────
// Event Row (DuckDB query result)
// ──────────────────────────────────────────────

export interface EventRow {
  id: number;
  match_id: number;
  event_id: number;
  team_id: number;
  player_id: number | null;
  period: number;
  minute: number;
  second: number;
  expanded_minute: number;
  x: number;
  y: number;
  end_x: number | null;
  end_y: number | null;
  type_value: number;
  type_name: string;
  outcome: boolean;
  is_touch: boolean;
  is_shot?: boolean;
  is_goal?: boolean;
  qualifiers: unknown[];
  
  // Custom Event Fields (source = "custom")
  source?: 'whoscored' | 'custom';
  custom_label?: string;
  custom_memo?: string;

  // strategy boolean projections are dynamic
  [key: `is_strategy_${string}`]: boolean | undefined;
}

// ──────────────────────────────────────────────
// Custom Event (User Memos)
// ──────────────────────────────────────────────

export interface CustomEventRow {
  id: string; // uuid
  match_id: string;
  minute: number;
  second: number;
  labels: string[];
  memo: string;
  created_at: number;
}

export interface MatchSummary {
  id: string;
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  date: string;
  score: string;
  matchType: "club" | "national";
}

