import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { TransitionConnector } from '../transition-connector';

function renderWithProvider(ui: ReactNode) {
  return render(<TacticalStoreProvider>{ui}</TacticalStoreProvider>);
}

function createMockSlide(overrides?: Partial<DomainSlide>): DomainSlide {
  return {
    id: 'mock-slide-2',
    index: 1,
    label: 'Scene 2',
    players: [],
    arrows: [],
    zones: [],
    texts: [],
    ball: { x: clampToScreenNorm(50), y: clampToScreenNorm(50), visible: true },
    transitionDurationMs: 1500,
    pauseMs: 500,
    easing: 'ease-in-out',
    ...overrides,
  };
}

describe('TransitionConnector Component', () => {
  it('秒数表示（durationSec）が「1.5s」形式で正しくレンダリングされること', () => {
    const slide = createMockSlide({ transitionDurationMs: 1500 });
    renderWithProvider(
      <TransitionConnector targetSlide={slide} targetIndex={1} />,
    );

    const button = screen.getByRole('button', {
      name: /Scene 2 トランジション: 1.5s/i,
    });
    expect(button).toBeDefined();
    expect(screen.getByText('1.5s')).toBeDefined();
  });

  it('クリックで SlideTransitionPopover が開くこと', () => {
    const slide = createMockSlide();
    renderWithProvider(
      <TransitionConnector targetSlide={slide} targetIndex={1} />,
    );

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
    renderWithProvider(
      <TransitionConnector targetSlide={slide} targetIndex={1} />,
    );

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

  describe('カメラ移動モードのバッジ非表示', () => {
    it('どのような cameraTransitionMode であっても CAM バッジが表示されないこと', () => {
      const slowSlide = createMockSlide({
        cameraTransitionMode: 'slow',
        cameraDurationMs: 10000,
      });
      renderWithProvider(
        <TransitionConnector targetSlide={slowSlide} targetIndex={1} />,
      );
      expect(screen.queryByText(/CAM/)).toBeNull();

      const continuousSlide = createMockSlide({
        cameraTransitionMode: 'continuous',
      });
      renderWithProvider(
        <TransitionConnector targetSlide={continuousSlide} targetIndex={1} />,
      );
      expect(screen.queryByText(/CAM/)).toBeNull();

      const cutSlide = createMockSlide({
        cameraTransitionMode: 'cut',
      });
      renderWithProvider(
        <TransitionConnector targetSlide={cutSlide} targetIndex={1} />,
      );
      expect(screen.queryByText(/CAM/)).toBeNull();
    });
  });
});
