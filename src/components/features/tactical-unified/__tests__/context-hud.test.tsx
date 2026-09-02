import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import { ContextHud } from '../context-hud';

describe('ContextHud Component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().clearSelection();
  });

  it('renders nothing when no object is selected', () => {
    const { container } = render(
      <ContextHud stageSize={{ width: 800, height: 450 }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when multiple objects are selected', () => {
    const state = useTacticalUnifiedStore.getState();
    const activeSlide =
      state.project.slides.find((s) => s.id === state.activeSlideId) ??
      state.project.slides[0];
    const p1 = activeSlide.players[0];
    const p2 = activeSlide.players[1];

    state.selectObjects([
      { id: p1.id, kind: 'player' },
      { id: p2.id, kind: 'player' },
    ]);

    const { container } = render(
      <ContextHud stageSize={{ width: 800, height: 450 }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders player HUD and allows editing shirt number and deleting player', () => {
    const state = useTacticalUnifiedStore.getState();
    const activeSlide =
      state.project.slides.find((s) => s.id === state.activeSlideId) ??
      state.project.slides[0];
    const player = activeSlide.players[0];

    state.selectObject({ id: player.id, kind: 'player' });

    render(<ContextHud stageSize={{ width: 800, height: 450 }} />);

    // HUD toolbar exists
    const toolbar = screen.getByRole('toolbar', {
      name: /コンテキスト操作ツールバー/i,
    });
    expect(toolbar).toBeDefined();

    // Shirt number input
    const shirtInput = screen.getByTitle('背番号') as HTMLInputElement;
    expect(shirtInput).toBeDefined();

    fireEvent.change(shirtInput, { target: { value: '99' } });
    const updatedPlayer = useTacticalUnifiedStore
      .getState()
      .project.slides[0].players.find((p) => p.id === player.id);
    expect(updatedPlayer?.shirtNo).toBe('99');

    // Delete player
    const deleteBtn = screen.getByTitle('削除 (Delete)');
    fireEvent.click(deleteBtn);

    const playerAfterDelete = useTacticalUnifiedStore
      .getState()
      .project.slides[0].players.find((p) => p.id === player.id);
    expect(playerAfterDelete).toBeUndefined();
    expect(useTacticalUnifiedStore.getState().selectedObjects.length).toBe(0);
  });

  it('renders arrow HUD and allows updating stroke width and toggling dash', () => {
    const state = useTacticalUnifiedStore.getState();
    const activeSlideId = state.activeSlideId;

    state.addArrow(activeSlideId, {
      id: 'test-arrow-1',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 10, y: 10 },
        { x: 40, y: 40 },
      ],
      color: '#ffffff',
      strokeWidth: 3,
      dashArray: [],
      arrowHead: true,
    });

    state.selectObject({ id: 'test-arrow-1', kind: 'arrow' });

    render(<ContextHud stageSize={{ width: 800, height: 450 }} />);

    expect(screen.getByText('3px')).toBeDefined();

    // Thick line button
    const plusBtn = screen.getByTitle('線を太く');
    fireEvent.click(plusBtn);

    let currentArrow = useTacticalUnifiedStore
      .getState()
      .project.slides[0].arrows.find((a) => a.id === 'test-arrow-1');
    expect(currentArrow?.strokeWidth).toBe(4);

    // Toggle dash
    const dashToggleBtn = screen.getByTitle('実線 (点線に切替)');
    fireEvent.click(dashToggleBtn);

    currentArrow = useTacticalUnifiedStore
      .getState()
      .project.slides[0].arrows.find((a) => a.id === 'test-arrow-1');
    expect(currentArrow?.dashArray).toEqual([6, 4]);
  });
});
