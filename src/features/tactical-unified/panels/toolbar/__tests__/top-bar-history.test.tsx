import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TopBarHistory } from '../top-bar-history';

describe('TopBarHistory', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('renders undo and redo buttons with IconButton accessibility attributes', () => {
    render(<TopBarHistory />);

    const undoButton = screen.getByRole('button', { name: 'Undo' });
    const redoButton = screen.getByRole('button', { name: 'Redo' });

    expect(undoButton).toBeDefined();
    expect(redoButton).toBeDefined();
    // initially cannot undo or redo
    expect((undoButton as HTMLButtonElement).disabled).toBe(true);
    expect((redoButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('calls undo and redo on click when enabled', () => {
    const undoSpy = vi.fn();
    const redoSpy = vi.fn();

    // Set store past and future to enable buttons
    useTacticalUnifiedStore.setState({
      past: [{ slides: [] }] as any,
      future: [{ slides: [] }] as any,
      undo: undoSpy,
      redo: redoSpy,
    });

    render(<TopBarHistory />);

    const undoButton = screen.getByRole('button', { name: 'Undo' });
    const redoButton = screen.getByRole('button', { name: 'Redo' });

    expect((undoButton as HTMLButtonElement).disabled).toBe(false);
    expect((redoButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(undoButton);
    expect(undoSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(redoButton);
    expect(redoSpy).toHaveBeenCalledTimes(1);
  });
});
