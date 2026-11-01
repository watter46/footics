import type { Player } from '@/types';

export type Season = '26-27' | '25-26' | '24-25';

export const AVAILABLE_SEASONS: readonly Season[] = [
  '26-27',
  '25-26',
  '24-25',
] as const;

export const DEFAULT_SEASON: Season = '26-27';

export interface PresetPlayer {
  playerId: number;
  name: string;
  shirtNo: number;
  position: Player['position'];
  isFirstEleven?: boolean;
  season?: Season;
}

/**
 * 2024-2025 シーズン
 */
const CHELSEA_SQUAD_24_25: PresetPlayer[] = [
  // GK
  {
    playerId: 362151,
    name: 'Robert Sánchez',
    shirtNo: 1,
    position: 'GK',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 404749,
    name: 'Filip Jörgensen',
    shirtNo: 12,
    position: 'GK',
    isFirstEleven: false,
    season: '24-25',
  },

  // DF
  {
    playerId: 361330,
    name: 'Reece James',
    shirtNo: 24,
    position: 'DR',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 403850,
    name: 'Malo Gusto',
    shirtNo: 27,
    position: 'DR',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 373946,
    name: 'Wesley Fofana',
    shirtNo: 29,
    position: 'DC',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 421351,
    name: 'Levi Colwill',
    shirtNo: 6,
    position: 'DC',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 363496,
    name: 'Marc Cucurella',
    shirtNo: 3,
    position: 'DL',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 136464,
    name: 'Tosin Adarabioyo',
    shirtNo: 4,
    position: 'DC',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 365406,
    name: 'Benoît Badiashile',
    shirtNo: 5,
    position: 'DC',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 300426,
    name: 'Axel Disasi',
    shirtNo: 2,
    position: 'DC',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 434077,
    name: 'Renato Veiga',
    shirtNo: 40,
    position: 'DL',
    isFirstEleven: false,
    season: '24-25',
  },

  // MF
  {
    playerId: 410175,
    name: 'Moisés Caicedo',
    shirtNo: 25,
    position: 'DMC',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 369430,
    name: 'Enzo Fernández',
    shirtNo: 8,
    position: 'MC',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 395692,
    name: 'Cole Palmer',
    shirtNo: 20,
    position: 'AMC',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 425319,
    name: 'Roméo Lavia',
    shirtNo: 45,
    position: 'DMC',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 391256,
    name: 'Kiernan Dewsbury-Hall',
    shirtNo: 22,
    position: 'MC',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 410639,
    name: 'Carney Chukwuemeka',
    shirtNo: 17,
    position: 'AMC',
    isFirstEleven: false,
    season: '24-25',
  },

  // FW / WING
  {
    playerId: 389935,
    name: 'Noni Madueke',
    shirtNo: 11,
    position: 'AMR',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 337916,
    name: 'Pedro Neto',
    shirtNo: 7,
    position: 'AML',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 426050,
    name: 'Nicolas Jackson',
    shirtNo: 15,
    position: 'FW',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 300945,
    name: 'Christopher Nkunku',
    shirtNo: 18,
    position: 'FW',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 362431,
    name: 'João Félix',
    shirtNo: 14,
    position: 'AMC',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 346300,
    name: 'Jadon Sancho',
    shirtNo: 19,
    position: 'AML',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 409376,
    name: 'Mykhailo Mudryk',
    shirtNo: 10,
    position: 'AML',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 483208,
    name: 'Marc Guiu',
    shirtNo: 38,
    position: 'FW',
    isFirstEleven: false,
    season: '24-25',
  },
];

/**
 * 2025-2026 シーズン
 */
