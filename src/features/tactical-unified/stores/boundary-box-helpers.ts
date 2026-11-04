import { PITCH_BOUNDARY_CONFIGS } from '@/lib/tactical/pitch-geometry';
import type {
  AspectRatio,
  BoundaryBox,
  PitchTransform,
  TacticalProject,
} from '@/lib/types/tactical-unified';
import { DEFAULT_BOUNDARY_BOX_SCREENSHOT } from '@/lib/types/tactical-unified';

/**
 * slideId から属するフェーズ ID を検索（未指定時はアクティブフェーズ）
 */
export function findPhaseIdForSlide(
  project: TacticalProject,
  slideId?: string,
): string {
  if (slideId) {
    const found = project.phases.find((ph) =>
      ph.slides.some((sl) => sl.id === slideId),
    );
    if (found) return found.id;
  }
  return project.activePhaseId ?? project.phases[0]?.id ?? '';
}

/**
 * プロジェクト内の特定フェーズ（および project ミラー）の境界線を一括更新
 */
export function updatePhaseBoundaryInProject(
  project: TacticalProject,
  phaseId: string | undefined,
  box: BoundaryBox | undefined,
): TacticalProject {
  const targetPhaseId =
    phaseId ?? project.activePhaseId ?? project.phases[0]?.id;
  return {
    ...project,
    boundaryBox: box,
    phases: project.phases.map((ph) => {
      if (ph.id !== targetPhaseId) return ph;
      return {
        ...ph,
        boundaryBox: box,
        slides: ph.slides.map((sl) => ({
          ...sl,
          boundaryBox: box,
        })),
      };
    }),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * ピッチフィット用の境界ボックスを計算する純粋関数
 */
export function computePitchFitBoundaryBox(
  isPitchBg: boolean,
  aspectRatio: AspectRatio = '16:9',
  pitchPosition?: { x: number; y: number },
  pitchTransform?: PitchTransform,
  pitchRect?: { width: number; height: number },
): BoundaryBox {
  const config =
    PITCH_BOUNDARY_CONFIGS[aspectRatio] ?? PITCH_BOUNDARY_CONFIGS['16:9'];
  const pitchWidth = pitchRect?.width ?? config.widthPx;
  const pitchHeight = pitchRect?.height ?? config.heightPx;

  const panX = pitchTransform?.panX ?? pitchPosition?.x ?? 0;
  const panY = pitchTransform?.panY ?? pitchPosition?.y ?? 0;
  const zoom = pitchTransform?.zoom ?? 1;

  if (!isPitchBg) {
    return {
      x:
        Math.round(
          ((panX / pitchWidth) * 100 +
            DEFAULT_BOUNDARY_BOX_SCREENSHOT.x * zoom) *
            100,
        ) / 100,
      y:
        Math.round(
          ((panY / pitchHeight) * 100 +
            DEFAULT_BOUNDARY_BOX_SCREENSHOT.y * zoom) *
            100,
        ) / 100,
      width:
        Math.round(DEFAULT_BOUNDARY_BOX_SCREENSHOT.width * zoom * 100) / 100,
      height:
        Math.round(DEFAULT_BOUNDARY_BOX_SCREENSHOT.height * zoom * 100) / 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    };
  }

  return {
    x: Math.round((panX / pitchWidth) * 100 * 100) / 100,
    y: Math.round((panY / pitchHeight) * 100 * 100) / 100,
    width: Math.round(100 * zoom * 100) / 100,
    height: Math.round(100 * zoom * 100) / 100,
    enabled: true,
    visible: false,
    fitTarget: 'pitch',
  };
}
