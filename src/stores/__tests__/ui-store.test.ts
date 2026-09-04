import { beforeEach, describe, expect, it } from 'vitest';
import { useUIStore } from '../ui-store';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      highlightEventId: null,
    });
  });

  it('initializes with default values', () => {
    const state = useUIStore.getState();
    expect(state.highlightEventId).toBeNull();
  });

  it('updates highlightEventId via setHighlightEventId', () => {
    const { setHighlightEventId } = useUIStore.getState();

    setHighlightEventId('event-123');
    expect(useUIStore.getState().highlightEventId).toBe('event-123');

    setHighlightEventId(null);
    expect(useUIStore.getState().highlightEventId).toBeNull();
  });
});
