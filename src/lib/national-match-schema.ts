import { z } from 'zod';

/**
 * ナショナル・データのプレイヤー配列形式 [名前, 国名コード, 属性配列, PlayerID]
 */
export const NationalPlayerArraySchema = z.tuple([
  z.string(), // name
  z.string().nullable(), // country/flag
  z.array(z.unknown()), // positions/stats
  z.number(), // playerId
]);

export type NationalPlayerArray = z.infer<typeof NationalPlayerArraySchema>;

/**
 * 試合基本情報のインデックス定義 (initialMatchDataForScrappers[0][0])
 */
export const NATIONAL_INFO_IDX = {
  HOME_TEAM_ID: 0,
  AWAY_TEAM_ID: 1,
  HOME_TEAM_NAME: 2,
  AWAY_TEAM_NAME: 3,
  DATE_FULL: 4,
  SCORE: 8,
} as const;

/**
 * 試合基本情報配列形式
 */
export const NationalInfoArraySchema = z
  .tuple([
    z.number(), // 0: HOME_TEAM_ID
    z.number(), // 1: AWAY_TEAM_ID
    z.string(), // 2: HOME_TEAM_NAME
    z.string(), // 3: AWAY_TEAM_NAME
    z.string(), // 4: DATE_FULL
    z.unknown(), // 5
    z.unknown(), // 6
    z.unknown(), // 7
    z.string(), // 8: SCORE
  ])
  .rest(z.unknown());

export type NationalInfoArray = z.infer<typeof NationalInfoArraySchema>;

/**
 * ナショナルのタイムラインイベント形式
 * [0: unknown, 1: unknown, 2: eventType (string), 3..5: unknown, 6: player1Id (number), 7: player2Id (number)]
 */
export type NationalTimelineEvent = [
  unknown,
  unknown,
  string,
  unknown,
  unknown,
  unknown,
  number,
  number,
  ...unknown[],
];

/**
 * ナショナルのタイムラインピリオド形式
 * [0: minute (number), 1: homeEvents (NationalTimelineEvent[] | undefined), 2: awayEvents (NationalTimelineEvent[] | undefined)]
 */
export type NationalTimelinePeriod = [
  number,
  NationalTimelineEvent[] | undefined,
  NationalTimelineEvent[] | undefined,
  ...unknown[],
];

/**
 * ラインアップ情報 (配列だが特定のインデックスにアクセスする)
 */
export const NationalLineupDataSchema = z
  .tuple([
    z.unknown(), // 0
    z.unknown(), // 1
    z.unknown(), // 2
    z.unknown(), // 3
    z.unknown(), // 4
    z.unknown(), // 5
    z.unknown(), // 6
    z.unknown(), // 7
    z.unknown(), // 8
    z.array(NationalPlayerArraySchema), // 9: homeStarters
    z.array(NationalPlayerArraySchema), // 10: awayStarters
    z.array(NationalPlayerArraySchema), // 11: homeBench
    z.array(NationalPlayerArraySchema), // 12: awayBench
  ])
  .rest(z.unknown());

export type NationalLineupData = z.infer<typeof NationalLineupDataSchema>;

/**
 * ナショナル・データのルート構造
 * initialMatchDataForScrappers[0] に主要データが格納される
 */
export const NationalMatchRawDataSchema = z.object({
  initialMatchDataForScrappers: z
    .tuple([
      z.tuple([
        NationalInfoArraySchema, // 0: match info
        z.custom<NationalTimelinePeriod[]>(), // 1: timeline (配列の配列)
        NationalLineupDataSchema, // 2: lineups info
      ]),
    ])
    .rest(z.unknown()),
});

export type NationalMatchRawData = z.infer<typeof NationalMatchRawDataSchema>;

/**
 * ドメインモデルへ変換後のラインアップ
 */
export interface FormattedPlayer {
  name: string;
  playerId: number;
  isFirstEleven: boolean;
}

export interface FormattedMatchData {
  lineups: {
    homeStarters: FormattedPlayer[];
    awayStarters: FormattedPlayer[];
    homeBench: FormattedPlayer[];
    awayBench: FormattedPlayer[];
  };
  timeline: NationalTimelinePeriod[];
}

/**
 * DD/MM/YYYY HH:mm:ss 形式の文字列を YYYY-MM-DD に変換する
 */
export function parseNationalDate(dateStr: string): string {
  if (!dateStr) return '';
  const [datePart] = dateStr.split(' ');
  const parts = datePart.split('/');
  if (parts.length !== 3) return dateStr;

  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}
