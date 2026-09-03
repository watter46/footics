import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import { BoundaryBoxHud } from '../boundary-box-hud';

describe('BoundaryBoxHud component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('renders boundary box HUD with matched aspect ratio and snap buttons', () => {
    render(<BoundaryBoxHud stageSize={{ width: 800, height: 450 }} />);

    const hud = screen.getByRole('complementary', {
      name: /Boundary Box Ratio HUD/i,
    });
    expect(hud).toBeDefined();

    // Default 16:9 full boundary box matches 16:9
    expect(screen.getByText('16:9')).toBeDefined();

    // Has snap buttons for all 4 ratios
    expect(screen.getByRole('button', { name: 'Snap boundary to 16:9' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Snap boundary to 9:16' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Snap boundary to 4:5' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Snap boundary to 1:1' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Full fit boundary box' })).toBeDefined();
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
    expect(activeSlide?.boundaryBox?.height).toBe(100);
    expect(activeSlide?.boundaryBox?.width).toBe(45);
  });

  it('snaps boundary box to full canvas when fit button is clicked', () => {
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

    const fitBtn = screen.getByRole('button', { name: 'Full fit boundary box' });
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
});
