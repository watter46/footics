import type {
  AspectRatio,
  BoundaryBox,
  Player,
  Slide,
  TacticalProject,
} from '@/lib/types/tactical-unified';
import {
  DEFAULT_442_HOME,
  DEFAULT_BOUNDARY_BOX_SCREENSHOT,
  isVerticalAspectRatio,
  transformCoord,
} from '@/lib/types/tactical-unified';

function isPlayerInInitial442(p: Player, aspectRatio: AspectRatio): boolean {
  if (
    p.area !== 'pitch' ||
    p.focus ||
    p.visionCone ||
    p.badges.length > 0 ||
    p.connectLines.length > 0 ||
    p.style.markerType !== 'circle'
  ) {
    return false;
  }
  const expectedDef = DEFAULT_442_HOME.find((def) => def.shirtNo === p.shirtNo);
  if (!expectedDef) return false;
  const isVertical = isVerticalAspectRatio(aspectRatio);
  const rawPos =
    p.team === 'home'
      ? { x: expectedDef.x, y: expectedDef.y }
      : { x: 100 - expectedDef.x, y: expectedDef.y };
  const pos = isVertical ? transformCoord(rawPos, '16:9', aspectRatio) : rawPos;
  return Math.abs(p.x - pos.x) < 0.01 && Math.abs(p.y - pos.y) < 0.01;
}

export function isDefault442Slide(
  slide: Slide | undefined,
  fallbackAspect: AspectRatio,
): boolean {
  if (!slide) return false;
  if (
    slide.backgroundType !== 'pitch' ||
    slide.backgroundImageUrl ||
    (slide.arrows && slide.arrows.length > 0) ||
    (slide.zones && slide.zones.length > 0) ||
    (slide.texts && slide.texts.length > 0) ||
    slide.ball.x !== 50 ||
    slide.ball.y !== 50 ||
    !slide.ball.visible ||
    slide.players.length !== 22
  ) {
    return false;
  }
  const aspect = slide.aspectRatio ?? fallbackAspect;
  return slide.players.every((p) => isPlayerInInitial442(p, aspect));
}

export function applyImageBackgroundToProject(
  project: TacticalProject,
  url: string,
  targetSlideId: string,
): {
  project: TacticalProject;
  activeSlideId: string;
} {
  const currentSlide = project.slides.find((sl) => sl.id === targetSlideId);
  const screenshotBox: BoundaryBox = { ...DEFAULT_BOUNDARY_BOX_SCREENSHOT };
  const isDefault442 = isDefault442Slide(currentSlide, project.aspectRatio);
  const isCurrentSlideEdited = currentSlide && !isDefault442;

  if (isCurrentSlideEdited && currentSlide) {
    const newSlideId = crypto.randomUUID();
    const newSlide: Slide = {
      id: newSlideId,
      index: project.slides.length,
      label: `Scene ${project.slides.length + 1}`,
      players: currentSlide.players.map((p) => ({
        ...p,
        area: 'bench' as const,
        visionCone: undefined,
        badges: [],
        connectLines: [],
        focus: undefined,
      })),
      arrows: [],
      zones: [],
      texts: [],
      ball: { x: 50, y: 50, visible: false },
      boundaryBox: screenshotBox,
      transitionDurationMs: 1000,
      pauseMs: 500,
      easing: 'ease-in-out',
      backgroundType: 'image',
      backgroundImageUrl: url,
    };

    const currentIdx = project.slides.findIndex(
      (sl) => sl.id === targetSlideId,
    );
    const nextSlides = [...project.slides];
    if (currentIdx !== -1) {
      nextSlides.splice(currentIdx + 1, 0, newSlide);
    } else {
      nextSlides.push(newSlide);
    }
    const indexedSlides = nextSlides.map((sl, i) => ({ ...sl, index: i }));

    return {
      project: {
        ...project,
        backgroundType: 'image',
        backgroundImageUrl: url,
        updatedAt: new Date().toISOString(),
        slides: indexedSlides,
        activeSlideId: newSlideId,
      },
      activeSlideId: newSlideId,
    };
  }

  return {
    project: {
      ...project,
      backgroundType: 'image',
      backgroundImageUrl: url,
      updatedAt: new Date().toISOString(),
      slides: project.slides.map((sl) => {
        if (sl.id !== targetSlideId) return sl;
        return {
          ...sl,
          backgroundType: 'image',
          backgroundImageUrl: url,
          boundaryBox: screenshotBox,
          ball: { ...sl.ball, visible: false },
          players: sl.players.map((p) => ({
            ...p,
            area: 'bench' as const,
            visionCone: undefined,
            badges: [],
            connectLines: [],
            focus: undefined,
          })),
          arrows: sl.arrows.filter(
            (a) => !a.sourcePlayerId && !a.targetPlayerId,
          ),
        };
      }),
    },
    activeSlideId: targetSlideId,
  };
}
