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
