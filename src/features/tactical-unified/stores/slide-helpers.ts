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
): Slide {
  if (!currentSlide || mode === 'blank') {
    const defaultBox = getDefaultBoundaryBoxForAspect(project.aspectRatio);
    return createDefaultSlide(
      project.slides.length,
      undefined,
      project.homeColor.primary,
      project.awayColor.primary,
      defaultBox,
      project.aspectRatio,
    );
  }

  if (mode === 'full') {
    return {
      ...(JSON.parse(JSON.stringify(currentSlide)) as Slide),
      id: crypto.randomUUID(),
      label: `${currentSlide.label ?? 'Scene'} (copy)`,
      aspectRatio: currentSlide.aspectRatio ?? project.aspectRatio,
      backgroundImageUrl:
        currentSlide.backgroundImageUrl ?? project.backgroundImageUrl,
      backgroundType:
        currentSlide.backgroundType ?? project.backgroundType ?? 'pitch',
    };
  }

  // 'object-free': 選手とボール座標・スタイルを維持し、矢印・ゾーン・テキストなどのアノテーションをクリア
  const clonedPlayers: Player[] = currentSlide.players.map((pl) => ({
    ...JSON.parse(JSON.stringify(pl)),
    connectLines: [],
    visionCone: undefined,
    badge: undefined,
    focus: undefined,
  }));

  const defaultBox = getDefaultBoundaryBoxForAspect(project.aspectRatio);

  return {
    id: crypto.randomUUID(),
    index: project.slides.length,
    label: `Scene ${project.slides.length + 1}`,
    aspectRatio: currentSlide.aspectRatio ?? project.aspectRatio,
    players: clonedPlayers,
    arrows: [],
    zones: [],
    texts: [],
    ball: currentSlide.ball
      ? { ...currentSlide.ball }
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
  slide: Slide | undefined,
  panels: PanelState,
  fallbackTab: PanelState['rightPanelTab'] = 'formation',
): PanelState {
  const isImageBg = slide?.backgroundType === 'image';
  return {
    ...panels,
    rightPanelTab: isImageBg
      ? 'inspector'
      : panels.rightPanelTab === 'inspector'
        ? fallbackTab
        : panels.rightPanelTab,
  };
}
