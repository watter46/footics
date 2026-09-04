import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { ContextHud } from '../context-hud';

describe('ContextHud Selection & Visibility', () => {
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
});

describe('ContextHud Controls for Elements', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().clearSelection();
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

describe('ContextHud Controls for Zone, Text, and Ball', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().clearSelection();
  });

  it('renders zone HUD and allows toggling opacity and deleting zone', () => {
    const state = useTacticalUnifiedStore.getState();
    const activeSlideId = state.activeSlideId;

    state.addZone(activeSlideId, {
      id: 'test-zone-1',
      name: 'Zone 14',
      zoneType: 'box',
      x: 30,
      y: 30,
      width: 20,
      height: 20,
      color: '#f59e0b',
      opacity: 0.25,
    });

    state.selectObject({ id: 'test-zone-1', kind: 'zone' });

    render(<ContextHud stageSize={{ width: 800, height: 450 }} />);

    const opacityBtn = screen.getByTitle('不透明度 (クリックで切替)');
    expect(opacityBtn.textContent).toBe('25%');

    fireEvent.click(opacityBtn);
    let currentZone = useTacticalUnifiedStore
      .getState()
      .project.slides[0].zones.find((z) => z.id === 'test-zone-1');
    expect(currentZone?.opacity).toBe(0.6);

    const deleteBtn = screen.getByTitle('削除 (Delete)');
    fireEvent.click(deleteBtn);

    currentZone = useTacticalUnifiedStore
      .getState()
      .project.slides[0].zones.find((z) => z.id === 'test-zone-1');
    expect(currentZone).toBeUndefined();
    expect(useTacticalUnifiedStore.getState().selectedObjects.length).toBe(0);
  });

  it('renders text HUD and allows updating font size', () => {
    const state = useTacticalUnifiedStore.getState();
    const activeSlideId = state.activeSlideId;

    state.addText(activeSlideId, {
      id: 'test-text-1',
      text: 'Tactics Note',
      x: 50,
      y: 50,
      fontSize: 16,
      color: '#ffffff',
    });

    state.selectObject({ id: 'test-text-1', kind: 'text' });

    render(<ContextHud stageSize={{ width: 800, height: 450 }} />);

    expect(screen.getByText('16px')).toBeDefined();

    const plusBtn = screen.getByTitle('文字を大きく');
    fireEvent.click(plusBtn);

    const currentText = useTacticalUnifiedStore
      .getState()
      .project.slides[0].texts.find((t) => t.id === 'test-text-1');
    expect(currentText?.fontSize).toBe(18);
  });

  it('renders ball HUD and allows toggling lock', () => {
    const state = useTacticalUnifiedStore.getState();
    state.selectObject({ id: 'ball', kind: 'ball' });

    render(<ContextHud stageSize={{ width: 800, height: 450 }} />);

    const lockBtn = screen.getByTitle('ボールをロック (固定)');
    fireEvent.click(lockBtn);

    const ball = useTacticalUnifiedStore.getState().project.slides[0].ball;
    expect(ball.locked).toBe(true);
  });
});
