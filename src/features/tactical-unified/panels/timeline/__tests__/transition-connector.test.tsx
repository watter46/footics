import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Slide } from '@/lib/types/tactical-unified';
import { TransitionConnector } from '../transition-connector';

function createMockSlide(overrides?: Partial<Slide>): Slide {
  return {
    id: 'mock-slide-2',
    index: 1,
    label: 'Scene 2',
    players: [],
    drawings: [],
    transitionDurationMs: 1500,
    pauseMs: 500,
    easing: 'ease-in-out',
    ...overrides,
  } as Slide;
}

describe('TransitionConnector Component', () => {
  it('秒数表示（durationSec）が「1.5s」形式で正しくレンダリングされること', () => {
    const slide = createMockSlide({ transitionDurationMs: 1500 });
    render(<TransitionConnector targetSlide={slide} targetIndex={1} />);

    const button = screen.getByRole('button', {
      name: /Scene 2 トランジション: 1.5s/i,
    });
    expect(button).toBeDefined();
    expect(screen.getByText('1.5s')).toBeDefined();
  });

  it('クリックで SlideTransitionPopover が開くこと', () => {
    const slide = createMockSlide();
    render(<TransitionConnector targetSlide={slide} targetIndex={1} />);

    expect(
      screen.queryByRole('dialog', { name: /シーン トランジション設定/i }),
    ).toBeNull();

    const button = screen.getByRole('button', {
      name: /Scene 2 トランジション/i,
    });
    fireEvent.click(button);

    expect(
      screen.getByRole('dialog', { name: /シーン トランジション設定/i }),
    ).toBeDefined();
  });

  it('onPointerDown / onClick で stopPropagation が呼ばれること', () => {
    const slide = createMockSlide();
    render(<TransitionConnector targetSlide={slide} targetIndex={1} />);

    const button = screen.getByRole('button', {
      name: /Scene 2 トランジション/i,
    });

    const pointerDownEvent = new MouseEvent('pointerdown', { bubbles: true });
    const pointerDownSpy = vi.spyOn(pointerDownEvent, 'stopPropagation');
    fireEvent(button, pointerDownEvent);
    expect(pointerDownSpy).toHaveBeenCalled();

    const clickEvent = new MouseEvent('click', { bubbles: true });
    const clickSpy = vi.spyOn(clickEvent, 'stopPropagation');
    fireEvent(button, clickEvent);
    expect(clickSpy).toHaveBeenCalled();
  });
});
