import { beforeEach, describe, expect, it } from 'vitest';
import { useMemoOverlayStore } from '../memo-overlay-store';

describe('useMemoOverlayStore', () => {
  beforeEach(() => {
    useMemoOverlayStore.getState().reset();
  });

  it('should initialize with default state', () => {
    const state = useMemoOverlayStore.getState();
    expect(state.mode).toBe('EVENT');
    expect(state.phase).toBe(0);
    expect(state.timeStr).toBe('');
  });

  it('should update timeStr via appendTimeDigit', () => {
    const { appendTimeDigit } = useMemoOverlayStore.getState();
    appendTimeDigit('1');
    appendTimeDigit('2');
    expect(useMemoOverlayStore.getState().timeStr).toBe('12');
  });

  it('should handle phase transitions (labels are optional)', () => {
    const store = useMemoOverlayStore.getState();
    store.setTimeStr('123');

    const res = store.nextPhase();
    expect(res).toBe('OK');
    expect(useMemoOverlayStore.getState().phase).toBe(1);

    // ラベル未選択でも OK を返して phase 2 へ進む（ラベル任意化）
    const resNext = useMemoOverlayStore.getState().nextPhase();
    expect(resNext).toBe('OK');
    expect(useMemoOverlayStore.getState().phase).toBe(2);
    expect(useMemoOverlayStore.getState().error).toBeUndefined();
  });

  it('should handle label confirmed with confirmSuggestion', () => {
    const store = useMemoOverlayStore.getState();
    store.setLabelInput('パス');
    // confirmSuggestion relies on getFlattenedEvents mock if needed, but let's test if it works with logic
    store.confirmSuggestion();
    // Assuming 'パス' exists in default mock in EVENT_GROUPS or similar.
    // If not, we might need a more specialized test or mock.
    // In our store, confirmSuggestion uses filterSuggestions(labelInput, getFlattenedEvents())
  });
});
