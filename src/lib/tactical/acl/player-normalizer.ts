import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  BenchPlayer,
  DomainPlayer,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { MarkerStyle } from '@/lib/types/tactical/player';

function normalizeMarkerStyle(
  rawStyle: unknown,
  team: 'home' | 'away' | 'neutral',
): MarkerStyle {
  const defaultColor =
    team === 'away' ? '#ef4444' : team === 'neutral' ? '#10b981' : '#034694';

  if (!rawStyle || typeof rawStyle !== 'object') {
    return {
      markerType: 'circle',
      insideContent: 'number',
      bottomLabel: 'name',
      color: defaultColor,
      strokeColor: '#ffffff',
      strokeWidth: 2,
      sizeScale: 1.0,
      numberSizeScale: 1.0,
      labelSizeScale: 1.0,
    };
  }

  const s = rawStyle as Record<string, unknown>;
  const color =
    typeof s.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(s.color)
      ? s.color
      : defaultColor;

  return {
    markerType:
      s.markerType === 'ring' || s.markerType === 'ring-fade'
        ? s.markerType
        : 'circle',
    insideContent:
      s.insideContent === 'photo' || s.insideContent === 'none'
        ? s.insideContent
        : 'number',
    bottomLabel:
      s.bottomLabel === 'number' || s.bottomLabel === 'none'
        ? s.bottomLabel
        : 'name',
    color,
    strokeColor:
      typeof s.strokeColor === 'string' &&
      /^#[0-9a-fA-F]{6}$/.test(s.strokeColor)
        ? s.strokeColor
        : '#ffffff',
    strokeWidth:
      typeof s.strokeWidth === 'number'
        ? Math.max(0, Math.min(5, s.strokeWidth))
        : 2,
    sizeScale:
      typeof s.sizeScale === 'number'
        ? Math.max(0.4, Math.min(2.0, s.sizeScale))
        : 1.0,
    numberSizeScale:
      typeof s.numberSizeScale === 'number'
        ? Math.max(0.6, Math.min(1.8, s.numberSizeScale))
        : 1.0,
    labelSizeScale:
      typeof s.labelSizeScale === 'number'
        ? Math.max(0.6, Math.min(1.8, s.labelSizeScale))
        : 1.0,
    glowBlur: typeof s.glowBlur === 'number' ? s.glowBlur : undefined,
    glowOpacity: typeof s.glowOpacity === 'number' ? s.glowOpacity : undefined,
    transparentBackground:
      typeof s.transparentBackground === 'boolean'
        ? s.transparentBackground
        : undefined,
  };
}

export function normalizePlayers(rawPlayers: unknown): DomainPlayer[] {
  if (!Array.isArray(rawPlayers)) return [];

  const players: DomainPlayer[] = [];
  for (const raw of rawPlayers) {
    if (!raw || typeof raw !== 'object') continue;
    const p = raw as Record<string, unknown>;

    const id = typeof p.id === 'string' && p.id ? p.id : crypto.randomUUID();
    const team: 'home' | 'away' | 'neutral' =
      p.team === 'away' || p.team === 'neutral' ? p.team : 'home';
    const x = clampToScreenNorm(typeof p.x === 'number' ? p.x : 50);
    const y = clampToScreenNorm(typeof p.y === 'number' ? p.y : 50);
    const style = normalizeMarkerStyle(p.style, team);

    const baseFields = {
      id,
      playerId: typeof p.playerId === 'string' ? p.playerId : undefined,
      name: typeof p.name === 'string' ? p.name : undefined,
      shirtNo: typeof p.shirtNo === 'string' ? p.shirtNo : undefined,
      position: typeof p.position === 'string' ? p.position : undefined,
      team,
      x,
      y,
      style,
      locked: typeof p.locked === 'boolean' ? p.locked : undefined,
      isCustom: typeof p.isCustom === 'boolean' ? p.isCustom : undefined,
    };

    if (p.area === 'bench') {
      const benchPlayer: BenchPlayer = {
        ...baseFields,
        area: 'bench',
      };
      players.push(benchPlayer);
    } else {
      const pitchPlayer: PitchPlayer = {
        ...baseFields,
        area: 'pitch',
        visionCone:
          p.visionCone && typeof p.visionCone === 'object'
            ? (p.visionCone as PitchPlayer['visionCone'])
            : undefined,
        connectLines: Array.isArray(p.connectLines)
          ? (p.connectLines as PitchPlayer['connectLines'])
          : [],
        badges: Array.isArray(p.badges)
          ? (p.badges as PitchPlayer['badges'])
          : [],
        focus:
          p.focus && typeof p.focus === 'object'
            ? (p.focus as PitchPlayer['focus'])
            : undefined,
        trajectory:
          p.trajectory && typeof p.trajectory === 'object'
            ? (p.trajectory as PitchPlayer['trajectory'])
            : undefined,
        trajectoryEffect:
          p.trajectoryEffect && typeof p.trajectoryEffect === 'object'
            ? (p.trajectoryEffect as PitchPlayer['trajectoryEffect'])
            : undefined,
        markerEffect:
          p.markerEffect && typeof p.markerEffect === 'object'
            ? (p.markerEffect as PitchPlayer['markerEffect'])
            : undefined,
      };
      players.push(pitchPlayer);
    }
  }

  return players;
}
