import {
  FORMATION_LIST,
  type FormationType,
  getFormationActualPos,
} from '../data/formations';
import { FORMATION_POSITIONS } from '../data/formations-data';

/**
 * WhoScored のフォーメーション名 (例: "4231", "4-2-3-1", "433", "352") を
 * アプリの FormationType (例: "4-2-3-1", "4-3-3") に正規化する
 */
export function parseWhoScoredFormationName(
  formationName?: string,
): FormationType {
  if (!formationName) return '4-4-2';

  const clean = formationName.trim();
  if ((FORMATION_LIST as readonly string[]).includes(clean)) {
    return clean as FormationType;
  }

  // ハイフンが含まれていない数字列の場合の分解マップ (例: "4231" -> "4-2-3-1")
  const digits = clean.replace(/\\D/g, '');
  const patternMap: Record<string, FormationType> = {
    '4231': '4-2-3-1',
    '433': '4-3-3',
    '442': '4-4-2',
    '343': '3-4-3',
    '352': '3-5-2',
    '3421': '3-4-2-1',
    '3412': '3-4-1-2',
    '3142': '3-1-4-2',
    '3511': '3-5-1-1',
    '334': '3-3-4',
    '3313': '3-3-1-3',
    '3331': '3-3-3-1',
    '3241': '3-2-4-1',
    '4141': '4-1-4-1',
    '4312': '4-3-1-2',
    '4411': '4-4-1-1',
    '451': '4-5-1',
    '4222': '4-2-2-2',
    '4321': '4-3-2-1',
    '4132': '4-1-3-2',
    '4123': '4-1-2-3',
    '424': '4-2-4',
    '4213': '4-2-1-3',
    '532': '5-3-2',
    '541': '5-4-1',
    '523': '5-2-3',
    '5221': '5-2-2-1',
    '2341': '2-3-4-1',
  };

  if (patternMap[digits]) {
    return patternMap[digits];
  }

  return '4-4-2';
}

/**
 * 4-4-2 の標準的な XY 座標マッピング
 * 常に「ホーム視点（Normal）」を基準とした 0-100 の絶対座標系
 */
export const DEFAULT_442_POSITIONS: Record<
  'home' | 'away',
  { x: number; y: number }[]
> = {
  home: FORMATION_POSITIONS['4-4-2'].map((pos) =>
    getFormationActualPos(pos, 'home', 'half'),
  ),
  away: FORMATION_POSITIONS['4-4-2'].map((pos) =>
    getFormationActualPos(pos, 'away', 'half'),
  ),
};
