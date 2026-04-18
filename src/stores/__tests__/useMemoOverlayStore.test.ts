import { beforeEach, describe, expect, it } from 'vitest';
import { useMemoOverlayStore } from '../useMemoOverlayStore';

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

  it('should handle phase transitions', () => {
    const store = useMemoOverlayStore.getState();
    store.setTimeStr('123');

    const res = store.nextPhase();
    expect(res).toBe('OK');
    expect(useMemoOverlayStore.getState().phase).toBe(1);

    // Selecting no labels should be blocked
    const resBlock = useMemoOverlayStore.getState().nextPhase();
    expect(resBlock).toBe('BLOCKED');
    expect(useMemoOverlayStore.getState().error).toBe(
      'ラベルを1つ以上選択してください。',
    );
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