const CHELSEA_SQUAD_25_26: PresetPlayer[] = [
  // GK
  {
    playerId: 362151,
    name: 'Robert Sánchez',
    shirtNo: 1,
    position: 'GK',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 404749,
    name: 'Filip Jörgensen',
    shirtNo: 12,
    position: 'GK',
    isFirstEleven: false,
    season: '25-26',
  },

  // DF
  {
    playerId: 361330,
    name: 'Reece James',
    shirtNo: 24,
    position: 'DR',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 403850,
    name: 'Malo Gusto',
    shirtNo: 27,
    position: 'DR',
    isFirstEleven: false,
    season: '25-26',
  },
  {
    playerId: 373946,
    name: 'Wesley Fofana',
    shirtNo: 29,
    position: 'DC',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 421351,
    name: 'Levi Colwill',
    shirtNo: 6,
    position: 'DC',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 363496,
    name: 'Marc Cucurella',
    shirtNo: 3,
    position: 'DL',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 136464,
    name: 'Tosin Adarabioyo',
    shirtNo: 4,
    position: 'DC',
    isFirstEleven: false,
    season: '25-26',
  },
  {
    playerId: 365406,
    name: 'Benoît Badiashile',
    shirtNo: 5,
    position: 'DC',
    isFirstEleven: false,
    season: '25-26',
  },

  // MF
  {
    playerId: 410175,
    name: 'Moisés Caicedo',
    shirtNo: 25,
    position: 'DMC',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 369430,
    name: 'Enzo Fernández',
    shirtNo: 8,
    position: 'MC',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 395692,
    name: 'Cole Palmer',
    shirtNo: 20,
    position: 'AMC',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 425319,
    name: 'Roméo Lavia',
    shirtNo: 45,
    position: 'DMC',
    isFirstEleven: false,
    season: '25-26',
  },
  {
    playerId: 477772,
    name: 'Kendry Páez',
    shirtNo: 32,
    position: 'AMC',
    isFirstEleven: false,
    season: '25-26',
  },

  // FW / WING
  {
    playerId: 510728,
    name: 'Estêvão Willian',
    shirtNo: 41,
    position: 'AMR',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 337916,
    name: 'Pedro Neto',
    shirtNo: 7,
    position: 'AML',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 426050,
    name: 'Nicolas Jackson',
    shirtNo: 15,
    position: 'FW',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 300945,
    name: 'Christopher Nkunku',
    shirtNo: 18,
    position: 'FW',
    isFirstEleven: false,
    season: '25-26',
  },
  {
    playerId: 389935,
    name: 'Noni Madueke',
    shirtNo: 11,
    position: 'AMR',
    isFirstEleven: false,
    season: '25-26',
  },
  {
    playerId: 362431,
    name: 'João Félix',
    shirtNo: 14,
    position: 'AMC',
    isFirstEleven: false,
    season: '25-26',
  },
  {
    playerId: 483208,
    name: 'Marc Guiu',
    shirtNo: 38,
    position: 'FW',
    isFirstEleven: false,
    season: '25-26',
  },
];

/**
 * 2026-2027 シーズン
 */
const CHELSEA_SQUAD_26_27: PresetPlayer[] = [
  // GK
  {
    playerId: 362151,
    name: 'Robert Sánchez',
    shirtNo: 1,
    position: 'GK',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 404749,
    name: 'Filip Jörgensen',
    shirtNo: 12,
    position: 'GK',
    isFirstEleven: false,
    season: '26-27',
  },

  // DF
  {
    playerId: 361330,
    name: 'Reece James',
    shirtNo: 24,
    position: 'DR',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 403850,
    name: 'Malo Gusto',
    shirtNo: 27,
    position: 'DR',
    isFirstEleven: false,
    season: '26-27',
  },
  {
    playerId: 373946,
    name: 'Wesley Fofana',
    shirtNo: 29,
    position: 'DC',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 421351,
    name: 'Levi Colwill',
    shirtNo: 6,
    position: 'DC',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 363496,
    name: 'Marc Cucurella',
    shirtNo: 3,
    position: 'DL',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 136464,
    name: 'Tosin Adarabioyo',
    shirtNo: 4,
    position: 'DC',
    isFirstEleven: false,
    season: '26-27',
  },

  // MF
  {
    playerId: 410175,
    name: 'Moisés Caicedo',
    shirtNo: 25,
    position: 'DMC',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 369430,
    name: 'Enzo Fernández',
    shirtNo: 8,
    position: 'MC',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 395692,
    name: 'Cole Palmer',
    shirtNo: 20,
    position: 'AMC',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 425319,
    name: 'Roméo Lavia',
    shirtNo: 45,
    position: 'DMC',
    isFirstEleven: false,
    season: '26-27',
  },
  {
    playerId: 477772,
    name: 'Kendry Páez',
    shirtNo: 32,
    position: 'AMC',
    isFirstEleven: false,
    season: '26-27',
  },

  // FW / WING
  {
    playerId: 510728,
    name: 'Estêvão Willian',
    shirtNo: 11,
    position: 'AMR',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 337916,
    name: 'Pedro Neto',
    shirtNo: 7,
    position: 'AML',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 426050,
    name: 'Nicolas Jackson',
    shirtNo: 9,
    position: 'FW',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 300945,
    name: 'Christopher Nkunku',
    shirtNo: 18,
    position: 'FW',
    isFirstEleven: false,
    season: '26-27',
  },
  {
    playerId: 362431,
    name: 'João Félix',
    shirtNo: 14,
    position: 'AMC',
    isFirstEleven: false,
    season: '26-27',
  },
  {
    playerId: 483208,
    name: 'Marc Guiu',
    shirtNo: 19,
    position: 'FW',
    isFirstEleven: false,
    season: '26-27',
  },
];

