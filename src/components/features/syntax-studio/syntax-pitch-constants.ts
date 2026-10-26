export const PITCH_ASPECT_RATIO = 105 / 68;

export const horizontalPitchSvg = `<svg viewBox="-1 -1 107 70" xmlns="http://www.w3.org/2000/svg">
  <rect x="-1" y="-1" width="107" height="70" fill="#020617" />
  <rect x="0" y="0" width="105" height="68" fill="#020617" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <line x1="52.5" y1="0" x2="52.5" y2="68" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="52.5" cy="34" r="0.4" fill="#e2b48d" opacity="0.8"/>
  <rect x="0" y="13.85" width="16.5" height="40.3" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="0" y="24.85" width="5.5" height="18.3" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="11" cy="34" r="0.3" fill="#e2b48d" opacity="0.8"/>
  <path d="M 16.5 26.69 A 9.15 9.15 0 0 1 16.5 41.31" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="88.5" y="13.85" width="16.5" height="40.3" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <rect x="99.5" y="24.85" width="5.5" height="18.3" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
  <circle cx="94" cy="34" r="0.3" fill="#e2b48d" opacity="0.8"/>
  <path d="M 88.5 26.69 A 9.15 9.15 0 0 0 88.5 41.31" fill="none" stroke="#e2b48d" stroke-width="0.4" opacity="0.8"/>
</svg>`;

export const ZONE_STYLES: Record<
  'highlight' | 'space' | 'danger',
  { fill: string; stroke: string }
> = {
  highlight: {
    fill: 'rgba(56, 189, 248, 0.25)',
    stroke: '#38bdf8',
  },
  space: {
    fill: 'rgba(34, 197, 94, 0.25)',
    stroke: '#22c55e',
  },
  danger: {
    fill: 'rgba(239, 68, 68, 0.25)',
    stroke: '#ef4444',
  },
};

export const ARROW_STYLES: Record<
  'pass' | 'move' | 'dribble' | 'defend',
  { color: string; dash?: number[]; strokeWidth: number }
> = {
  pass: {
    color: '#38bdf8',
    dash: undefined,
    strokeWidth: 2.5,
  },
  move: {
    color: '#fbbf24',
    dash: [6, 4],
    strokeWidth: 2.5,
  },
  dribble: {
    color: '#a855f7',
    dash: [3, 3],
    strokeWidth: 2.5,
  },
  defend: {
    color: '#ef4444',
    dash: [5, 3],
    strokeWidth: 2.5,
  },
};

export const TEAM_COLORS: Record<'home' | 'away', string> = {
  home: '#2563eb',
  away: '#dc2626',
};
