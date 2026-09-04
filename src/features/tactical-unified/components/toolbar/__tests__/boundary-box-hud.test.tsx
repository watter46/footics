import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { BoundaryBoxHud } from '../boundary-box-hud';

describe('BoundaryBoxHud component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().setIsExporting(false);
  });

  it('renders boundary box HUD with matched aspect ratio and snap buttons', () => {
    render(<BoundaryBoxHud stageSize={{ width: 800, height: 450 }} />);

    const hud = screen.getByRole('complementary', {
      name: /Boundary Box Ratio HUD/i,
    });
    expect(hud).toBeDefined();

    // Default 4:5 full boundary box matches 4:5
    expect(screen.getAllByText('4:5').length).toBeGreaterThanOrEqual(1);

    // Has snap buttons for all 4 ratios
    expect(
      screen.getByRole('button', { name: 'Snap boundary to 16:9' }),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Snap boundary to 9:16' }),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Snap boundary to 4:5' }),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Snap boundary to 1:1' }),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'AutoFitPitch' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'AutoFitCanvas' })).toBeDefined();
  });

  it('snaps boundary box to 4:5 when 4:5 button is clicked', () => {
    render(<BoundaryBoxHud stageSize={{ width: 800, height: 450 }} />);

    const btn45 = screen.getByRole('button', { name: 'Snap boundary to 4:5' });
    fireEvent.click(btn45);

    const state = useTacticalUnifiedStore.getState();
    const activeSlide = state.project.slides.find(
      (s) => s.id === state.activeSlideId,
    );
    expect(activeSlide?.boundaryBox?.enabled).toBe(true);
    // On 4:5 canvas, 4:5 snap occupies 100% width and 100% height
    expect(activeSlide?.boundaryBox?.height).toBe(100);
    expect(activeSlide?.boundaryBox?.width).toBe(100);
  });

  it('snaps boundary box to pitch outer boundary when AutoFitPitch is clicked', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    // Set custom box
    store.setBoundaryBox(slideId, {
      x: 20,
      y: 20,
      width: 60,
      height: 60,
      enabled: true,
    });

    render(<BoundaryBoxHud stageSize={{ width: 800, height: 450 }} />);

    const pitchFitBtn = screen.getByRole('button', { name: 'AutoFitPitch' });
    fireEvent.click(pitchFitBtn);

    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(activeSlide?.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
    });
  });

  it('snaps boundary box to full canvas when AutoFitCanvas is clicked', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    // Set custom box
    store.setBoundaryBox(slideId, {
      x: 20,
      y: 20,
      width: 60,
      height: 60,
      enabled: true,
    });

    render(<BoundaryBoxHud stageSize={{ width: 800, height: 450 }} />);

    const fitBtn = screen.getByRole('button', { name: 'AutoFitCanvas' });
    fireEvent.click(fitBtn);

    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(activeSlide?.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
    });
  });

  it('does not render when boundary box is disabled or exporting', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    store.setBoundaryBox(slideId, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: false,
    });

    const { rerender } = render(
      <BoundaryBoxHud stageSize={{ width: 800, height: 450 }} />,
    );
    expect(
      screen.queryByRole('complementary', { name: /Boundary Box Ratio HUD/i }),
    ).toBeNull();

    // Enable boundary box but set isExporting = true
    store.setBoundaryBox(slideId, {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
    });
    store.setIsExporting(true);

    rerender(<BoundaryBoxHud stageSize={{ width: 800, height: 450 }} />);
    expect(
      screen.queryByRole('complementary', { name: /Boundary Box Ratio HUD/i }),
    ).toBeNull();
  });

  it('renders tilt controls and clicking preset buttons updates pitchTransform.tilt', () => {
    render(<BoundaryBoxHud stageSize={{ width: 800, height: 450 }} />);

    // Check that tilt controls are rendered
    expect(screen.getByRole('group', { name: 'Pitch Tilt Controls' })).toBeDefined();
    const btn0 = screen.getByRole('button', { name: 'Set pitch tilt to 0°' });
    const btn25 = screen.getByRole('button', { name: 'Set pitch tilt to 25°' });
    const btn45 = screen.getByRole('button', { name: 'Set pitch tilt to 45°' });
    const btn60 = screen.getByRole('button', { name: 'Set pitch tilt to 60°' });

    expect(btn0).toBeDefined();
    expect(btn25).toBeDefined();
    expect(btn45).toBeDefined();
    expect(btn60).toBeDefined();

    // Click 25°
    fireEvent.click(btn25);
    let state = useTacticalUnifiedStore.getState();
    let slide = state.project.slides.find((s) => s.id === state.activeSlideId);
    expect(slide?.pitchTransform?.tilt).toBe(25);

    // Click 45°
    fireEvent.click(btn45);
    state = useTacticalUnifiedStore.getState();
    slide = state.project.slides.find((s) => s.id === state.activeSlideId);
    expect(slide?.pitchTransform?.tilt).toBe(45);

    // Click 0°
    fireEvent.click(btn0);
    state = useTacticalUnifiedStore.getState();
    slide = state.project.slides.find((s) => s.id === state.activeSlideId);
    expect(slide?.pitchTransform?.tilt).toBe(0);
  });

  it('changing the tilt slider updates pitchTransform.tilt', () => {
    render(<BoundaryBoxHud stageSize={{ width: 800, height: 450 }} />);

    const slider = screen.getByRole('slider', { name: 'Pitch tilt slider' });
    expect(slider).toBeDefined();

    fireEvent.change(slider, { target: { value: '35' } });

    const state = useTacticalUnifiedStore.getState();
    const slide = state.project.slides.find((s) => s.id === state.activeSlideId);
    expect(slide?.pitchTransform?.tilt).toBe(35);
  });
});
