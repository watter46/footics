import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { DrawingToolbar } from '../drawing-toolbar';

describe('DrawingToolbar component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('renders toolbar positioned on the right for 16:9 aspect ratio', () => {
    useTacticalUnifiedStore.getState().setAspectRatio('16:9');
    const { container } = render(<DrawingToolbar />);

    const toolbarEl = container.firstElementChild as HTMLElement;
    expect(toolbarEl).toBeDefined();
    expect(toolbarEl.className).toContain('right-3');
    expect(toolbarEl.className).toContain('top-1/2');
    expect(toolbarEl.className).toContain('flex-col');
  });

  it('renders toolbar positioned on the right for non-16:9 aspect ratio (e.g. 4:5)', () => {
    useTacticalUnifiedStore.getState().setAspectRatio('4:5');
    const { container } = render(<DrawingToolbar />);

    const toolbarEl = container.firstElementChild as HTMLElement;
    expect(toolbarEl).toBeDefined();
    expect(toolbarEl.className).toContain('right-3');
    expect(toolbarEl.className).toContain('top-1/2');
    expect(toolbarEl.className).toContain('flex-col');
  });

  it('renders drawing tool buttons and action toggles', () => {
    render(<DrawingToolbar />);

    expect(screen.getByRole('button', { name: 'Select (V)' })).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Continuous Draw Lock' }),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Eraser Mode' })).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Reset all slide objects' }),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Pitch Lock' })).toBeDefined();
  });
});
