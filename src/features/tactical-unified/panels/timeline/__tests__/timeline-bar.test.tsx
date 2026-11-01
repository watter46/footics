import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TimelineBar } from '../timeline-bar';

describe('TimelineBar Component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('renders playback controls and initial scene', () => {
    render(<TimelineBar />);

    expect(screen.getByRole('button', { name: /play/i })).toBeDefined();
    expect(screen.getByText(/Total 0.0s/i)).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
    expect(
      screen.getByRole('button', {
        name: /add scene/i,
      }),
    ).toBeDefined();
  });

  it('adds a blank scene on left click', () => {
    render(<TimelineBar />);

    const addBtn = screen.getByRole('button', {
      name: /add scene/i,
    });

    fireEvent.click(addBtn);

    const slides = useTacticalUnifiedStore.getState().project.slides;
    expect(slides.length).toBe(2);
    expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slides[1].id);
  });

  it('duplicates scene on right click (contextmenu)', () => {
    render(<TimelineBar />);

    const addBtn = screen.getByRole('button', {
      name: /add scene/i,
    });

    fireEvent.contextMenu(addBtn);

    const slides = useTacticalUnifiedStore.getState().project.slides;
    expect(slides.length).toBe(2);
    expect(slides[1].label).toContain('(copy)');
  });

  it('toggles playback when Play button is clicked', () => {
    render(<TimelineBar />);

    const playBtn = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playBtn);

    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(true);
    expect(screen.getByRole('button', { name: /pause/i })).toBeDefined();

    const pauseBtn = screen.getByRole('button', { name: /pause/i });
    fireEvent.click(pauseBtn);

    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);
  });

  it('SlideCard 右クリックでコンテキストメニューが表示され、複製や削除が実行できる', () => {
    render(<TimelineBar />);

    // 1. スライドを1枚追加
    const addBtn = screen.getByRole('button', {
      name: /add scene/i,
    });
    fireEvent.click(addBtn);
    expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(2);

    // 2. 1枚目の SlideCard (Scene 1) を右クリック
    const sceneCard = screen.getByRole('button', { name: 'Scene 1' });
    fireEvent.contextMenu(sceneCard);

    // 3. コンテキストメニューが表示される
    expect(screen.getByText('シーンを複製')).toBeDefined();
    expect(screen.getByText('右へ移動')).toBeDefined();
    expect(screen.getByText('シーンを削除')).toBeDefined();

    // 4. 「シーンを削除」をクリック
    const deleteMenuBtn = screen.getByText('シーンを削除');
    fireEvent.click(deleteMenuBtn);

    expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(1);
  });

  it('スライドの並び替え (reorderSlides / 移動) が正常に動作し、Undoで復元できる', () => {
    render(<TimelineBar />);

    // 1. スライドを3枚用意する (Scene 1, Scene 2, Scene 3)
    const addBtn = screen.getByRole('button', { name: /add scene/i });
    fireEvent.click(addBtn);
    fireEvent.click(addBtn);

    const initialSlides = useTacticalUnifiedStore.getState().project.slides;
    expect(initialSlides).toHaveLength(3);
    const id0 = initialSlides[0].id;
    const id1 = initialSlides[1].id;
    const id2 = initialSlides[2].id;

    // 2. reorderSlides で順序を [id1, id2, id0] に変更
    useTacticalUnifiedStore.getState().reorderSlides([id1, id2, id0]);

    const reorderedSlides = useTacticalUnifiedStore.getState().project.slides;
    expect(reorderedSlides.map((s) => s.id)).toEqual([id1, id2, id0]);
    expect(reorderedSlides[0].index).toBe(0);
    expect(reorderedSlides[1].index).toBe(1);
    expect(reorderedSlides[2].index).toBe(2);

    // 3. Undo (undo) を実行すると元の順序 [id0, id1, id2] に巻き戻る
    useTacticalUnifiedStore.getState().undo();
    const restoredSlides = useTacticalUnifiedStore.getState().project.slides;
    expect(restoredSlides.map((s) => s.id)).toEqual([id0, id1, id2]);
  });

  it('SlideCard のコンテキストメニュー「右へ移動」「左へ移動」でスライド順が入れ替わる', () => {
    render(<TimelineBar />);

    // スライドを2枚用意
    const addBtn = screen.getByRole('button', { name: /add scene/i });
    fireEvent.click(addBtn);

    const initialSlides = useTacticalUnifiedStore.getState().project.slides;
    expect(initialSlides).toHaveLength(2);
    const id0 = initialSlides[0].id;
    const id1 = initialSlides[1].id;

    // 1枚目 (Scene 1) を右クリックして「右へ移動」をクリック
    const scene1Card = screen.getByRole('button', { name: 'Scene 1' });
    fireEvent.contextMenu(scene1Card);
    const moveRightBtn = screen.getByText('右へ移動');
    fireEvent.click(moveRightBtn);

    const movedSlides = useTacticalUnifiedStore.getState().project.slides;
    expect(movedSlides.map((s) => s.id)).toEqual([id1, id0]);
  });

  it('SlideCard クリック時に blur が呼ばれ、フォーカスが残留しない', () => {
    render(<TimelineBar />);
    const sceneCard = screen.getByRole('button', { name: 'Scene 1' });
    const blurSpy = vi.spyOn(sceneCard, 'blur');
    fireEvent.click(sceneCard);
    expect(blurSpy).toHaveBeenCalled();
    expect(sceneCard.className).toContain('focus:outline-none');
  });

  it('Play/Pause ボタンクリック時に blur が呼ばれ、フォーカスが残留しない', () => {
    render(<TimelineBar />);
    const playBtn = screen.getByRole('button', { name: /play/i });
    const blurSpy = vi.spyOn(playBtn, 'blur');
    fireEvent.click(playBtn);
    expect(blurSpy).toHaveBeenCalled();
    expect(playBtn.className).toContain('focus:outline-none');
  });

  describe('シーン間トランジションコネクタ (TransitionConnector)', () => {
    it('初期状態（1シーンのみ）ではトランジションコネクタは表示されない', () => {
      render(<TimelineBar />);
      expect(
        screen.queryByRole('button', { name: /トランジション:/i }),
      ).toBeNull();
    });

    it('複数スライドが存在する場合、Scene 1の前には表示されず、Scene 2以降の直前にコネクタが表示される', () => {
      render(<TimelineBar />);

      // スライドを2枚追加（計3枚）
      const addBtn = screen.getByRole('button', { name: /add scene/i });
      fireEvent.click(addBtn);
      fireEvent.click(addBtn);

      // Scene 1 のトランジションコネクタは存在しない
      expect(
        screen.queryByRole('button', {
          name: /Scene 1 トランジション:/i,
        }),
      ).toBeNull();

      // Scene 2 と Scene 3 のトランジションコネクタが存在する
      const connScene2 = screen.getByRole('button', {
        name: /Scene 2 トランジション: 1.0s/i,
      });
      const connScene3 = screen.getByRole('button', {
        name: /Scene 3 トランジション: 1.0s/i,
      });
      expect(connScene2).toBeDefined();
      expect(connScene3).toBeDefined();

      // コネクタをクリックすると該当シーンのトランジションポップオーバーが開く
      fireEvent.click(connScene2);
      expect(
        screen.getByRole('dialog', { name: /シーン トランジション設定/i }),
      ).toBeDefined();
      expect(screen.getByText('Scene 2 トランジション設定')).toBeDefined();
    });
  });

  describe('全シーン一括設定ポップオーバー (BatchTransitionPopover)', () => {
    it('「一括設定」ボタン押下でポップオーバーが表示され、閉じるボタンまたは外側クリックで閉じる', () => {
      render(<TimelineBar />);

      // 一括設定ボタンが存在する
      const batchBtn = screen.getByRole('button', { name: /一括設定/i });
      expect(batchBtn).toBeDefined();

      // 初期状態ではポップオーバーは非表示
      expect(
        screen.queryByRole('dialog', {
          name: /全シーン トランジション一括設定/i,
        }),
      ).toBeNull();

      // ボタンクリックでポップオーバーが開く
      fireEvent.click(batchBtn);
      const dialog = screen.getByRole('dialog', {
        name: /全シーン トランジション一括設定/i,
      });
      expect(dialog).toBeDefined();

      // 閉じるボタンで閉じる
      const closeBtn = screen.getByRole('button', { name: '閉じる' });
      fireEvent.click(closeBtn);
      expect(
        screen.queryByRole('dialog', {
          name: /全シーン トランジション一括設定/i,
        }),
      ).toBeNull();
    });

    it('ポップオーバーから移動時間・静止時間・イージングを変更すると全スライドに反映され、1回のUndoで復元される', () => {
      render(<TimelineBar />);

      // スライドを3枚用意
      const addBtn = screen.getByRole('button', { name: /add scene/i });
      fireEvent.click(addBtn);
      fireEvent.click(addBtn);

      const store = useTacticalUnifiedStore.getState();
      expect(store.project.slides).toHaveLength(3);

      // 初期値を確認（デフォルト: duration=1000, pause=500, easing='ease-in-out'）
      const initialSlides = store.project.slides;
      expect(initialSlides[0].pauseMs).toBe(500);
      expect(initialSlides[1].transitionDurationMs).toBe(1000);

      // 一括設定ポップオーバーを開く
      const batchBtn = screen.getByRole('button', { name: /一括設定/i });
      fireEvent.click(batchBtn);

      // 移動時間を 2.5s に変更
      const durationSlider = screen.getByLabelText('一括移動時間');
      fireEvent.change(durationSlider, { target: { value: '2.5' } });

      let currentSlides = useTacticalUnifiedStore.getState().project.slides;
      expect(currentSlides[0].transitionDurationMs).toBe(2500);
      expect(currentSlides[1].transitionDurationMs).toBe(2500);
      expect(currentSlides[2].transitionDurationMs).toBe(2500);

      // 静止時間を 1.2s に変更
      const pauseSlider = screen.getByLabelText('一括静止時間');
      fireEvent.change(pauseSlider, { target: { value: '1.2' } });

      currentSlides = useTacticalUnifiedStore.getState().project.slides;
      expect(currentSlides[0].pauseMs).toBe(1200);
      expect(currentSlides[1].pauseMs).toBe(1200);
      expect(currentSlides[2].pauseMs).toBe(1200);

      // イージングを 'linear' に変更
      const easingSelect = screen.getByLabelText('一括加減速 (イージング)');
      fireEvent.change(easingSelect, { target: { value: 'linear' } });

      currentSlides = useTacticalUnifiedStore.getState().project.slides;
      expect(currentSlides[0].easing).toBe('linear');
      expect(currentSlides[1].easing).toBe('linear');
      expect(currentSlides[2].easing).toBe('linear');

      // 1回の Undo で直前のイージング変更が復元される
      useTacticalUnifiedStore.getState().undo();
      currentSlides = useTacticalUnifiedStore.getState().project.slides;
      expect(currentSlides[0].easing).toBe('ease-in-out');
      expect(currentSlides[1].easing).toBe('ease-in-out');
      expect(currentSlides[2].easing).toBe('ease-in-out');
    });
  });

  describe('レイアウト崩れ防止 (min-w-0 / overflow-x-auto)', () => {
    it('サムネイル横スクロール領域に min-w-0, overflow-x-auto, timeline-scrollbar, cursor-grab が適用されている', () => {
      const { container } = render(<TimelineBar />);
      const scrollArea = container.querySelector('.overflow-x-auto');
      expect(scrollArea).not.toBeNull();
      expect(scrollArea?.className).toContain('min-w-0');
      expect(scrollArea?.className).toContain('flex-1');
      expect(scrollArea?.className).toContain('timeline-scrollbar');
      expect(scrollArea?.className).toContain('cursor-grab');

      const activeSlideId = useTacticalUnifiedStore.getState().activeSlideId;
      const slideCardEl = container.querySelector(
        `[data-slide-id="${activeSlideId}"]`,
      );
      expect(slideCardEl).not.toBeNull();
      expect(slideCardEl?.getAttribute('data-slide-card')).toBe('true');
    });
  });
});
