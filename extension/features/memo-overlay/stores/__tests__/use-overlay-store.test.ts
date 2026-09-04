import { beforeEach, describe, expect, it } from 'vitest';
import { useOverlayStore } from '../use-overlay-store';

describe('useOverlayStore (displayMode & mini mode)', () => {
  beforeEach(() => {
    useOverlayStore.setState({
      isVisible: false,
      displayMode: 'full',
      mode: 'MATCH',
      matchId: undefined,
      initialData: undefined,
      initialError: undefined,
    });
  });

  it('defaults to displayMode full', () => {
    const state = useOverlayStore.getState();
    expect(state.displayMode).toBe('full');
    expect(state.isVisible).toBe(false);
  });

  it('toggles displayMode between full and mini', () => {
    useOverlayStore.getState().toggleDisplayMode();
    expect(useOverlayStore.getState().displayMode).toBe('mini');

    useOverlayStore.getState().toggleDisplayMode();
    expect(useOverlayStore.getState().displayMode).toBe('full');
  });

  it('explicitly sets displayMode', () => {
    useOverlayStore.getState().setDisplayMode('mini');
    expect(useOverlayStore.getState().displayMode).toBe('mini');

    useOverlayStore.getState().setDisplayMode('full');
    expect(useOverlayStore.getState().displayMode).toBe('full');
  });

  it('preserves or overrides displayMode when open is called', () => {
    useOverlayStore.getState().setDisplayMode('mini');
    useOverlayStore.getState().open({ mode: 'MATCH' });
    expect(useOverlayStore.getState().isVisible).toBe(true);
    expect(useOverlayStore.getState().displayMode).toBe('mini');

    useOverlayStore.getState().open({ mode: 'EVENT', displayMode: 'full' });
    expect(useOverlayStore.getState().displayMode).toBe('full');
  });
});
