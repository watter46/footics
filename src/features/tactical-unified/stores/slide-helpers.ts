import { generateId } from '@/lib/id';
import type {
  Player,
  Slide,
  TacticalProject,
} from '@/lib/types/tactical-unified';
import {
  createDefaultSlide,
  getDefaultBoundaryBoxForAspect,
} from '@/lib/types/tactical-unified';
import type { PanelState } from './tool-slice';

/**
 * モードに応じた新規スライドオブジェクトを生成する純粋関数
 */
export function createSlideForMode(
  currentSlide: Slide | undefined,
  project: TacticalProject,
  mode: 'object-free' | 'full' | 'blank',
  slideCount?: number,
): Slide {
  const activePhase =
    project.phases.find((p) => p.id === project.activePhaseId) ??
    project.phases[0];
  const count = slideCount ?? activePhase?.slides.length ?? 0;

  if (!currentSlide || mode === 'blank') {
    const defaultBox = getDefaultBoundaryBoxForAspect(project.aspectRatio);
    return createDefaultSlide(
      count,
      undefined,
      project.homeColor.primary,
      project.awayColor.primary,
      defaultBox,
      project.aspectRatio,
    );
  }

  if (mode === 'full') {
    const clonedSlide = JSON.parse(JSON.stringify(currentSlide)) as Slide;
    return {
      ...clonedSlide,
      id: generateId('slide'),
      label: `${currentSlide.label ?? 'Scene'} (copy)`,
      aspectRatio: currentSlide.aspectRatio ?? project.aspectRatio,
      backgroundImageUrl:
        currentSlide.backgroundImageUrl ?? project.backgroundImageUrl,
      backgroundType:
        currentSlide.backgroundType ?? project.backgroundType ?? 'pitch',
      players: clonedSlide.players.map((pl) => ({
        ...pl,
        trajectory: undefined,
      })),
      ball: clonedSlide.ball
        ? {
            ...clonedSlide.ball,
            trajectory: undefined,
          }
        : clonedSlide.ball,
    };
  }

  // 'object-free': 選手とボール座標・スタイルを維持し、矢印・ゾーン・テキストなどのアノテーションをクリア
  const clonedPlayers: Player[] = currentSlide.players.map((pl) => ({
    ...JSON.parse(JSON.stringify(pl)),
    connectLines: [],
    visionCone: undefined,
    badge: undefined,
    focus: undefined,
    trajectory: undefined,
  }));

  const defaultBox = getDefaultBoundaryBoxForAspect(project.aspectRatio);

  return {
    id: generateId('slide'),
    index: count,
    label: `Scene ${count + 1}`,
    aspectRatio: currentSlide.aspectRatio ?? project.aspectRatio,
    players: clonedPlayers,
    arrows: [],
    zones: [],
    texts: [],
    ball: currentSlide.ball
      ? { ...currentSlide.ball, trajectory: undefined }
      : { x: 50, y: 50, visible: true },
    boundaryBox: currentSlide.boundaryBox
      ? { ...currentSlide.boundaryBox }
      : { ...defaultBox },
    pitchTransform: currentSlide.pitchTransform
      ? { ...currentSlide.pitchTransform }
      : undefined,
    pitchPosition: currentSlide.pitchPosition
      ? { ...currentSlide.pitchPosition }
      : undefined,
    transitionDurationMs: currentSlide.transitionDurationMs ?? 1000,
    pauseMs: currentSlide.pauseMs ?? 500,
    easing: currentSlide.easing ?? 'ease-in-out',
    cameraTransitionMode: currentSlide.cameraTransitionMode ?? 'sync',
    cameraDurationMs: currentSlide.cameraDurationMs ?? 10000,
    backgroundImageUrl:
      currentSlide.backgroundImageUrl ?? project.backgroundImageUrl,
    backgroundType:
      currentSlide.backgroundType ?? project.backgroundType ?? 'pitch',
  };
}

/**
 * スライドの背景種別に応じたパネルタブ状態を解決
 */
export function resolvePanelStateForSlide(
  _slide: Slide | undefined,
  panels: PanelState,
  fallbackTab: PanelState['rightPanelTab'] = 'formation',
): PanelState {
  return {
    ...panels,
    rightPanelTab: panels.rightPanelTab ?? fallbackTab,
  };
}
