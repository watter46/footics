import {
  type FormationMode,
  type FormationType,
  getFormationActualPos,
} from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import {
  type AspectRatio,
  isVerticalAspectRatio,
  transformCoord,
} from '@/lib/types/tactical/primitives';
import type { FormationPlacement, FormationTeam } from './formation-translator';

export interface FormationBuildOptions {
  readonly aspectRatio: AspectRatio;
  readonly isSidesSwapped?: boolean;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

/** ピッチ白線枠内 (3..97) へ収容し、サイド入れ替え時は 180 度反転する。 */
function toPlacementPoint(raw: Point, isSidesSwapped?: boolean) {
  const x = Math.max(3, Math.min(97, raw.x));
  const y = Math.max(3, Math.min(97, raw.y));
  return {
    x: clampToScreenNorm(isSidesSwapped ? 100 - x : x),
    y: clampToScreenNorm(isSidesSwapped ? 100 - y : y),
  };
}

/** 登録済みフォーメーション名から 11 人分の配置を計算する。未登録名は空配列。 */
export function buildFormationPlacements(
  formationName: FormationType,
  team: FormationTeam,
  mode: FormationMode,
  options: FormationBuildOptions,
): readonly FormationPlacement[] {
  const positions = FORMATION_POSITIONS[formationName];
  if (!positions) return [];
  const isVertical = isVerticalAspectRatio(options.aspectRatio);

  return positions.map((pos) => {
    let target: Point = getFormationActualPos(
      pos,
      team,
      mode,
      options.aspectRatio,
    );
    // GK はゴールライン直前・中央へ固定する
    if (pos.position === 'GK') {
      const gk = { x: team === 'home' ? 7 : 93, y: 50 };
      target = isVertical
        ? transformCoord(gk, '16:9', options.aspectRatio)
        : gk;
    }
    const point = toPlacementPoint(target, options.isSidesSwapped);
    return {
      shirtNo: String(pos.id),
      position: pos.position,
      x: point.x,
      y: point.y,
    };
  });
}

export interface PresetPlayerInput {
  readonly shirtNo: string;
  readonly position: string;
  readonly x: number;
  readonly y: number;
}

/** 保存済みプリセット（16:9 基準の画面座標）を現在のアスペクト比の配置へ変換する。 */
export function buildPlacementsFromPreset(
  players: readonly PresetPlayerInput[],
  aspectRatio: AspectRatio,
): readonly FormationPlacement[] {
  const isVertical = isVerticalAspectRatio(aspectRatio);
  return players.map((pp) => {
    const raw = { x: pp.x, y: pp.y };
    const pos = isVertical ? transformCoord(raw, '16:9', aspectRatio) : raw;
    return {
      shirtNo: pp.shirtNo,
      position: pp.position,
      x: clampToScreenNorm(pos.x),
      y: clampToScreenNorm(pos.y),
    };
  });
}
