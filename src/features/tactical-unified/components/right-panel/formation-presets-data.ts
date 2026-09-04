import type { FormationType } from '@/lib/data/formations';
import type { SeasonFormationPreset } from '@/lib/types/tactical-unified';

// ── Common Quick Formations ────────────────────────────────────
export const QUICK_FORMATIONS: FormationType[] = [
  '4-3-3',
  '4-2-3-1',
  '3-4-2-1',
  '3-5-2',
  '4-4-2',
];

// ── Season Preset Sample Data ──────────────────────────────────
export const SAMPLE_SEASON_PRESETS: SeasonFormationPreset[] = [
  {
    id: 'preset-chelsea-2425',
    name: 'Chelsea 24/25 (4-2-3-1)',
    teamName: 'Chelsea FC',
    season: '2024-25',
    mode: 'half',
    formation: '4-2-3-1',
    players: [
      { shirtNo: '1', position: 'GK', x: 8, y: 50 },
      { shirtNo: '27', position: 'RB', x: 22, y: 18 },
      { shirtNo: '29', position: 'CB', x: 20, y: 38 },
      { shirtNo: '6', position: 'CB', x: 20, y: 62 },
      { shirtNo: '3', position: 'LB', x: 22, y: 82 },
      { shirtNo: '25', position: 'DM', x: 34, y: 38 },
      { shirtNo: '8', position: 'DM', x: 34, y: 62 },
      { shirtNo: '11', position: 'RW', x: 44, y: 18 },
      { shirtNo: '20', position: 'AM', x: 45, y: 50 },
      { shirtNo: '7', position: 'LW', x: 44, y: 82 },
      { shirtNo: '15', position: 'ST', x: 52, y: 50 },
    ],
  },
  {
    id: 'preset-mancity-2425',
    name: 'Man City 24/25 (3-2-4-1)',
    teamName: 'Manchester City',
    season: '2024-25',
    mode: 'half',
    formation: '3-2-4-1',
    players: [
      { shirtNo: '31', position: 'GK', x: 8, y: 50 },
      { shirtNo: '25', position: 'CB', x: 20, y: 25 },
      { shirtNo: '3', position: 'CB', x: 18, y: 50 },
      { shirtNo: '24', position: 'CB', x: 20, y: 75 },
      { shirtNo: '16', position: 'DM', x: 32, y: 38 },
      { shirtNo: '82', position: 'DM', x: 32, y: 62 },
      { shirtNo: '20', position: 'RW', x: 46, y: 15 },
      { shirtNo: '17', position: 'AM', x: 45, y: 38 },
      { shirtNo: '47', position: 'AM', x: 45, y: 62 },
      { shirtNo: '11', position: 'LW', x: 46, y: 85 },
      { shirtNo: '9', position: 'ST', x: 54, y: 50 },
    ],
  },
];
