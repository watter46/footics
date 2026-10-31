import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { createDefaultSlide, type Slide } from '@/lib/types/tactical-unified';
import { BatchTransitionPopover } from '../batch-transition-popover';
import { SlideCard } from '../slide-card';
import { SlideCardActions } from '../slide-card-actions';
import { SlideContextMenu } from '../slide-context-menu';
import { SlideTransitionPopover } from '../slide-transition-popover';

describe('SlideTransitionPopover Component', () => {
  const dummySlide = {
    ...createDefaultSlide(1, 'slide-2'),
    label: 'Scene 2',
    transitionDurationMs: 1500,
    pauseMs: 800,
    easing: 'ease-in-out' as const,
  };

  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('renders nothing when isOpen is false', () => {
    const handleClose = vi.fn();
    render(
      <SlideTransitionPopover
        slide={dummySlide}
        index={1}
        isOpen={false}
        onClose={handleClose}
        referenceElement={null}
      />,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders transition controls when isOpen is true', () => {
    const handleClose = vi.fn();
    const anchor = document.createElement('div');
    render(
      <SlideTransitionPopover
        slide={dummySlide}
        index={1}
        isOpen={true}
        onClose={handleClose}
        referenceElement={anchor}
      />,
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByLabelText(/移動時間/i)).toBeDefined();
    expect(screen.getByLabelText(/静止時間/i)).toBeDefined();
    expect(screen.getByLabelText(/イージング|加減速/i)).toBeDefined();
  });

  it('updates transitionDurationMs and pauseMs on change', () => {
    const updateSpy = vi.spyOn(
      useTacticalUnifiedStore.getState(),
      'updateSlideTransition',
    );
    const anchor = document.createElement('div');

    render(
      <SlideTransitionPopover
        slide={dummySlide}
        index={1}
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    const durationInput = screen.getByLabelText(/移動時間/i);
    fireEvent.change(durationInput, { target: { value: '2.5' } });

    expect(updateSpy).toHaveBeenCalledWith('slide-2', {
      transitionDurationMs: 2500,
    });

    const pauseInput = screen.getByLabelText(/静止時間/i);
    fireEvent.change(pauseInput, { target: { value: '1.2' } });

    expect(updateSpy).toHaveBeenCalledWith('slide-2', {
      pauseMs: 1200,
    });
  });

  it('updates easing on change', () => {
    const updateSpy = vi.spyOn(
      useTacticalUnifiedStore.getState(),
      'updateSlideTransition',
    );
    const anchor = document.createElement('div');

    render(
      <SlideTransitionPopover
        slide={dummySlide}
        index={1}
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    const easingSelect = screen.getByLabelText(/イージング|加減速/i);
    fireEvent.change(easingSelect, { target: { value: 'linear' } });

    expect(updateSpy).toHaveBeenCalledWith('slide-2', {
      easing: 'linear',
    });
  });

  it('disables duration input for Scene 1 (index === 0) while keeping pause enabled', () => {
    const anchor = document.createElement('div');
    const firstSlide: Slide = {
      ...dummySlide,
      id: 'slide-1',
      index: 0,
      label: 'Scene 1',
    };

    render(
      <SlideTransitionPopover
        slide={firstSlide}
        index={0}
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    const durationInput = screen.getByLabelText(
      /移動時間/i,
    ) as HTMLInputElement;
    const pauseInput = screen.getByLabelText(/静止時間/i) as HTMLInputElement;

    expect(durationInput.disabled).toBe(true);
    expect(pauseInput.disabled).toBe(false);
  });

  it('updates cameraTransitionMode when camera mode buttons are clicked', () => {
    const updateSpy = vi.spyOn(
      useTacticalUnifiedStore.getState(),
      'updateSlideTransition',
    );
    const anchor = document.createElement('div');

    render(
      <SlideTransitionPopover
        slide={dummySlide}
        index={1}
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    const slowBtn = screen.getByRole('button', { name: 'スロー' });
    fireEvent.click(slowBtn);
    expect(updateSpy).toHaveBeenCalledWith('slide-2', {
      cameraTransitionMode: 'slow',
    });

    const continuousBtn = screen.getByRole('button', { name: '継続' });
    fireEvent.click(continuousBtn);
    expect(updateSpy).toHaveBeenCalledWith('slide-2', {
      cameraTransitionMode: 'continuous',
    });

    const cutBtn = screen.getByRole('button', { name: 'Cut' });
    fireEvent.click(cutBtn);
    expect(updateSpy).toHaveBeenCalledWith('slide-2', {
      cameraTransitionMode: 'cut',
    });

    const syncBtn = screen.getByRole('button', { name: '連動' });
    fireEvent.click(syncBtn);
    expect(updateSpy).toHaveBeenCalledWith('slide-2', {
      cameraTransitionMode: 'sync',
    });
  });

  it('displays camera duration slider when cameraTransitionMode is slow and updates duration', () => {
    const updateSpy = vi.spyOn(
      useTacticalUnifiedStore.getState(),
      'updateSlideTransition',
    );
    const anchor = document.createElement('div');
    const slowSlide: Slide = {
      ...dummySlide,
      cameraTransitionMode: 'slow',
      cameraDurationMs: 8000,
    };

    render(
      <SlideTransitionPopover
        slide={slowSlide}
        index={1}
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    const cameraSlider = screen.getByLabelText(
      'カメラ秒数',
    ) as HTMLInputElement;
    expect(cameraSlider).toBeDefined();
    expect(cameraSlider.value).toBe('8');

    fireEvent.change(cameraSlider, { target: { value: '12.5' } });
    expect(updateSpy).toHaveBeenCalledWith('slide-2', {
      cameraDurationMs: 12500,
    });
  });

  it('disables camera mode buttons for Scene 1 (index === 0)', () => {
    const anchor = document.createElement('div');
    const firstSlide: Slide = {
      ...dummySlide,
      id: 'slide-1',
      index: 0,
      label: 'Scene 1',
    };

    render(
      <SlideTransitionPopover
        slide={firstSlide}
        index={0}
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    for (const name of ['連動', 'スロー', '継続', 'Cut']) {
      const btn = screen.getByRole('button', { name }) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    }
  });
});

describe('SlideCard Integration with SlideTransitionPopover', () => {
  const slide1 = {
    ...createDefaultSlide(0, 's-1'),
    label: 'Scene 1',
    transitionDurationMs: 1000,
    pauseMs: 500,
  };

  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('opens popover when clicking the duration time display', () => {
    render(
      <SlideCard
        slide={slide1}
        index={0}
        isActive={true}
        canDelete={false}
        canMoveLeft={false}
        canMoveRight={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        onMoveLeft={vi.fn()}
        onMoveRight={vi.fn()}
      />,
    );

    // Initial: popover is not visible
    expect(screen.queryByRole('dialog')).toBeNull();

    // Click duration badge
    const durationBtn = screen.getByRole('button', {
      name: /edit scene transition/i,
    });
    fireEvent.click(durationBtn);

    // Popover is open
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('opens popover when clicking settings button in hover actions', () => {
    render(
      <SlideCard
        slide={slide1}
        index={0}
        isActive={true}
        canDelete={false}
        canMoveLeft={false}
        canMoveRight={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        onMoveLeft={vi.fn()}
        onMoveRight={vi.fn()}
      />,
    );

    // Click hover action settings button
    const settingsBtn = screen.getByRole('button', {
      name: /open transition settings/i,
    });
    fireEvent.click(settingsBtn);

    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('opens popover when selecting transition settings from right-click context menu', () => {
    render(
      <SlideCard
        slide={slide1}
        index={0}
        isActive={true}
        canDelete={false}
        canMoveLeft={false}
        canMoveRight={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        onMoveLeft={vi.fn()}
        onMoveRight={vi.fn()}
      />,
    );

    // Right-click scene card
    const sceneCard = screen.getByRole('button', { name: 'Scene 1' });
    fireEvent.contextMenu(sceneCard);

    // Click context menu item "トランジション設定..."
    const menuBtn = screen.getByRole('menuitem', {
      name: /トランジション設定/i,
    });
    fireEvent.click(menuBtn);

    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('displays pause duration instead of total transition duration', () => {
    render(
      <SlideCard
        slide={slide1}
        index={0}
        isActive={true}
        canDelete={false}
        canMoveLeft={false}
        canMoveRight={false}
        onSelect={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        onMoveLeft={vi.fn()}
        onMoveRight={vi.fn()}
      />,
    );

    const pauseBtn = screen.getByRole('button', {
      name: /edit scene transition/i,
    });
    expect(pauseBtn.textContent).toContain('0.5s');
    expect(pauseBtn.textContent).not.toContain('1.5s');
  });
});

describe('SlideCardActions Component', () => {
  it('renders within card frame with top-1 and right-1 positioning classes', () => {
    const { container } = render(
      <SlideCardActions
        slideId="slide-1"
        canDelete={true}
        canMoveLeft={true}
        canMoveRight={true}
        onDuplicate={vi.fn()}
        onMoveLeft={vi.fn()}
        onMoveRight={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const actionContainer = container.firstElementChild as HTMLElement;
    expect(actionContainer.className).toContain('top-1');
    expect(actionContainer.className).toContain('right-1');
    expect(actionContainer.className).not.toContain('-top-2');
    expect(actionContainer.className).not.toContain('-right-1');
  });
});

describe('BatchTransitionPopover Component', () => {
  it('renders in FloatingPortal when isOpen is true', () => {
    const anchor = document.createElement('div');
    render(
      <BatchTransitionPopover
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    const dialog = screen.getByRole('dialog', {
      name: /全シーン トランジション一括設定/i,
    });
    expect(dialog).toBeDefined();
    expect(screen.getByLabelText(/一括移動時間/i)).toBeDefined();
    expect(screen.getByLabelText(/一括静止時間/i)).toBeDefined();
  });

  it('uses L3 background and eliminates legacy blue #60A5FA', () => {
    const anchor = document.createElement('div');
    render(
      <BatchTransitionPopover
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );
    const dialog = screen.getByRole('dialog', {
      name: /全シーン トランジション一括設定/i,
    });
    expect(dialog.className).toContain('bg-[#222226]');
    expect(dialog.innerHTML).not.toContain('#60A5FA');
  });

  it('updates cameraTransitionMode and cameraDurationMs across all slides in batch', () => {
    const updateSpy = vi.spyOn(
      useTacticalUnifiedStore.getState(),
      'updateAllSlideTransitions',
    );
    const anchor = document.createElement('div');
    render(
      <BatchTransitionPopover
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    const slowBtn = screen.getByRole('button', { name: 'スロー' });
    fireEvent.click(slowBtn);
    expect(updateSpy).toHaveBeenCalledWith({
      cameraTransitionMode: 'slow',
    });
  });

  it('updates batch camera duration slider when mode is slow', () => {
    // 状態としてスライド2枚目（代表）に cameraTransitionMode: 'slow' をセット
    const store = useTacticalUnifiedStore.getState();
    store.updateSlideTransition('slide-2', {
      cameraTransitionMode: 'slow',
      cameraDurationMs: 6000,
    });
    const updateSpy = vi.spyOn(store, 'updateAllSlideTransitions');
    const anchor = document.createElement('div');

    render(
      <BatchTransitionPopover
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    const slider = screen.getByLabelText('一括カメラ秒数') as HTMLInputElement;
    expect(slider).toBeDefined();
    fireEvent.change(slider, { target: { value: '15' } });
    expect(updateSpy).toHaveBeenCalledWith({
      cameraDurationMs: 15000,
    });
  });
});

describe('Design System Token & Primitives Verification', () => {
  it('SlideCardActions uses IconButton with xs size', () => {
    const { container } = render(
      <SlideCardActions
        slideId="slide-1"
        canDelete={true}
        canMoveLeft={true}
        canMoveRight={true}
        onDuplicate={vi.fn()}
        onMoveLeft={vi.fn()}
        onMoveRight={vi.fn()}
        onDelete={vi.fn()}
        onOpenTransitionSettings={vi.fn()}
      />,
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.className).toContain('size-6');
      expect(btn.className).toContain('btn-interactive');
    }
  });

  it('SlideContextMenu uses L3 background and eliminates legacy blue #60A5FA', () => {
    const { container } = render(
      <SlideContextMenu
        x={100}
        y={100}
        slideId="slide-1"
        canDelete={true}
        canMoveLeft={true}
        canMoveRight={true}
        onDuplicate={vi.fn()}
        onMoveLeft={vi.fn()}
        onMoveRight={vi.fn()}
        onDelete={vi.fn()}
        onOpenTransitionSettings={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const menu = container.firstElementChild as HTMLElement;
    expect(menu.className).toContain('bg-[#222226]');
    expect(menu.innerHTML).not.toContain('#60A5FA');
  });

  it('SlideTransitionPopover uses L3 background and eliminates legacy blue #60A5FA', () => {
    const dummySlide = {
      ...createDefaultSlide(1, 'slide-2'),
      label: 'Scene 2',
      transitionDurationMs: 1500,
      pauseMs: 800,
      easing: 'ease-in-out' as const,
    };
    const anchor = document.createElement('div');
    render(
      <SlideTransitionPopover
        slide={dummySlide}
        index={1}
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );
    const dialog = screen.getByRole('dialog', {
      name: /シーン トランジション設定/i,
    });
    expect(dialog.className).toContain('bg-[#222226]');
    expect(dialog.innerHTML).not.toContain('#60A5FA');
  });
});
