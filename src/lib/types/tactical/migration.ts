import { createDefaultProject, createDefaultSlide } from './factory';
import type { AspectRatio } from './primitives';
import {
  attachProjectSlidesGetter,
  type TacticalPhase,
  type TacticalProject,
} from './project';
import {
  type BoundaryBox,
  DEFAULT_BOUNDARY_BOX_16_9,
  type Slide,
} from './slide';

export interface LegacyTacticalProjectLike {
  id?: string;
  version?: string;
  title?: string;
  phases?: TacticalPhase[];
  slides?: Slide[];
  activePhaseId?: string;
  activeSlideId?: string;
  aspectRatio?: AspectRatio;
  boundaryBox?: BoundaryBox;
  [key: string]: unknown;
}

/**
 * 渡されたオブジェクトを安全な TacticalProject 構造に正規化・マイグレーションする。
 * 旧バージョン（v1: slides 配列のみ存在）からの自動移行、
 * および activePhaseId / activeSlideId / slides getter の完全性を保証する。
 */
export function ensureTacticalProject(project: unknown): TacticalProject {
  if (!project || typeof project !== 'object') {
    return createDefaultProject(crypto.randomUUID());
  }

  const p = project as LegacyTacticalProjectLike;
  let phases: TacticalPhase[] = Array.isArray(p.phases) ? p.phases : [];
  const rawSlides = p.slides;
  const hasRawSlides = Array.isArray(rawSlides) && rawSlides.length > 0;

  if (phases.length === 0) {
    // 旧形式 (slides 配列のみ) からの移行
    const defaultPhaseId = p.activePhaseId ?? crypto.randomUUID();
    const slides: Slide[] = hasRawSlides
      ? rawSlides
      : [createDefaultSlide(0, p.activeSlideId)];
    const fallbackAspect: AspectRatio =
      slides[0]?.aspectRatio ?? p.aspectRatio ?? '16:9';
    const fallbackBoundary: BoundaryBox =
      slides[0]?.boundaryBox ?? p.boundaryBox ?? DEFAULT_BOUNDARY_BOX_16_9;
    phases = [
      {
        id: defaultPhaseId,
        name: 'Phase 1',
        aspectRatio: fallbackAspect,
        boundaryBox: { ...fallbackBoundary },
        slides,
      },
    ];
  } else {
    // phases が存在し、かつ rawSlides が getter でない配列として直接代入されている場合
    // (テスト等で { ...project, slides: [customSlide] } とされた場合の同期)
    const slidesDesc = Object.getOwnPropertyDescriptor(p, 'slides');
    if (hasRawSlides && (!slidesDesc || !slidesDesc.get)) {
      const activePhId = p.activePhaseId ?? phases[0].id;
      phases = phases.map((ph) =>
        ph.id === activePhId ? { ...ph, slides: rawSlides } : ph,
      );
    }

    // 各 phase の slides が空配列の場合はフォールバック、および aspectRatio/boundaryBox を正規化
    phases = phases.map((ph) => {
      const resolvedSlides =
        !Array.isArray(ph.slides) || ph.slides.length === 0
          ? [createDefaultSlide(0)]
          : ph.slides;
      const phaseAspect: AspectRatio =
        ph.aspectRatio ??
        resolvedSlides[0]?.aspectRatio ??
        p.aspectRatio ??
        '16:9';
      const phaseBoundary: BoundaryBox =
        ph.boundaryBox ??
        resolvedSlides[0]?.boundaryBox ??
        p.boundaryBox ??
        DEFAULT_BOUNDARY_BOX_16_9;

      return {
        ...ph,
        aspectRatio: phaseAspect,
        boundaryBox: { ...phaseBoundary },
        slides: resolvedSlides,
      };
    });
  }

  const activePhase =
    phases.find((phase) => phase.id === p.activePhaseId) ?? phases[0];
  const activePhaseId = activePhase.id;
  const activeSlide =
    activePhase.slides.find((slide) => slide.id === p.activeSlideId) ??
    activePhase.slides[0];
  const activeSlideId = activeSlide.id;

  const result = {
    ...p,
    aspectRatio: activePhase.aspectRatio ?? '16:9',
    boundaryBox: { ...(activePhase.boundaryBox ?? DEFAULT_BOUNDARY_BOX_16_9) },
    phases,
    activePhaseId,
    activeSlideId,
    version: (p.version ?? '2.0.0') as '2.0.0',
  } as TacticalProject;

  return attachProjectSlidesGetter(result);
}
