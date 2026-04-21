import { z } from 'zod';

/**
 * ナショナル・データのプレイヤー配列形式 [名前, 国名コード, 属性配列, PlayerID]
 */
export const NationalPlayerArraySchema = z.tuple([
  z.string(), // name
  z.string().nullable(), // country/flag
  z.array(z.any()), // positions/stats
  z.number(), // playerId
]);

export type NationalPlayerArray = z.infer<typeof NationalPlayerArraySchema>;

/**
 * ラインアップ情報 (配列だが特定のインデックスにアクセスする)
 */
export const NationalLineupDataSchema = z.array(z.any());

/**
 * ナショナル・データのルート構造
 * initialMatchDataForScrappers[0] に主要データが格納される
 */
export const NationalMatchRawDataSchema = z.object({
  initialMatchDataForScrappers: z
    .tuple([
      z.tuple([
        z.any(), // 0: unknown
        z.array(z.any()), // 1: timeline (配列の配列)
        z.array(z.any()), // 2: lineups info
      ]),
    ])
    .rest(z.any()),
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
  timeline: any[];
}

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
