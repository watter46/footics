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
    playerId: 345001,
    name: 'Robert Sánchez',
    shirtNo: 1,
    position: 'GK',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 345002,
    name: 'Filip Jörgensen',
    shirtNo: 12,
    position: 'GK',
    isFirstEleven: false,
    season: '24-25',
  },

  // DF
  {
    playerId: 345003,
    name: 'Reece James',
    shirtNo: 24,
    position: 'DR',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 345004,
    name: 'Malo Gusto',
    shirtNo: 27,
    position: 'DR',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 345005,
    name: 'Wesley Fofana',
    shirtNo: 29,
    position: 'DC',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 345006,
    name: 'Levi Colwill',
    shirtNo: 6,
    position: 'DC',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 345007,
    name: 'Marc Cucurella',
    shirtNo: 3,
    position: 'DL',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 345008,
    name: 'Tosin Adarabioyo',
    shirtNo: 4,
    position: 'DC',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 345009,
    name: 'Benoît Badiashile',
    shirtNo: 5,
    position: 'DC',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 345010,
    name: 'Axel Disasi',
    shirtNo: 2,
    position: 'DC',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 345011,
    name: 'Renato Veiga',
    shirtNo: 40,
    position: 'DL',
    isFirstEleven: false,
    season: '24-25',
  },

  // MF
  {
    playerId: 345012,
    name: 'Moisés Caicedo',
    shirtNo: 25,
    position: 'DMC',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 345013,
    name: 'Enzo Fernández',
    shirtNo: 8,
    position: 'MC',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 345014,
    name: 'Cole Palmer',
    shirtNo: 20,
    position: 'AMC',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 345015,
    name: 'Roméo Lavia',
    shirtNo: 45,
    position: 'DMC',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 345016,
    name: 'Kiernan Dewsbury-Hall',
    shirtNo: 22,
    position: 'MC',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 345017,
    name: 'Carney Chukwuemeka',
    shirtNo: 17,
    position: 'AMC',
    isFirstEleven: false,
    season: '24-25',
  },

  // FW / WING
  {
    playerId: 345018,
    name: 'Noni Madueke',
    shirtNo: 11,
    position: 'AMR',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 345019,
    name: 'Pedro Neto',
    shirtNo: 7,
    position: 'AML',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 345020,
    name: 'Nicolas Jackson',
    shirtNo: 15,
    position: 'FW',
    isFirstEleven: true,
    season: '24-25',
  },
  {
    playerId: 345021,
    name: 'Christopher Nkunku',
    shirtNo: 18,
    position: 'FW',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 345022,
    name: 'João Félix',
    shirtNo: 14,
    position: 'AMC',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 345023,
    name: 'Jadon Sancho',
    shirtNo: 19,
    position: 'AML',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 345024,
    name: 'Mykhailo Mudryk',
    shirtNo: 10,
    position: 'AML',
    isFirstEleven: false,
    season: '24-25',
  },
  {
    playerId: 345025,
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
    playerId: 345001,
    name: 'Robert Sánchez',
    shirtNo: 1,
    position: 'GK',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 345002,
    name: 'Filip Jörgensen',
    shirtNo: 12,
    position: 'GK',
    isFirstEleven: false,
    season: '25-26',
  },

  // DF
  {
    playerId: 345003,
    name: 'Reece James',
    shirtNo: 24,
    position: 'DR',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 345004,
    name: 'Malo Gusto',
    shirtNo: 27,
    position: 'DR',
    isFirstEleven: false,
    season: '25-26',
  },
  {
    playerId: 345005,
    name: 'Wesley Fofana',
    shirtNo: 29,
    position: 'DC',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 345006,
    name: 'Levi Colwill',
    shirtNo: 6,
    position: 'DC',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 345007,
    name: 'Marc Cucurella',
    shirtNo: 3,
    position: 'DL',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 345008,
    name: 'Tosin Adarabioyo',
    shirtNo: 4,
    position: 'DC',
    isFirstEleven: false,
    season: '25-26',
  },
  {
    playerId: 345009,
    name: 'Benoît Badiashile',
    shirtNo: 5,
    position: 'DC',
    isFirstEleven: false,
    season: '25-26',
  },

  // MF
  {
    playerId: 345012,
    name: 'Moisés Caicedo',
    shirtNo: 25,
    position: 'DMC',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 345013,
    name: 'Enzo Fernández',
    shirtNo: 8,
    position: 'MC',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 345014,
    name: 'Cole Palmer',
    shirtNo: 20,
    position: 'AMC',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 345015,
    name: 'Roméo Lavia',
    shirtNo: 45,
    position: 'DMC',
    isFirstEleven: false,
    season: '25-26',
  },
  {
    playerId: 345027,
    name: 'Kendry Páez',
    shirtNo: 32,
    position: 'AMC',
    isFirstEleven: false,
    season: '25-26',
  },

  // FW / WING
  {
    playerId: 345026,
    name: 'Estêvão Willian',
    shirtNo: 41,
    position: 'AMR',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 345019,
    name: 'Pedro Neto',
    shirtNo: 7,
    position: 'AML',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 345020,
    name: 'Nicolas Jackson',
    shirtNo: 15,
    position: 'FW',
    isFirstEleven: true,
    season: '25-26',
  },
  {
    playerId: 345021,
    name: 'Christopher Nkunku',
    shirtNo: 18,
    position: 'FW',
    isFirstEleven: false,
    season: '25-26',
  },
  {
    playerId: 345018,
    name: 'Noni Madueke',
    shirtNo: 11,
    position: 'AMR',
    isFirstEleven: false,
    season: '25-26',
  },
  {
    playerId: 345022,
    name: 'João Félix',
    shirtNo: 14,
    position: 'AMC',
    isFirstEleven: false,
    season: '25-26',
  },
  {
    playerId: 345025,
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
    playerId: 345001,
    name: 'Robert Sánchez',
    shirtNo: 1,
    position: 'GK',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 345002,
    name: 'Filip Jörgensen',
    shirtNo: 12,
    position: 'GK',
    isFirstEleven: false,
    season: '26-27',
  },

  // DF
  {
    playerId: 345003,
    name: 'Reece James',
    shirtNo: 24,
    position: 'DR',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 345004,
    name: 'Malo Gusto',
    shirtNo: 27,
    position: 'DR',
    isFirstEleven: false,
    season: '26-27',
  },
  {
    playerId: 345005,
    name: 'Wesley Fofana',
    shirtNo: 29,
    position: 'DC',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 345006,
    name: 'Levi Colwill',
    shirtNo: 6,
    position: 'DC',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 345007,
    name: 'Marc Cucurella',
    shirtNo: 3,
    position: 'DL',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 345008,
    name: 'Tosin Adarabioyo',
    shirtNo: 4,
    position: 'DC',
    isFirstEleven: false,
    season: '26-27',
  },

  // MF
  {
    playerId: 345012,
    name: 'Moisés Caicedo',
    shirtNo: 25,
    position: 'DMC',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 345013,
    name: 'Enzo Fernández',
    shirtNo: 8,
    position: 'MC',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 345014,
    name: 'Cole Palmer',
    shirtNo: 20,
    position: 'AMC',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 345015,
    name: 'Roméo Lavia',
    shirtNo: 45,
    position: 'DMC',
    isFirstEleven: false,
    season: '26-27',
  },
  {
    playerId: 345027,
    name: 'Kendry Páez',
    shirtNo: 32,
    position: 'AMC',
    isFirstEleven: false,
    season: '26-27',
  },

  // FW / WING
  {
    playerId: 345026,
    name: 'Estêvão Willian',
    shirtNo: 11,
    position: 'AMR',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 345019,
    name: 'Pedro Neto',
    shirtNo: 7,
    position: 'AML',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 345020,
    name: 'Nicolas Jackson',
    shirtNo: 9,
    position: 'FW',
    isFirstEleven: true,
    season: '26-27',
  },
  {
    playerId: 345021,
    name: 'Christopher Nkunku',
    shirtNo: 18,
    position: 'FW',
    isFirstEleven: false,
    season: '26-27',
  },
  {
    playerId: 345022,
    name: 'João Félix',
    shirtNo: 14,
    position: 'AMC',
    isFirstEleven: false,
    season: '26-27',
  },
  {
    playerId: 345025,
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
