import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  createDocumentStore,
  type DocumentStore,
} from '@/features/tactical-unified/stores/document-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { BatchTransitionPopover } from '../batch-transition-popover';
import { SlideCard } from '../slide-card';
import { SlideCardActions } from '../slide-card-actions';
import { SlideContextMenu } from '../slide-context-menu';
import { SlideTransitionPopover } from '../slide-transition-popover';

function createTestSetup() {
  const base = createDefaultTacticalProject();
  const phase = base.phases[0]!;
  const slide1 = phase.slides[0]!;
  const slide2: DomainSlide = {
    ...slide1,
    id: 'slide-2',
    index: 1,
    label: 'Scene 2',
    transitionDurationMs: 1500,
    pauseMs: 800,
    easing: 'ease-in-out',
  };
  const project = { ...base, phases: [{ ...phase, slides: [slide1, slide2] }] };
  const docStore = createDocumentStore(project);
  const sessStore = createSessionStore({
    activePhaseId: phase.id,
    activeSlideId: slide2.id,
  });
  const renderWithProvider = (ui: ReactNode) =>
    render(
      <TacticalStoreProvider
        stores={{ documentStore: docStore, sessionStore: sessStore }}
      >
        {ui}
      </TacticalStoreProvider>,
    );
  return { docStore, slide1, slide2, renderWithProvider };
}

describe('SlideTransitionPopover Component', () => {
  it('renders nothing when isOpen is false', () => {
    const { slide2, renderWithProvider } = createTestSetup();
    const handleClose = vi.fn();
    renderWithProvider(
      <SlideTransitionPopover
        slide={slide2}
        index={1}
        isOpen={false}
        onClose={handleClose}
        referenceElement={null}
      />,
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders transition controls when isOpen is true', () => {
    const { slide2, renderWithProvider } = createTestSetup();
    const handleClose = vi.fn();
    const anchor = document.createElement('div');
    renderWithProvider(
      <SlideTransitionPopover
        slide={slide2}
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
    const { docStore, slide2, renderWithProvider } = createTestSetup();
    const anchor = document.createElement('div');

    renderWithProvider(
      <SlideTransitionPopover
        slide={slide2}
        index={1}
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    fireEvent.change(screen.getByLabelText(/移動時間/i), {
      target: { value: '2.5' },
    });
    expect(
      docStore.getState().project.phases[0]?.slides[1]?.transitionDurationMs,
    ).toBe(2500);

    fireEvent.change(screen.getByLabelText(/静止時間/i), {
      target: { value: '1.2' },
    });
    expect(docStore.getState().project.phases[0]?.slides[1]?.pauseMs).toBe(
      1200,
    );
  });

  it('updates easing on change', () => {
    const { docStore, slide2, renderWithProvider } = createTestSetup();
    const anchor = document.createElement('div');

    renderWithProvider(
      <SlideTransitionPopover
        slide={slide2}
        index={1}
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    fireEvent.change(screen.getByLabelText(/加減速/i), {
      target: { value: 'linear' },
    });
    expect(docStore.getState().project.phases[0]?.slides[1]?.easing).toBe(
      'linear',
    );
  });

  it('disables duration input for Scene 1 (index === 0) while keeping pause enabled', () => {
    const { slide1, renderWithProvider } = createTestSetup();
    const anchor = document.createElement('div');

    renderWithProvider(
      <SlideTransitionPopover
        slide={slide1}
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

  it('does not render camera transition settings in SlideTransitionPopover', () => {
    const { slide2, renderWithProvider } = createTestSetup();
    const anchor = document.createElement('div');
    renderWithProvider(
      <SlideTransitionPopover
        slide={slide2}
        index={1}
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    expect(screen.queryByText('カメラ移動')).toBeNull();
    expect(screen.queryByRole('button', { name: 'スロー' })).toBeNull();
    expect(screen.queryByRole('button', { name: '継続' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cut' })).toBeNull();
    expect(screen.queryByRole('button', { name: '連動' })).toBeNull();
    expect(screen.queryByLabelText(/カメラ秒数/)).toBeNull();
  });
});

describe('SlideCard Integration with SlideTransitionPopover', () => {
  it('opens popover when clicking the duration time display', () => {
    const { slide1, renderWithProvider } = createTestSetup();
    renderWithProvider(
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
    const { slide1, renderWithProvider } = createTestSetup();
    renderWithProvider(
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
    const { slide1, renderWithProvider } = createTestSetup();
    renderWithProvider(
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
    const { slide1, renderWithProvider } = createTestSetup();
    renderWithProvider(
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
    const { renderWithProvider } = createTestSetup();
    const anchor = document.createElement('div');
    renderWithProvider(
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
    const { renderWithProvider } = createTestSetup();
    const anchor = document.createElement('div');
    renderWithProvider(
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

  it('does not render camera transition settings in BatchTransitionPopover', () => {
    const { renderWithProvider } = createTestSetup();
    const anchor = document.createElement('div');
    renderWithProvider(
      <BatchTransitionPopover
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    expect(screen.queryByText('カメラ移動')).toBeNull();
    expect(screen.queryByRole('button', { name: 'スロー' })).toBeNull();
    expect(screen.queryByRole('button', { name: '継続' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Cut' })).toBeNull();
    expect(screen.queryByRole('button', { name: '連動' })).toBeNull();
    expect(screen.queryByLabelText(/一括カメラ秒数/)).toBeNull();
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
    const { slide2, renderWithProvider } = createTestSetup();
    const anchor = document.createElement('div');
    renderWithProvider(
      <SlideTransitionPopover
        slide={slide2}
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
