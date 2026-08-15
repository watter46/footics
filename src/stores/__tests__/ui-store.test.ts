import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from '../ui-store';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      isTacticalBoardOpen: false,
      highlightEventId: null,
    });
  });

  it('initializes with default values', () => {
    const state = useUIStore.getState();
    expect(state.isTacticalBoardOpen).toBe(false);
    expect(state.highlightEventId).toBeNull();
  });

  it('updates isTacticalBoardOpen via setTacticalBoardOpen with boolean and updater function', () => {
    const { setTacticalBoardOpen } = useUIStore.getState();

    setTacticalBoardOpen(true);
    expect(useUIStore.getState().isTacticalBoardOpen).toBe(true);

    setTacticalBoardOpen((prev) => !prev);
    expect(useUIStore.getState().isTacticalBoardOpen).toBe(false);

    setTacticalBoardOpen((prev) => !prev);
    expect(useUIStore.getState().isTacticalBoardOpen).toBe(true);
  });

  it('toggles tactical board state via toggleTacticalBoard', () => {
    const { toggleTacticalBoard } = useUIStore.getState();

    expect(useUIStore.getState().isTacticalBoardOpen).toBe(false);

    toggleTacticalBoard();
    expect(useUIStore.getState().isTacticalBoardOpen).toBe(true);

    toggleTacticalBoard();
    expect(useUIStore.getState().isTacticalBoardOpen).toBe(false);
  });

  it('updates highlightEventId via setHighlightEventId', () => {
    const { setHighlightEventId } = useUIStore.getState();

    setHighlightEventId('event-123');
    expect(useUIStore.getState().highlightEventId).toBe('event-123');

    setHighlightEventId(null);
    expect(useUIStore.getState().highlightEventId).toBeNull();
  });
});
