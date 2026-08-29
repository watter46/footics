import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';

describe('AAWU 3-2: Timeline & Slide Operations Store', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('addSlide with object-free mode preserves player & ball positions but clears annotations', () => {
    const store = useTacticalUnifiedStore.getState();
    const currentSlideId = store.activeSlideId;

    // 現在のスライドに矢印・ゾーン・テキスト・選手のネストアノテーションを追加
    store.addArrow(currentSlideId, {
      id: 'arrow-1',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ],
      color: '#ffffff',
      strokeWidth: 3,
      dashArray: [],
      arrowHead: true,
    });

    store.addZone(currentSlideId, {
      id: 'zone-1',
      annotationType: 'zone',
      zoneType: 'highlight',
      points: [
        { x: 10, y: 10 },
        { x: 40, y: 10 },
        { x: 40, y: 40 },
      ],
      color: '#f59e0b',
      opacity: 0.25,
      strokeWidth: 0,
    });

    store.addText(currentSlideId, {
      id: 'text-1',
      annotationType: 'text',
      x: 50,
      y: 50,
      content: 'Press here',
      fontSize: 16,
      color: '#ffffff',
      bold: false,
      italic: false,
    });

    // 選手を少し移動
    const firstPlayerId = store.project.slides[0].players[0].id;
    store.movePlayer(currentSlideId, firstPlayerId, 45, 65);

    // 視野コーンを追加
    store.setVisionCone(currentSlideId, firstPlayerId, {
      id: 'vision-1',
      angleRad: Math.PI / 2,
      spreadRad: Math.PI / 3,
      radius: 13,
      color: '#3b82f6',
      opacity: 0.3,
      visible: true,
    });

    const updatedCurrentSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((sl) => sl.id === currentSlideId)!;
    expect(updatedCurrentSlide.arrows.length).toBe(1);
    expect(updatedCurrentSlide.zones.length).toBe(1);
    expect(updatedCurrentSlide.texts.length).toBe(1);

    // [ + ] 左クリック (Object-free copy)
    const newSlideId = useTacticalUnifiedStore
      .getState()
      .addSlide(currentSlideId, 'object-free');

    const nextState = useTacticalUnifiedStore.getState();
    expect(nextState.project.slides.length).toBe(2);
    expect(nextState.activeSlideId).toBe(newSlideId);

    const newSlide = nextState.project.slides.find(
      (sl) => sl.id === newSlideId,
    )!;

    // 選手座標は引き継がれている
    const movedPlayerInNewSlide = newSlide.players.find(
      (p) => p.id === firstPlayerId,
    );
    expect(movedPlayerInNewSlide?.x).toBe(45);
    expect(movedPlayerInNewSlide?.y).toBe(65);

    // 矢印・ゾーン・テキストはクリアされている
    expect(newSlide.arrows.length).toBe(0);
    expect(newSlide.zones.length).toBe(0);
    expect(newSlide.texts.length).toBe(0);

    // 選手のネストアノテーション（visionCone等）もクリアされている
    expect(movedPlayerInNewSlide?.visionCone).toBeUndefined();
    expect(movedPlayerInNewSlide?.connectLines.length).toBe(0);
  });

  it('addSlide with full mode / duplicateSlide clones all objects completely', () => {
    const store = useTacticalUnifiedStore.getState();
    const currentSlideId = store.activeSlideId;

    // 矢印・テキストを追加
    store.addArrow(currentSlideId, {
      id: 'arrow-full',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 15, y: 25 },
        { x: 35, y: 45 },
      ],
      color: '#00ff00',
      strokeWidth: 4,
      dashArray: [],
      arrowHead: true,
    });

    store.addText(currentSlideId, {
      id: 'text-full',
      annotationType: 'text',
      x: 20,
      y: 30,
      content: 'Cover space',
      fontSize: 14,
      color: '#ffffff',
      bold: true,
      italic: false,
    });

    // [ + ] 右クリック / Duplicate (Full copy)
    const newSlideId = useTacticalUnifiedStore
      .getState()
      .duplicateSlide(currentSlideId);

    const nextState = useTacticalUnifiedStore.getState();
    expect(nextState.project.slides.length).toBe(2);
    expect(nextState.activeSlideId).toBe(newSlideId);

    const newSlide = nextState.project.slides.find(
      (sl) => sl.id === newSlideId,
    )!;
    expect(newSlide.arrows.length).toBe(1);
    expect(newSlide.arrows[0].color).toBe('#00ff00');
    expect(newSlide.texts.length).toBe(1);
    expect(newSlide.texts[0].content).toBe('Cover space');
  });

  it('handles playback toggling and stopping', () => {
    const store = useTacticalUnifiedStore.getState();
    expect(store.isPlaying).toBe(false);

    store.togglePlayback();
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(true);

    store.togglePlayback();
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);

    store.setIsPlaying(true);
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(true);

    store.stopPlayback();
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);
  });

  it('reorders slides correctly', () => {
    const store = useTacticalUnifiedStore.getState();
    const slide1Id = store.activeSlideId;
    const slide2Id = store.addSlide(slide1Id, 'object-free');
    const slide3Id = store.addSlide(slide2Id, 'object-free');

    const state = useTacticalUnifiedStore.getState();
    expect(state.project.slides.map((s) => s.id)).toEqual([
      slide1Id,
      slide2Id,
      slide3Id,
    ]);

    // 順序を 3, 1, 2 に入れ替え
    store.reorderSlides([slide3Id, slide1Id, slide2Id]);

    const updatedState = useTacticalUnifiedStore.getState();
    expect(updatedState.project.slides.map((s) => s.id)).toEqual([
      slide3Id,
      slide1Id,
      slide2Id,
    ]);
    expect(updatedState.project.slides[0].index).toBe(0);
    expect(updatedState.project.slides[1].index).toBe(1);
    expect(updatedState.project.slides[2].index).toBe(2);
  });
});