export const CHELSEA_PRESETS_BY_SEASON: Record<Season, PresetPlayer[]> = {
  '26-27': CHELSEA_SQUAD_26_27,
  '25-26': CHELSEA_SQUAD_25_26,
  '24-25': CHELSEA_SQUAD_24_25,
};

/**
 * デフォルトプリセットスカッド
 */
export const CHELSEA_PRESET_SQUAD: PresetPlayer[] =
  CHELSEA_PRESETS_BY_SEASON[DEFAULT_SEASON];

/**
 * 対戦相手（AWAY）のデフォルトダミースカッド (1〜11番)
 */
export const DEFAULT_OPPONENT_SQUAD: PresetPlayer[] = [
  {
    playerId: 999001,
    name: 'Away GK',
    shirtNo: 1,
    position: 'GK',
    isFirstEleven: true,
  },
  {
    playerId: 999002,
    name: 'Away DR',
    shirtNo: 2,
    position: 'DR',
    isFirstEleven: true,
  },
  {
    playerId: 999003,
    name: 'Away DC (R)',
    shirtNo: 4,
    position: 'DC',
    isFirstEleven: true,
  },
  {
    playerId: 999004,
    name: 'Away DC (L)',
    shirtNo: 5,
    position: 'DC',
    isFirstEleven: true,
  },
  {
    playerId: 999005,
    name: 'Away DL',
    shirtNo: 3,
    position: 'DL',
    isFirstEleven: true,
  },
  {
    playerId: 999006,
    name: 'Away DMC',
    shirtNo: 6,
    position: 'DMC',
    isFirstEleven: true,
  },
  {
    playerId: 999007,
    name: 'Away MC',
    shirtNo: 8,
    position: 'MC',
    isFirstEleven: true,
  },
  {
    playerId: 999008,
    name: 'Away AMR',
    shirtNo: 7,
    position: 'AMR',
    isFirstEleven: true,
  },
  {
    playerId: 999009,
    name: 'Away AMC',
    shirtNo: 10,
    position: 'AMC',
    isFirstEleven: true,
  },
  {
    playerId: 999010,
    name: 'Away AML',
    shirtNo: 11,
    position: 'AML',
    isFirstEleven: true,
  },
  {
    playerId: 999011,
    name: 'Away FW',
    shirtNo: 9,
    position: 'FW',
    isFirstEleven: true,
  },
  // Bench
  {
    playerId: 999012,
    name: 'Away Sub GK',
    shirtNo: 12,
    position: 'GK',
    isFirstEleven: false,
  },
  {
    playerId: 999013,
    name: 'Away Sub DF',
    shirtNo: 13,
    position: 'DC',
    isFirstEleven: false,
  },
  {
    playerId: 999014,
    name: 'Away Sub MF',
    shirtNo: 14,
    position: 'MC',
    isFirstEleven: false,
  },
  {
    playerId: 999015,
    name: 'Away Sub FW',
    shirtNo: 15,
    position: 'FW',
    isFirstEleven: false,
  },
];
