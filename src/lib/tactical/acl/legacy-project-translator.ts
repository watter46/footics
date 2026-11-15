import type { DomainTacticalProject } from '@/lib/types/tactical/domain-hierarchy';
import { DomainTacticalProjectSchema } from '@/lib/types/tactical/domain-hierarchy';
import {
  DEFAULT_PITCH_APPEARANCE,
  DEFAULT_SCREEN_BACKGROUND,
} from '@/lib/types/tactical/pitch-config';
import { normalizePhases } from './slide-normalizer';

export interface NormalizedProjectBundle {
  readonly project: DomainTacticalProject;
  readonly activePhaseId: string;
  readonly activeSlideId: string;
}

function resolveColors(root: Record<string, unknown>) {
  const parseColor = (raw: unknown, fallback: string) => {
    if (!raw || typeof raw !== 'object') return { primary: fallback };
    const r = raw as { primary?: string; secondary?: string };
    const primary =
      typeof r.primary === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.primary)
        ? r.primary
        : fallback;
    const secondary =
      typeof r.secondary === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.secondary)
        ? r.secondary
        : undefined;
    return { primary, secondary };
  };

  return {
    homeColor: parseColor(root.homeColor, '#034694'),
    awayColor: parseColor(root.awayColor, '#ef4444'),
  };
}

function resolvePitchAppearance(raw: unknown) {
  if (!raw || typeof raw !== 'object') return DEFAULT_PITCH_APPEARANCE;
  const p = raw as Record<string, unknown>;
  return {
    pitchBackgroundType:
      p.pitchBackgroundType === 'marble'
        ? ('marble' as const)
        : ('solid' as const),
    overlayColor:
      typeof p.overlayColor === 'string'
        ? p.overlayColor
        : DEFAULT_PITCH_APPEARANCE.overlayColor,
    overlayOpacity:
      typeof p.overlayOpacity === 'number'
        ? p.overlayOpacity
        : DEFAULT_PITCH_APPEARANCE.overlayOpacity,
    lineColor:
      typeof p.lineColor === 'string'
        ? p.lineColor
        : DEFAULT_PITCH_APPEARANCE.lineColor,
    lineWidth:
      typeof p.lineWidth === 'number'
        ? p.lineWidth
        : DEFAULT_PITCH_APPEARANCE.lineWidth,
    lineOpacity:
      typeof p.lineOpacity === 'number'
        ? p.lineOpacity
        : DEFAULT_PITCH_APPEARANCE.lineOpacity,
  };
}

export function normalizeTacticalProject(
  raw: unknown,
): NormalizedProjectBundle {
  const root = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;

  const id =
    typeof root.id === 'string' && root.id ? root.id : crypto.randomUUID();
  const title = typeof root.title === 'string' ? root.title : undefined;

  const createdAt =
    typeof root.createdAt === 'string' &&
    !Number.isNaN(Date.parse(root.createdAt))
      ? root.createdAt
      : new Date().toISOString();

  const updatedAt =
    typeof root.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(root.updatedAt))
      ? root.updatedAt
      : new Date().toISOString();

  const { homeColor, awayColor } = resolveColors(root);
  const pitchAppearance = resolvePitchAppearance(root.pitchAppearance);
  const screenBackground =
    root.screenBackground && typeof root.screenBackground === 'object'
      ? {
          type:
            (root.screenBackground as { type?: string }).type === 'dark'
              ? ('dark' as const)
              : ('cinematic' as const),
        }
      : DEFAULT_SCREEN_BACKGROUND;

  const tags = Array.isArray(root.tags)
    ? root.tags.filter((t): t is string => typeof t === 'string')
    : [];

  const thumbnail =
    typeof root.thumbnail === 'string' ? root.thumbnail : undefined;
  const screenshotSourceUrl =
    typeof root.screenshotSourceUrl === 'string'
      ? root.screenshotSourceUrl
      : undefined;
  const matchId = typeof root.matchId === 'string' ? root.matchId : undefined;
  const matchFormations =
    root.matchFormations && typeof root.matchFormations === 'object'
      ? (root.matchFormations as DomainTacticalProject['matchFormations'])
      : undefined;

  const phases = normalizePhases(root);

  const candidateActivePhaseId =
    typeof root.activePhaseId === 'string' ? root.activePhaseId : undefined;
  const activePhase =
    (candidateActivePhaseId &&
      phases.find((p) => p.id === candidateActivePhaseId)) ||
    phases[0];

  const candidateActiveSlideId =
    typeof root.activeSlideId === 'string' ? root.activeSlideId : undefined;
  const activeSlide =
    (candidateActiveSlideId &&
      activePhase.slides.find((s) => s.id === candidateActiveSlideId)) ||
    activePhase.slides[0];

  const normalizedProject: DomainTacticalProject = {
    id,
    version: '3.0.0',
    title,
    createdAt,
    updatedAt,
    homeColor,
    awayColor,
    pitchAppearance,
    screenBackground,
    phases,
    matchId,
    matchFormations,
    tags,
    thumbnail,
    screenshotSourceUrl,
  };

  const parsedProject = DomainTacticalProjectSchema.parse(normalizedProject);

  return {
    project: parsedProject,
    activePhaseId: activePhase.id,
    activeSlideId: activeSlide.id,
  };
}
