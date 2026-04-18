import type { EventStrategy } from '../event-strategy';

/**
 * ゾーン境界定義 (Opta 0-100 座標系)
 * X軸 (縦4分割): 0-25, 25-50, 50-75, 75-100
 * Y軸 (横5レーン): 0-20, 20-40, 40-60, 60-80, 80-100
 *
 * ゾーンインデックス (0-19):
 *   Y\X   0-25  25-50  50-75  75-100
 *   0-20:   0      1      2      3
 *  20-40:   4      5      6      7
 *  40-60:   8      9     10     11
 *  60-80:  12     13     14     15
 * 80-100:  16     17     18     19
 */
const ZONE_X_BOUNDS = [
  [0, 25],
  [25, 50],
  [50, 75],
  [75, 100],
] as const;

const ZONE_Y_BOUNDS = [
  [0, 20],
  [20, 40],
  [40, 60],
  [60, 80],
  [80, 100],
] as const;

/** ゾーンインデックスから X/Y 座標範囲を取得 */
function getZoneBounds(zoneIndex: number) {
  const yIdx = Math.floor(zoneIndex / 4);
  const xIdx = zoneIndex % 4;
  return {
    xMin: ZONE_X_BOUNDS[xIdx][0],
    xMax: ZONE_X_BOUNDS[xIdx][1],
    yMin: ZONE_Y_BOUNDS[yIdx][0],
    yMax: ZONE_Y_BOUNDS[yIdx][1],
  };
}

/** 距離プリセット定義 (メートル) */
const LENGTH_PRESETS: Record<string, { min: number; max: number }> = {
  short: { min: 0, max: 15 },
  middle: { min: 15, max: 32 },
  long: { min: 32, max: 999 },
};

export const TargetedPassStrategy: EventStrategy = {
  id: 'targeted-pass',
  label: 'Targeted Pass',
  description:
    'Analyze passes by distance and target zone (use Player Filter for passer selection)',
  color:
    'bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-[0_0_15px_rgba(192,38,211,0.5)]',
  params: [
    { id: 'length', type: 'length', label: 'Pass Length' },
    { id: 'zone', type: 'zone', label: 'Target Zone' },
  ],
  sqlCondition: (params) => {
    const { length, zone } = params;
    const conditions: string[] = ['type_value = 1'];

    // --- 距離条件 (Qualifier 212) ---
    // length は複数プリセット選択またはカスタム min/max を持つ
    if (length) {
      const lengthExpr = `(SELECT CAST(t.q.value AS FLOAT) FROM UNNEST(qualifiers) AS t(q) WHERE t.q.type.value = 212 LIMIT 1)`;

      // 複数プリセットが選択されている場合
      if (
        length.presets &&
        Array.isArray(length.presets) &&
        length.presets.length > 0
      ) {
        const rangeConditions = (length.presets as string[]).map(
          (presetId: string) => {
            const preset = LENGTH_PRESETS[presetId];
            if (!preset) return 'FALSE';
            return `(${lengthExpr} BETWEEN ${preset.min} AND ${preset.max})`;
          },
        );
        conditions.push(`(${rangeConditions.join(' OR ')})`);
      }
      // カスタム min/max が指定されている場合（プリセットより優先）
      else if (
        (length.min !== undefined && length.min !== '') ||
        (length.max !== undefined && length.max !== '')
      ) {
        const min =
          length.min !== undefined && length.min !== ''
            ? Number(length.min)
            : undefined;
        const max =
          length.max !== undefined && length.max !== ''
            ? Number(length.max)
            : undefined;

        if (min !== undefined && max !== undefined) {
          conditions.push(`${lengthExpr} BETWEEN ${min} AND ${max}`);
        } else if (min !== undefined) {
          conditions.push(`${lengthExpr} >= ${min}`);
        } else if (max !== undefined) {
          conditions.push(`${lengthExpr} <= ${max}`);
        }
      }
    }

    // --- エリア条件 (Qualifier 140/141) ---
    if (zone && Array.isArray(zone) && zone.length > 0) {
      const passEndX = `(SELECT CAST(t.q.value AS FLOAT) FROM UNNEST(qualifiers) AS t(q) WHERE t.q.type.value = 140 LIMIT 1)`;
      const passEndY = `(SELECT CAST(t.q.value AS FLOAT) FROM UNNEST(qualifiers) AS t(q) WHERE t.q.type.value = 141 LIMIT 1)`;

      const zoneConditions = (zone as number[]).map((zoneIdx: number) => {
        const bounds = getZoneBounds(zoneIdx);
        return `(${passEndX} >= ${bounds.xMin} AND ${passEndX} < ${bounds.xMax} AND ${passEndY} >= ${bounds.yMin} AND ${passEndY} < ${bounds.yMax})`;
      });

      conditions.push(`(${zoneConditions.join(' OR ')})`);
    }

    return conditions.join(' AND ');
  },
};
