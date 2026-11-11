import type { DomainTacticalProject } from '@/lib/types/tactical/domain-hierarchy';
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

export function serializeProjectToScreenshotJson(
  project: DomainTacticalProject,
): string {
  const phase = project.phases[0];
  const slide = phase?.slides[0];

  return JSON.stringify({
    arrows: slide?.arrows ?? [],
    zones: slide?.zones ?? [],
    texts: slide?.texts ?? [],
    markers: slide?.players ?? [],
  });
}
