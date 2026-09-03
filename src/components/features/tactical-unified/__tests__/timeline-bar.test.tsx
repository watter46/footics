import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import { TimelineBar } from '../timeline/timeline-bar';

describe('TimelineBar Component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('renders playback controls and initial scene', () => {
    render(<TimelineBar />);

    expect(screen.getByRole('button', { name: /play/i })).toBeDefined();
    expect(screen.getByText(/Total 1.5s/i)).toBeDefined();
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
});
