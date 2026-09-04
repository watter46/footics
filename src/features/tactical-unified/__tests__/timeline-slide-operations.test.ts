import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';

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

  it('AAWU 8-3-D: duplicateSlide carries over snapshot background, ring markers, and inspector settings', () => {
    const store = useTacticalUnifiedStore.getState();
    const slide1Id = store.activeSlideId;

    // 1. スナップショット画像を背景に設定
    store.setImageBackground('data:image/png;base64,mock-capture-frame');

    // 2. リングマーカーを追加
    const ringPlayerId = store.addPlayerFromPalette('home', 35, 60, 'ring');

    // 3. スポットライト（光の柱）やコネクタを設定
    store.setPlayerFocus(slide1Id, ringPlayerId, {
      enabled: true,
      color: '#38bdf8',
      radius: 4,
      opacity: 0.5,
      style: 'spotlight',
    });

    // 現在の状態確認
    const stateBefore = useTacticalUnifiedStore.getState();
    expect(stateBefore.project.backgroundType).toBe('image');
    expect(stateBefore.project.backgroundImageUrl).toBe(
      'data:image/png;base64,mock-capture-frame',
    );
    expect(stateBefore.panels.rightPanelTab).toBe('inspector');

    // 4. 右クリック複製（duplicateSlide）を実行
    const dupSlideId = store.duplicateSlide(slide1Id);

    const stateAfter = useTacticalUnifiedStore.getState();
    expect(stateAfter.project.slides.length).toBe(2);
    expect(stateAfter.activeSlideId).toBe(dupSlideId);
    expect(stateAfter.panels.rightPanelTab).toBe('inspector');

    const duplicatedSlide = stateAfter.project.slides.find(
      (sl) => sl.id === dupSlideId,
    )!;
    expect(duplicatedSlide.backgroundType).toBe('image');
    expect(duplicatedSlide.backgroundImageUrl).toBe(
      'data:image/png;base64,mock-capture-frame',
    );

    // リングマーカーとスポットライトがそのまま複製されていることを検証
    const duplicatedRing = duplicatedSlide.players.find(
      (p) => p.id === ringPlayerId,
    );
    expect(duplicatedRing).toBeDefined();
    expect(duplicatedRing?.style.markerType).toBe('ring');
    expect(duplicatedRing?.focus?.style).toBe('spotlight');
    expect(duplicatedRing?.x).toBe(35);
    expect(duplicatedRing?.y).toBe(60);
  });

  it('AAWU 8-3-D: addSlide with blank mode creates a fresh 4-4-2 scene with pitch background and resets everything to default', () => {
    const store = useTacticalUnifiedStore.getState();
    const slide1Id = store.activeSlideId;

    // スナップショットモードにしておく
    store.setImageBackground('data:image/png;base64,snapshot');
    expect(useTacticalUnifiedStore.getState().project.backgroundType).toBe(
      'image',
    );
    expect(useTacticalUnifiedStore.getState().panels.rightPanelTab).toBe(
      'inspector',
    );

    // 左クリック「+」相当 (blank mode)
    const blankSlideId = store.addSlide(slide1Id, 'blank');

    const state = useTacticalUnifiedStore.getState();
    expect(state.project.slides.length).toBe(2);
    expect(state.activeSlideId).toBe(blankSlideId);
    // すべてにおいてデフォルトに戻る
    expect(state.project.backgroundType).toBe('pitch');
    expect(state.project.backgroundImageUrl).toBeUndefined();
    expect(state.panels.rightPanelTab).toBe('formation');

    const blankSlide = state.project.slides.find(
      (sl) => sl.id === blankSlideId,
    )!;
    expect(blankSlide.backgroundType).toBe('pitch');
    expect(blankSlide.backgroundImageUrl).toBeUndefined();
    expect(blankSlide.players.length).toBe(22);
    expect(blankSlide.players.every((p) => p.area === 'pitch')).toBe(true);
    expect(
      blankSlide.players.every((p) => p.style.markerType === 'circle'),
    ).toBe(true);
    expect(blankSlide.arrows.length).toBe(0);
    expect(blankSlide.zones.length).toBe(0);
    expect(blankSlide.texts.length).toBe(0);
    expect(blankSlide.ball.visible).toBe(true);
    expect(blankSlide.ball.x).toBe(50);
    expect(blankSlide.ball.y).toBe(50);

    // スライド1（スナップショット）に切り替えるとスナップショット表示に戻る
    store.setActiveSlide(slide1Id);
    const slide1State = useTacticalUnifiedStore.getState();
    expect(slide1State.project.backgroundType).toBe('image');
    expect(slide1State.project.backgroundImageUrl).toBe(
      'data:image/png;base64,snapshot',
    );
    expect(slide1State.panels.rightPanelTab).toBe('inspector');

    // 再度スライド2（白紙デフォルト）に切り替えるとデフォルトに戻る
    store.setActiveSlide(blankSlideId);
    const slide2State = useTacticalUnifiedStore.getState();
    expect(slide2State.project.backgroundType).toBe('pitch');
    expect(slide2State.panels.rightPanelTab).toBe('formation');
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
