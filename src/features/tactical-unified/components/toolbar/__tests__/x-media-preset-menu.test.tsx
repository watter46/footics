import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { XMediaPresetMenu } from '../x-media-preset-menu';

describe('XMediaPresetMenu rendering and toggle', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('renders trigger button and toggles menu on click', () => {
    render(<XMediaPresetMenu />);

    const triggerBtn = screen.getByRole('button', {
      name: /Xメディア最適化比率メニュー/i,
    });
    expect(triggerBtn).toBeDefined();
    expect(screen.queryByRole('dialog')).toBeNull();

    // Open menu
    fireEvent.click(triggerBtn);
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('X メディア最適化比率')).toBeDefined();

    // Close menu on toggle
    fireEvent.click(triggerBtn);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('displays all 4 primary X presets and pitch fit reset option', () => {
    render(<XMediaPresetMenu />);

    const triggerBtn = screen.getByRole('button', {
      name: /Xメディア最適化比率メニュー/i,
    });
    fireEvent.click(triggerBtn);

    expect(screen.getByText(/画像1枚 \(4:5\)/i)).toBeDefined();
    expect(screen.getByText(/画像2枚カルーセル \(9:16\)/i)).toBeDefined();
    expect(screen.getByText(/動画1本 \(9:16\)/i)).toBeDefined();
    expect(screen.getByText(/ピッチ全体横画像 \(16:9\)/i)).toBeDefined();
    expect(screen.getByText(/ピッチ白線フィット/i)).toBeDefined();
  });

  it('closes menu when Escape key is pressed', () => {
    render(<XMediaPresetMenu />);

    const triggerBtn = screen.getByRole('button', {
      name: /Xメディア最適化比率メニュー/i,
    });
    fireEvent.click(triggerBtn);
    expect(screen.getByRole('dialog')).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('XMediaPresetMenu preset selection actions', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('applies 4:5 preset when clicked and updates slide boundaryBox', () => {
    render(<XMediaPresetMenu />);

    const triggerBtn = screen.getByRole('button', {
      name: /Xメディア最適化比率メニュー/i,
    });
    fireEvent.click(triggerBtn);

    fireEvent.click(screen.getByText(/画像1枚 \(4:5\)/i));
    expect(screen.queryByRole('dialog')).toBeNull();

    const state = useTacticalUnifiedStore.getState();
    const activeSlide = state.project.slides.find(
      (s) => s.id === state.activeSlideId,
    );
    expect(activeSlide?.boundaryBox?.enabled).toBe(true);
    expect(activeSlide?.boundaryBox?.height).toBe(100);
    expect(activeSlide?.boundaryBox?.width).toBe(45);
  });

  it('applies 9:16 preset and pitch fit reset option', () => {
    render(<XMediaPresetMenu />);

    const triggerBtn = screen.getByRole('button', {
      name: /Xメディア最適化比率メニュー/i,
    });
    fireEvent.click(triggerBtn);
    fireEvent.click(screen.getByText(/画像2枚カルーセル \(9:16\)/i));

    let state = useTacticalUnifiedStore.getState();
    let activeSlide = state.project.slides.find(
      (s) => s.id === state.activeSlideId,
    );
    expect(activeSlide?.boundaryBox?.width).toBe(31.64);

    // Apply pitch_fit
    fireEvent.click(triggerBtn);
    fireEvent.click(screen.getByText(/ピッチ白線フィット/i));

    state = useTacticalUnifiedStore.getState();
    activeSlide = state.project.slides.find(
      (s) => s.id === state.activeSlideId,
    );
    expect(activeSlide?.boundaryBox?.x).toBe(7.25);
    expect(activeSlide?.boundaryBox?.y).toBe(0.43);
  });
});
