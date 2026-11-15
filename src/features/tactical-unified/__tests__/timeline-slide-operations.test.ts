import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDocumentStore,
  type DocumentStore,
} from '@/features/tactical-unified/stores/document-store';
import {
  createPlaybackStore,
  type PlaybackStore,
} from '@/features/tactical-unified/stores/playback-store';
import {
  createSessionStore,
  type SessionStore,
} from '@/features/tactical-unified/stores/session-store';
import { createDefaultTacticalProject } from '@/features/tactical-unified/stores/tactical-store-provider';
import { toScreenNormCoord } from '@/lib/types/tactical/branded';

describe('AAWU 3-2: Timeline & Slide Operations Store', () => {
  let documentStore: DocumentStore;
  let sessionStore: SessionStore;
  let playbackStore: PlaybackStore;
  let phaseId: string;
  let initialSlideId: string;

  beforeEach(() => {
    const project = createDefaultTacticalProject();
    phaseId = project.phases[0].id;
    initialSlideId = project.phases[0].slides[0].id;
    documentStore = createDocumentStore(project);
    sessionStore = createSessionStore({
      activePhaseId: phaseId,
      activeSlideId: initialSlideId,
    });
    playbackStore = createPlaybackStore();
  });

  const getPhase = () => documentStore.getState().project.phases[0];
  const getSlides = () => getPhase().slides;

  it('addSlide with object-free mode preserves player & ball positions but clears annotations', () => {
    const doc = documentStore.getState();

    // 現在のスライドに矢印・ゾーン・テキスト・選手のネストアノテーションを追加
    doc.dispatchSlide(phaseId, initialSlideId, {
      type: 'ADD_ARROW',
      arrow: {
        id: 'arrow-1',
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        points: [
          { x: toScreenNormCoord(10), y: toScreenNormCoord(20) },
          { x: toScreenNormCoord(30), y: toScreenNormCoord(40) },
        ],
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        startMarker: 'none',
        endMarker: 'arrow',
      },
    });

    doc.dispatchSlide(phaseId, initialSlideId, {
      type: 'ADD_ZONE',
      zone: {
        id: 'zone-1',
        annotationType: 'zone',
        zoneType: 'highlight',
        shapeType: 'polygon',
        points: [
          { x: toScreenNormCoord(10), y: toScreenNormCoord(10) },
          { x: toScreenNormCoord(40), y: toScreenNormCoord(10) },
          { x: toScreenNormCoord(40), y: toScreenNormCoord(40) },
        ],
        color: '#f59e0b',
        opacity: 0.25,
        strokeWidth: 0,
      },
    });

    doc.dispatchSlide(phaseId, initialSlideId, {
      type: 'ADD_TEXT',
      text: {
        id: 'text-1',
        annotationType: 'text',
        x: toScreenNormCoord(50),
        y: toScreenNormCoord(50),
        content: 'Press here',
        fontSize: 16,
        color: '#ffffff',
        bold: false,
        italic: false,
      },
    });

    // 選手を少し移動
    const firstPlayerId = getSlides()[0].players[0].id;
    doc.dispatchSlide(phaseId, initialSlideId, {
      type: 'MOVE_PLAYERS',
      moves: [
        {
          id: firstPlayerId,
          x: toScreenNormCoord(45),
          y: toScreenNormCoord(65),
        },
      ],
    });

    // 選手とボールに軌道（trajectory）を設定
    doc.dispatchSlide(phaseId, initialSlideId, {
      type: 'UPDATE_BALL',
      patch: {
        trajectory: { type: 'arc_left', curveOffset: 30 },
      },
    });
    doc.dispatchSlide(phaseId, initialSlideId, {
      type: 'SET_PLAYER_TRAJECTORY',
      playerId: firstPlayerId,
      trajectory: { type: 'arc_right', curveOffset: 25 },
    });

    // 視野コーンを追加
    doc.dispatchSlide(phaseId, initialSlideId, {
      type: 'SET_PLAYER_VISION_CONE',
      playerId: firstPlayerId,
      cone: {
        id: 'vision-1',
        angleRad: Math.PI / 2,
        spreadRad: Math.PI / 3,
        radius: 13,
        color: '#3b82f6',
        opacity: 0.3,
        visible: true,
      },
    });

    const updatedCurrentSlide = getSlides().find(
      (sl) => sl.id === initialSlideId,
    )!;
    expect(updatedCurrentSlide.arrows.length).toBe(1);
    expect(updatedCurrentSlide.zones.length).toBe(1);
    expect(updatedCurrentSlide.texts.length).toBe(1);

    // [ + ] 左クリック (Object-free copy)
    const newSlideId = 'slide-object-free';
    doc.dispatch({
      type: 'ADD_SLIDE',
      phaseId,
      afterSlideId: initialSlideId,
      mode: 'object-free',
      newSlideId,
    });
    sessionStore.getState().setActiveSlideId(newSlideId);

    const slides = getSlides();
    expect(slides.length).toBe(2);
    expect(sessionStore.getState().activeSlideId).toBe(newSlideId);

    const newSlide = slides.find((sl) => sl.id === newSlideId)!;

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
    expect(movedPlayerInNewSlide?.area).toBe('pitch');
    if (movedPlayerInNewSlide?.area === 'pitch') {
      expect(movedPlayerInNewSlide.visionCone).toBeUndefined();
      expect(movedPlayerInNewSlide.connectLines.length).toBe(0);
      expect(movedPlayerInNewSlide.trajectory).toBeUndefined();
    }
    expect(newSlide.ball.trajectory).toBeUndefined();
  });

  it('addSlide with full mode / duplicateSlide clones all objects completely', () => {
    const doc = documentStore.getState();

    // 矢印・テキストを追加
    doc.dispatchSlide(phaseId, initialSlideId, {
      type: 'ADD_ARROW',
      arrow: {
        id: 'arrow-full',
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        points: [
          { x: toScreenNormCoord(15), y: toScreenNormCoord(25) },
          { x: toScreenNormCoord(35), y: toScreenNormCoord(45) },
        ],
        color: '#00ff00',
        strokeWidth: 4,
        dashArray: [],
        startMarker: 'none',
        endMarker: 'arrow',
      },
    });

    doc.dispatchSlide(phaseId, initialSlideId, {
      type: 'ADD_TEXT',
      text: {
        id: 'text-full',
        annotationType: 'text',
        x: toScreenNormCoord(20),
        y: toScreenNormCoord(30),
        content: 'Cover space',
        fontSize: 14,
        color: '#ffffff',
        bold: true,
        italic: false,
      },
    });

    // [ + ] 右クリック / Duplicate (Full copy)
    const newSlideId = 'slide-duplicated';
    doc.dispatch({
      type: 'DUPLICATE_SLIDE',
      phaseId,
      slideId: initialSlideId,
      newSlideId,
    });
    sessionStore.getState().setActiveSlideId(newSlideId);

    const slides = getSlides();
    expect(slides.length).toBe(2);
    expect(sessionStore.getState().activeSlideId).toBe(newSlideId);

    const newSlide = slides.find((sl) => sl.id === newSlideId)!;
    expect(newSlide.arrows.length).toBe(1);
    expect(newSlide.arrows[0].color).toBe('#00ff00');
    expect(newSlide.texts.length).toBe(1);
    expect(newSlide.texts[0].content).toBe('Cover space');
  });

  it('duplicateSlide resets player and ball trajectories to undefined', () => {
    const doc = documentStore.getState();
    const firstPlayerId = getSlides()[0].players[0].id;

    // 選手とボールに軌道（trajectory）を設定
    doc.dispatchSlide(phaseId, initialSlideId, {
      type: 'UPDATE_BALL',
      patch: {
        trajectory: { type: 'arc_left', curveOffset: 30 },
      },
    });
    doc.dispatchSlide(phaseId, initialSlideId, {
      type: 'SET_PLAYER_TRAJECTORY',
      playerId: firstPlayerId,
      trajectory: { type: 'arc_right', curveOffset: 25 },
    });

    // duplicateSlide (full mode) を実行
    const newSlideId = 'slide-dup-trajectory';
    doc.dispatch({
      type: 'DUPLICATE_SLIDE',
      phaseId,
      slideId: initialSlideId,
      newSlideId,
    });

    const slides = getSlides();
    const newSlide = slides.find((sl) => sl.id === newSlideId)!;

    // 複製先のスライドでは、全プレイヤーおよびボールの trajectory が undefined にリセットされていること
    expect(
      newSlide.players.every(
        (p) => p.area !== 'pitch' || p.trajectory === undefined,
      ),
    ).toBe(true);
    expect(newSlide.ball.trajectory).toBeUndefined();

    // 元のスライドの trajectory は維持されていること
    const originalSlide = slides.find((sl) => sl.id === initialSlideId)!;
    const originalPlayer = originalSlide.players.find(
      (p) => p.id === firstPlayerId,
    );
    expect(originalPlayer?.area).toBe('pitch');
    if (originalPlayer?.area === 'pitch') {
      expect(originalPlayer.trajectory).toEqual({
        type: 'arc_right',
        curveOffset: 25,
      });
    }
    expect(originalSlide.ball.trajectory).toEqual({
      type: 'arc_left',
      curveOffset: 30,
    });
  });

  it('AAWU 8-3-D: duplicateSlide carries over snapshot background, ring markers, and inspector settings', () => {
    const doc = documentStore.getState();

    // 1. スナップショット画像を背景に設定
    doc.dispatch({
      type: 'APPLY_IMAGE_BACKGROUND',
      phaseId,
      slideId: initialSlideId,
      url: 'data:image/png;base64,mock-capture-frame',
    });

    // 2. リングマーカーを追加
    const ringPlayerId = 'ring-player-1';
    doc.dispatchSlide(phaseId, initialSlideId, {
      type: 'ADD_PLAYER',
      player: {
        id: ringPlayerId,
        team: 'home',
        name: 'Ring',
        area: 'pitch',
        x: toScreenNormCoord(35),
        y: toScreenNormCoord(60),
        connectLines: [],
        badges: [],
        style: { ...getSlides()[0].players[0].style, markerType: 'ring' },
      },
    });

    // 3. スポットライト（光の柱）を設定
    doc.dispatchSlide(phaseId, initialSlideId, {
      type: 'SET_PLAYER_FOCUS',
      playerId: ringPlayerId,
      focus: {
        enabled: true,
        color: '#38bdf8',
        radius: 4,
        opacity: 0.5,
        style: 'spotlight',
      },
    });

    // 現在の状態確認
    const phaseBefore = getPhase();
    expect(phaseBefore.backgroundType).toBe('image');
    expect(phaseBefore.backgroundImageUrl).toBe(
      'data:image/png;base64,mock-capture-frame',
    );
    expect(sessionStore.getState().panels.rightPanelTab).toBe('formation');

    // 4. 右クリック複製（duplicateSlide）を実行
    const dupSlideId = 'slide-dup-snapshot';
    doc.dispatch({
      type: 'DUPLICATE_SLIDE',
      phaseId,
      slideId: initialSlideId,
      newSlideId: dupSlideId,
    });
    sessionStore.getState().setActiveSlideId(dupSlideId);

    const phaseAfter = getPhase();
    expect(phaseAfter.slides.length).toBe(2);
    expect(sessionStore.getState().activeSlideId).toBe(dupSlideId);
    expect(sessionStore.getState().panels.rightPanelTab).toBe('formation');
    expect(phaseAfter.backgroundType).toBe('image');
    expect(phaseAfter.backgroundImageUrl).toBe(
      'data:image/png;base64,mock-capture-frame',
    );

    const duplicatedSlide = phaseAfter.slides.find(
      (sl) => sl.id === dupSlideId,
    )!;

    // リングマーカーとスポットライトがそのまま複製されていることを検証
    const duplicatedRing = duplicatedSlide.players.find(
      (p) => p.id === ringPlayerId,
    );
    expect(duplicatedRing).toBeDefined();
    expect(duplicatedRing?.style.markerType).toBe('ring');
    if (duplicatedRing?.area === 'pitch') {
      expect(duplicatedRing.focus?.style).toBe('spotlight');
    }
    expect(duplicatedRing?.x).toBe(35);
    expect(duplicatedRing?.y).toBe(60);
  });

  it('AAWU 8-3-D: addSlide with blank mode creates a fresh 4-4-2 scene with pitch background and resets everything to default', () => {
    const doc = documentStore.getState();

    // スナップショットモードにしておく
    doc.dispatch({
      type: 'APPLY_IMAGE_BACKGROUND',
      phaseId,
      slideId: initialSlideId,
      url: 'data:image/png;base64,snapshot',
    });
    expect(getPhase().backgroundType).toBe('image');
    expect(sessionStore.getState().panels.rightPanelTab).toBe('formation');

    // 左クリック「+」相当 (blank mode)
    const blankSlideId = 'slide-blank';
    doc.dispatch({
      type: 'ADD_SLIDE',
      phaseId,
      afterSlideId: initialSlideId,
      mode: 'blank',
      newSlideId: blankSlideId,
    });
    sessionStore.getState().setActiveSlideId(blankSlideId);

    const slides = getSlides();
    expect(slides.length).toBe(2);
    expect(sessionStore.getState().activeSlideId).toBe(blankSlideId);
    expect(sessionStore.getState().panels.rightPanelTab).toBe('formation');

    const blankSlide = slides.find((sl) => sl.id === blankSlideId)!;
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
  });

  it('handles playback toggling and stopping', () => {
    expect(playbackStore.getState().isPlaying).toBe(false);

    playbackStore.getState().togglePlayback();
    expect(playbackStore.getState().isPlaying).toBe(true);

    playbackStore.getState().togglePlayback();
    expect(playbackStore.getState().isPlaying).toBe(false);

    playbackStore.getState().startPlayback();
    expect(playbackStore.getState().isPlaying).toBe(true);

    playbackStore.getState().stopPlayback();
    expect(playbackStore.getState().isPlaying).toBe(false);
  });

  it('reorders slides correctly', () => {
    const doc = documentStore.getState();
    const slide1Id = initialSlideId;
    const slide2Id = 'slide-2';
    const slide3Id = 'slide-3';

    doc.dispatch({
      type: 'ADD_SLIDE',
      phaseId,
      afterSlideId: slide1Id,
      mode: 'object-free',
      newSlideId: slide2Id,
    });
    doc.dispatch({
      type: 'ADD_SLIDE',
      phaseId,
      afterSlideId: slide2Id,
      mode: 'object-free',
      newSlideId: slide3Id,
    });

    expect(getSlides().map((s) => s.id)).toEqual([
      slide1Id,
      slide2Id,
      slide3Id,
    ]);

    // 順序を 3, 1, 2 に入れ替え
    doc.dispatch({
      type: 'REORDER_SLIDES',
      phaseId,
      orderedSlideIds: [slide3Id, slide1Id, slide2Id],
    });

    const updatedSlides = getSlides();
    expect(updatedSlides.map((s) => s.id)).toEqual([
      slide3Id,
      slide1Id,
      slide2Id,
    ]);
    expect(updatedSlides[0].index).toBe(0);
    expect(updatedSlides[1].index).toBe(1);
    expect(updatedSlides[2].index).toBe(2);
  });
});
