export type FormationPosition = {
  id: number;
  group: 'GK' | 'DF' | 'MF' | 'FW';
  position:
    | 'GK'
    | 'CB'
    | 'LB'
    | 'RB'
    | 'LWB'
    | 'RWB'
    | 'DM'
    | 'CM'
    | 'AM'
    | 'LM'
    | 'RM'
    | 'LW'
    | 'RW'
    | 'ST'
    | 'SS';
  top: number;
  left: number;
};

export const FORMATION_LIST = [
  '2-3-4-1',
  '3-5-2',
  '3-4-3',
  '3-4-2-1',
  '3-4-1-2',
  '3-1-4-2',
  '3-5-1-1',
  '3-3-4',
  '3-3-1-3',
  '3-3-3-1',
  '3-2-4-1',
  '4-2-3-1',
  '4-3-3',
  '4-4-2',
  '4-1-4-1',
  '4-3-1-2',
  '4-4-1-1',
  '4-5-1',
  '4-2-2-2',
  '4-3-2-1',
  '4-1-3-2',
  '4-1-2-3',
  '4-2-4',
  '4-2-1-3',
  '5-3-2',
  '5-4-1',
  '5-2-3',
  '5-2-2-1',
] as const;

export type FormationType = (typeof FORMATION_LIST)[number];

import { FORMATION_POSITIONS } from './formations-data';

export type FormationMode = 'full' | 'half';

/**
 * テンプレート座標 (top, left) をボートの絶対座標 (Normal/Home視点) に変換する
 */
export function getFormationActualPos(
  pos: { top: number; left: number },
  team: 'home' | 'away',
  mode: FormationMode = 'full',
): { x: number; y: number } {
  const isHome = team === 'home';

  if (mode === 'full') {
    // フルコート: Pitch全体 (x: 10-90)
    return {
      x: isHome ? 100 - pos.top : pos.top,
      y: isHome ? pos.left : 100 - pos.left,
    };
  } else {
    // ハーフコート: 自陣側半分 (x: 0-50 または 50-100)
    // Home: 10-90 -> 5-45
    // Away: 10-90 -> 55-95
    const fullX = isHome ? 100 - pos.top : pos.top;
    if (isHome) {
      return {
        x: fullX * 0.5,
        y: pos.left,
      };
    } else {
      return {
        x: 100 - (100 - fullX) * 0.5,
        y: 100 - pos.left,
      };
    }
  }
}
