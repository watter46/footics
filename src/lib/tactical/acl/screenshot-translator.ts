import type { AspectRatio } from '@/lib/types/tactical/primitives';
import {
  type NormalizedProjectBundle,
  normalizeTacticalProject,
} from './legacy-project-translator';

export interface ScreenshotTranslateInput {
  readonly screenshotId: string;
  readonly backgroundImageUrl: string;
  readonly canvasAnnotationsJson?: string;
  readonly aspectRatio?: AspectRatio;
}

export function translateScreenshotToProject(
  input: ScreenshotTranslateInput,
): NormalizedProjectBundle {
  let arrows: unknown[] = [];
  let zones: unknown[] = [];
  let texts: unknown[] = [];
  let markers: unknown[] = [];

  if (input.canvasAnnotationsJson) {
    try {
      const parsed = JSON.parse(input.canvasAnnotationsJson);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.phases)) {
          const bundle = normalizeTacticalProject(parsed);
          const firstPhase = bundle.project.phases[0];
          const patchedPhases = firstPhase
            ? [
                {
                  ...firstPhase,
                  backgroundImageUrl:
                    firstPhase.backgroundImageUrl ?? input.backgroundImageUrl,
                  aspectRatio:
                    firstPhase.aspectRatio ?? input.aspectRatio ?? '16:9',
                },
                ...bundle.project.phases.slice(1),
              ]
            : bundle.project.phases;
          return {
            ...bundle,
            project: {
              ...bundle.project,
              screenshotSourceUrl:
                bundle.project.screenshotSourceUrl ?? input.backgroundImageUrl,
              phases: patchedPhases,
            },
          };
        }
        arrows = Array.isArray(parsed.arrows) ? parsed.arrows : [];
        zones = Array.isArray(parsed.zones) ? parsed.zones : [];
        texts = Array.isArray(parsed.texts) ? parsed.texts : [];
        markers = Array.isArray(parsed.markers) ? parsed.markers : [];
      }
    } catch {
      // JSON parse errorの場合は空配列としてフォールバック
    }
  }

  const phaseId = crypto.randomUUID();
  const slideId = crypto.randomUUID();

  const rawProject = {
    id: input.screenshotId,
    version: '3.0.0',
    screenshotSourceUrl: input.backgroundImageUrl,
    activePhaseId: phaseId,
    activeSlideId: slideId,
    phases: [
      {
        id: phaseId,
        name: 'Phase 1',
        aspectRatio: input.aspectRatio ?? '16:9',
        backgroundType: 'image' as const,
        backgroundImageUrl: input.backgroundImageUrl,
        slides: [
          {
            id: slideId,
            index: 0,
            players: markers,
            arrows,
            zones,
            texts,
            ball: {
              x: 50,
              y: 50,
              visible: false,
            },
          },
        ],
      },
    ],
  };

  return normalizeTacticalProject(rawProject);
}
