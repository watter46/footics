import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TopBarCenter } from '../top-bar-center';

describe('TopBarCenter aspect ratio selector', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().setAspectRatio('16:9');
  });

  it('renders all 4 aspect ratio tabs (16:9, 9:16, 4:5, 1:1)', () => {
    render(<TopBarCenter />);

    const ratioGroup = screen.getByRole('group', {
      name: /Aspect Ratio Selector/i,
    });
    expect(ratioGroup).toBeDefined();

    expect(
      screen.getByRole('button', { name: 'Aspect ratio 16:9' }),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Aspect ratio 9:16' }),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Aspect ratio 4:5' }),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'Aspect ratio 1:1' }),
    ).toBeDefined();
  });

  it('defaults to 16:9 as active and allows switching to 9:16, 4:5, 1:1', () => {
    render(<TopBarCenter />);

    const btn169 = screen.getByRole('button', { name: 'Aspect ratio 16:9' });
    const btn916 = screen.getByRole('button', { name: 'Aspect ratio 9:16' });
    const btn45 = screen.getByRole('button', { name: 'Aspect ratio 4:5' });
    const btn11 = screen.getByRole('button', { name: 'Aspect ratio 1:1' });

    expect(btn169.getAttribute('aria-pressed')).toBe('true');
    expect(btn916.getAttribute('aria-pressed')).toBe('false');

    // Switch to 9:16
    fireEvent.click(btn916);
    expect(useTacticalUnifiedStore.getState().project.aspectRatio).toBe('9:16');
    expect(btn916.getAttribute('aria-pressed')).toBe('true');
    expect(btn169.getAttribute('aria-pressed')).toBe('false');

    // Switch to 4:5
    fireEvent.click(btn45);
    expect(useTacticalUnifiedStore.getState().project.aspectRatio).toBe('4:5');
    expect(btn45.getAttribute('aria-pressed')).toBe('true');

    // Switch to 1:1
    fireEvent.click(btn11);
    expect(useTacticalUnifiedStore.getState().project.aspectRatio).toBe('1:1');
    expect(btn11.getAttribute('aria-pressed')).toBe('true');
  });

  it('allows toggling team visibility', () => {
    render(<TopBarCenter />);

    const homeBtn = screen.getByTitle('Show Home team only');
    fireEvent.click(homeBtn);
    expect(useTacticalUnifiedStore.getState().teamVisibility).toBe('home');

    const awayBtn = screen.getByTitle('Show Away team only');
    fireEvent.click(awayBtn);
    expect(useTacticalUnifiedStore.getState().teamVisibility).toBe('away');

    const bothBtn = screen.getByTitle('Show both teams');
    fireEvent.click(bothBtn);
    expect(useTacticalUnifiedStore.getState().teamVisibility).toBe('both');
  });
});
