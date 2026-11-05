import { calculateNormalizedPitchBounds } from '@/lib/tactical/pitch-geometry';
import {
  type AspectRatio,
  isHorizontalAspectRatio,
} from '@/lib/types/tactical/primitives';

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
 * テンプレート座標 (top, left) を各アスペクト比の絶対座標 (Normal/Home視点: x=0..100, y=0..100) に変換する
 */
export function getFormationActualPos(
  top: number,
  left: number,
  isAway: boolean,
  aspectRatio?: AspectRatio,
): { x: number; y: number };
export function getFormationActualPos(
  pos: { top: number; left: number },
  team: 'home' | 'away',
  mode?: FormationMode,
  aspectRatio?: AspectRatio,
): { x: number; y: number };
export function getFormationActualPos(
  arg1: number | { top: number; left: number },
  arg2: number | 'home' | 'away',
  arg3?: boolean | FormationMode,
  arg4?: AspectRatio,
): { x: number; y: number } {
  let top: number;
  let left: number;
  let isAway: boolean;
  let mode: FormationMode = 'full';
  let aspectRatio: AspectRatio = '16:9';

  if (typeof arg1 === 'object') {
    top = arg1.top;
    left = arg1.left;
    isAway = arg2 === 'away';
    if (arg3 === 'half' || arg3 === 'full') {
      mode = arg3;
    }
    if (typeof arg4 === 'string') {
      aspectRatio = arg4;
    }
  } else {
    top = arg1;
    left = arg2 as number;
    isAway = Boolean(arg3);
    if (arg4) {
      aspectRatio = arg4;
    }
  }

  const clampedTop = Math.max(0, Math.min(100, top));
  const clampedLeft = Math.max(0, Math.min(100, left));

  const depthFactor = mode === 'half' ? 0.5 : 1.0;
  const depthRatio = ((100 - clampedTop) / 100) * depthFactor;
  const attackRatio = isAway ? 1 - depthRatio : depthRatio;
  const widthRatio = isAway ? (100 - clampedLeft) / 100 : clampedLeft / 100;

  const bounds = calculateNormalizedPitchBounds();
  const isHorizontal = isHorizontalAspectRatio(aspectRatio);

  if (isHorizontal) {
    return {
      x: bounds.xMin + attackRatio * bounds.pitchWidth,
      y: bounds.yMin + (1 - widthRatio) * bounds.pitchHeight,
    };
  }

  return {
    x: bounds.xMin + widthRatio * bounds.pitchWidth,
    y: bounds.yMax - attackRatio * bounds.pitchHeight,
  };
}

/**
 * テンプレート座標 (top, left) を縦画面ボードの絶対座標 (Home: 下陣地, Away: 上陣地) に変換する (4:5 委譲)
 */
export function getFormationActualPosVertical(
  top: number,
  left: number,
  isAway: boolean,
): { x: number; y: number };
export function getFormationActualPosVertical(
  pos: { top: number; left: number },
  team: 'home' | 'away',
  mode?: FormationMode,
): { x: number; y: number };
export function getFormationActualPosVertical(
  arg1: number | { top: number; left: number },
  arg2: number | 'home' | 'away',
  arg3?: boolean | FormationMode,
): { x: number; y: number } {
  if (typeof arg1 === 'object') {
    return getFormationActualPos(
      arg1,
      arg2 as 'home' | 'away',
      arg3 as FormationMode,
      '4:5',
    );
  }
  return getFormationActualPos(arg1, arg2 as number, Boolean(arg3), '4:5');
}
