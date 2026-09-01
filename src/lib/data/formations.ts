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

export type FormationMode = 'full' | 'half';

/**
 * 16:9 横画面におけるピッチ実領域（白線内）の正規化座標定数 (%)
 * SVG viewBox (-9.722, -1, 124.444, 70) 基準:
 * - Left Goal Line: 7.8125%
 * - Right Goal Line: 92.1875%
 * - Halfway Line: 50.0%
 * - Top Touchline: 1.4286%
 * - Bottom Touchline: 98.5714%
 */
export const PITCH_BOUNDS_16_9 = {
  xMin: (9.722 / 124.444) * 100, // 7.8125%
  xMax: ((105 + 9.722) / 124.444) * 100, // 92.1875%
  xMid: 50.0,
  yMin: (1 / 70) * 100, // 1.42857%
  yMax: (69 / 70) * 100, // 98.57143%
  yMid: 50.0,
} as const;

/**
 * 9:16 縦画面におけるピッチ実領域（白線内）の正規化座標定数 (%)
 * SVG viewBox (-1, -9.722, 70, 124.444) 基準:
 * - Left Touchline: 1.4286%
 * - Right Touchline: 98.5714%
 * - Top Goal Line (Away): 7.8125%
 * - Bottom Goal Line (Home): 92.1875%
 * - Halfway Line: 50.0%
 */
export const PITCH_BOUNDS_9_16 = {
  xMin: (1 / 70) * 100, // 1.42857%
  xMax: (69 / 70) * 100, // 98.57143%
  xMid: 50.0,
  yMin: (9.722 / 124.444) * 100, // 7.8125%
  yMax: ((105 + 9.722) / 124.444) * 100, // 92.1875%
  yMid: 50.0,
} as const;

/**
 * 守備側ゴールラインからの比率 (0〜100) をハーフコート守備陣地内（ピッチ白線ゴールライン〜ハーフウェーライン）の絶対座標に変換
 * - GK (top >= 90): 6ヤードボックス内（x: 11.2% 付近）に固定配置
 * - DF (top = 80): ペナルティエリア境界（x: 20.5% 付近）に固定配置
 * - FW (top = 25): ハーフウェーライン手前（x: 44.9% 付近）に固定配置
 * - MID (25 < top < 80): DFとFWの間で縦方向（長手軸）に均等な距離で線形補間配置（3列・4列いずれも均等美配置）
 * - High FW (top < 25): ハーフウェーライン直前（x: 45.0%〜48.3%）へ配置（50%境界超過防止）
 */
export function getHalfCourtPitchPos(
  dist: number,
  team: 'home' | 'away',
): number {
  const isHome = team === 'home';
  const d = Math.max(0, Math.min(100, dist));
  // dist = 100 - top なので top = 100 - d
  const top = 100 - d;

  const RATIO_GK = 0.08; // x ≈ 11.19% (6ヤードボックス内)
  const RATIO_DF = 0.3; // x ≈ 20.47% (ペナルティエリア境界)
  const RATIO_FW = 0.88; // x ≈ 44.94% (FW最前線標準)
  const RATIO_MAX = 0.96; // x ≈ 48.31% (ハーフウェーライン直前)

  // ハーフコート内での進行率 (0.0: ゴールライン 7.81%, 1.0: センターライン 50.0%)
  let ratio: number;
  if (top >= 90) {
    // GK zone: 90~100 -> 0.08 (固定)
    ratio = RATIO_GK;
  } else if (top >= 80) {
    // GK ~ DF zone: 80~90 -> 0.30 ~ 0.08
    const t = (90 - top) / 10;
    ratio = RATIO_GK + t * (RATIO_DF - RATIO_GK);
  } else if (top >= 25) {
    // DF ~ FW zone (全MIDおよび中間ライン): 25~80 -> DFとFW間で完全均等に線形配分
    const t = (80 - top) / (80 - 25); // 0 (at 80/DF) -> 1 (at 25/FW)
    ratio = RATIO_DF + t * (RATIO_FW - RATIO_DF);
  } else {
    // High FW zone: 0~25 -> 0.88 ~ 0.96
    const t = (25 - top) / 25;
    ratio = RATIO_FW + t * (RATIO_MAX - RATIO_FW);
  }

  const halfWidth = PITCH_BOUNDS_16_9.xMid - PITCH_BOUNDS_16_9.xMin; // 50.0 - 7.8125 = 42.1875%
  const homeX = PITCH_BOUNDS_16_9.xMin + ratio * halfWidth;
  return isHome ? homeX : 100 - homeX;
}

/**
 * テンプレート座標 (top, left) を横画面ボードの絶対座標 (Normal/Home視点: x=0..100, y=0..100) に変換する
 */
export function getFormationActualPos(
  pos: { top: number; left: number },
  team: 'home' | 'away',
  mode: FormationMode = 'full',
): { x: number; y: number } {
  const isHome = team === 'home';
  const clampedTop = Math.max(0, Math.min(100, pos.top));
  const clampedLeft = Math.max(0, Math.min(100, pos.left));

  const pitchWidth = PITCH_BOUNDS_16_9.xMax - PITCH_BOUNDS_16_9.xMin;
  const pitchHeight = PITCH_BOUNDS_16_9.yMax - PITCH_BOUNDS_16_9.yMin;

  const yHome = PITCH_BOUNDS_16_9.yMin + (clampedLeft / 100) * pitchHeight;
  const y = isHome ? yHome : 100 - yHome;

  if (mode === 'full') {
    // フルコート: ピッチ白線全域 (7.81%〜92.19%)
    const xDist = 100 - clampedTop;
    const xHome = PITCH_BOUNDS_16_9.xMin + (xDist / 100) * pitchWidth;
    return {
      x: isHome ? xHome : 100 - xHome,
      y,
    };
  } else {
    // ハーフコート: ピッチ白線自陣守備側 (Home: 7.81%〜50.0%, Away: 50.0%〜92.19%)
    const distFromGoal = 100 - clampedTop;
    const x = getHalfCourtPitchPos(distFromGoal, team);
    return {
      x,
      y,
    };
  }
}

/**
 * テンプレート座標 (top, left) を縦画面ボードの絶対座標 (Home: 下陣地 y=50-92.19%, Away: 上陣地 y=7.81-50%) に変換する
 */
export function getFormationActualPosVertical(
  pos: { top: number; left: number },
  team: 'home' | 'away',
  mode: FormationMode = 'half',
): { x: number; y: number } {
  const isHome = team === 'home';
  const clampedTop = Math.max(0, Math.min(100, pos.top));
  const clampedLeft = Math.max(0, Math.min(100, pos.left));

  const pitchWidth = PITCH_BOUNDS_9_16.xMax - PITCH_BOUNDS_9_16.xMin;
  const pitchHeight = PITCH_BOUNDS_9_16.yMax - PITCH_BOUNDS_9_16.yMin;

  const xHome = PITCH_BOUNDS_9_16.xMin + (clampedLeft / 100) * pitchWidth;
  const x = isHome ? xHome : 100 - xHome;

  if (mode === 'full') {
    const yDist = clampedTop;
    const yAway = PITCH_BOUNDS_9_16.yMin + (yDist / 100) * pitchHeight;
    return {
      x,
      y: isHome ? 100 - yAway : yAway,
    };
  } else {
    const distFromGoal = 100 - clampedTop;
    const halfPos = getHalfCourtPitchPos(distFromGoal, 'home');
    return {
      x,
      y: isHome ? 100 - halfPos : halfPos,
    };
  }
}
