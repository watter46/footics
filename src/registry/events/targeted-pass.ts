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
  predicate: (event, params) => {
    if (event.type_value !== 1) return false;

    const { length, zone } = params;
    const qualifiers = (event.qualifiers || []) as {
      type: { value: number };
      value?: string;
    }[];

    if (length) {
      const lengthQ = qualifiers.find((q) => q.type?.value === 212);
      if (!lengthQ || lengthQ.value === undefined) return false;
      const passLength = Number.parseFloat(lengthQ.value);

      if (
        length.presets &&
        Array.isArray(length.presets) &&
        length.presets.length > 0
      ) {
        const matchesPreset = length.presets.some((presetId: string) => {
          const preset = LENGTH_PRESETS[presetId];
          return preset && passLength >= preset.min && passLength <= preset.max;
        });
        if (!matchesPreset) return false;
      } else if (
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
          if (passLength < min || passLength > max) return false;
        } else if (min !== undefined) {
          if (passLength < min) return false;
        } else if (max !== undefined) {
          if (passLength > max) return false;
        }
      }
    }

    if (zone && Array.isArray(zone) && zone.length > 0) {
      const passEndXQ = qualifiers.find((q) => q.type?.value === 140);
      const passEndYQ = qualifiers.find((q) => q.type?.value === 141);

      if (
        !passEndXQ ||
        passEndXQ.value === undefined ||
        !passEndYQ ||
        passEndYQ.value === undefined
      )
        return false;

      const passEndX = Number.parseFloat(passEndXQ.value);
      const passEndY = Number.parseFloat(passEndYQ.value);

      const matchesZone = zone.some((zoneIdx: number) => {
        const bounds = getZoneBounds(zoneIdx);
        return (
          passEndX >= bounds.xMin &&
          passEndX < bounds.xMax &&
          passEndY >= bounds.yMin &&
          passEndY < bounds.yMax
        );
      });

      if (!matchesZone) return false;
    }

    return true;
  },
};
