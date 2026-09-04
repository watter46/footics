import { beforeEach, describe, expect, it } from 'vitest';
import { useMemoOverlayStore } from '../memo-overlay-store';

describe('useMemoOverlayStore', () => {
  beforeEach(() => {
    useMemoOverlayStore.getState().reset('EVENT');
    useMemoOverlayStore.getState().setPeriod(1);
  });

  describe('initialization and reset', () => {
    it('should initialize with default state', () => {
      const state = useMemoOverlayStore.getState();
      expect(state.mode).toBe('EVENT');
      expect(state.phase).toBe(0);
      expect(state.timeStr).toBe('');
      expect(state.selectedLabels).toEqual([]);
      expect(state.labelInput).toBe('');
      expect(state.suggestionIndex).toBe(0);
      expect(state.isListMode).toBe(false);
      expect(state.memo).toBe('');
      expect(state.period).toBe(1);
      expect(state.error).toBeUndefined();
      expect(state.isSaving).toBe(false);
      expect(state.eventId).toBeUndefined();
      expect(state.isModalOpen).toBe(false);
    });

    it('should preserve period when resetting', () => {
      const store = useMemoOverlayStore.getState();
      store.setPeriod(2);
      store.setTimeStr('4500');
      store.setMemo('test memo');
      store.setModalOpen(true);

      store.reset();

      const state = useMemoOverlayStore.getState();
      expect(state.period).toBe(2);
      expect(state.timeStr).toBe('');
      expect(state.memo).toBe('');
      expect(state.isModalOpen).toBe(false);
    });

    it('should allow changing mode on reset', () => {
      const store = useMemoOverlayStore.getState();
      store.reset('MATCH');
      expect(useMemoOverlayStore.getState().mode).toBe('MATCH');
    });
  });

  describe('time input operations', () => {
    it('should set and update timeStr via setTimeStr, appendTimeDigit, and backspaceTimeStr', () => {
      const store = useMemoOverlayStore.getState();

      store.setTimeStr('12');
      expect(useMemoOverlayStore.getState().timeStr).toBe('12');

      store.appendTimeDigit('3');
      store.appendTimeDigit('4');
      store.appendTimeDigit('5');
      // Max 5 chars
      store.appendTimeDigit('6');
      expect(useMemoOverlayStore.getState().timeStr).toBe('12345');

      store.backspaceTimeStr();
      expect(useMemoOverlayStore.getState().timeStr).toBe('1234');
    });
  });

  describe('label and suggestion operations', () => {
    it('should handle setLabelInput, addLabel, removeLabel, and prevent duplicate labels', () => {
      const store = useMemoOverlayStore.getState();

      store.setLabelInput('パス');
      expect(useMemoOverlayStore.getState().labelInput).toBe('パス');

      store.addLabel('ショートパス');
      expect(useMemoOverlayStore.getState().selectedLabels).toEqual([
        'ショートパス',
      ]);
      expect(useMemoOverlayStore.getState().labelInput).toBe('');

      // Prevent duplicate
      store.addLabel('ショートパス');
      expect(useMemoOverlayStore.getState().selectedLabels).toEqual([
        'ショートパス',
      ]);

      store.addLabel('ロングパス');
      expect(useMemoOverlayStore.getState().selectedLabels).toEqual([
        'ショートパス',
        'ロングパス',
      ]);

      // Remove label by index
      store.removeLabel(0);
      expect(useMemoOverlayStore.getState().selectedLabels).toEqual([
        'ロングパス',
      ]);
    });

    it('should handle backspaceLabel when labelInput has text or is empty', () => {
      const store = useMemoOverlayStore.getState();

      // Case 1: labelInput is not empty
      store.setLabelInput('シュート');
      store.backspaceLabel();
      expect(useMemoOverlayStore.getState().labelInput).toBe('シュー');

      // Clear input and add selected labels
      store.setLabelInput('');
      store.addLabel('クロス');
      store.addLabel('ドリブル');

      // Case 2: labelInput is empty, should pop last label and restore it to labelInput
      store.backspaceLabel();
      expect(useMemoOverlayStore.getState().selectedLabels).toEqual(['クロス']);
      expect(useMemoOverlayStore.getState().labelInput).toBe('ドリブル');

      // Case 3: backspacing when labelInput is empty and no selectedLabels
      store.setLabelInput('');
      store.removeLabel(0);
      store.backspaceLabel();
      expect(useMemoOverlayStore.getState().selectedLabels).toEqual([]);
      expect(useMemoOverlayStore.getState().labelInput).toBe('');
    });

    it('should handle suggestion navigation and wrap around', () => {
      const store = useMemoOverlayStore.getState();
      store.setLabelInput('パス');

      // First navigate with direction 1 enters list mode
      store.navigateSuggestion(1);
      expect(useMemoOverlayStore.getState().isListMode).toBe(true);
      expect(useMemoOverlayStore.getState().suggestionIndex).toBe(0);

      // Navigate forward
      store.navigateSuggestion(1);
      const indexAfterForward = useMemoOverlayStore.getState().suggestionIndex;
      expect(indexAfterForward).toBeGreaterThanOrEqual(0);

      // Navigate backward
      store.navigateSuggestion(-1);
      expect(useMemoOverlayStore.getState().suggestionIndex).toBe(0);
    });

    it('should confirm suggestion via confirmSuggestion', () => {
      const store = useMemoOverlayStore.getState();
      store.setLabelInput('パス');
      store.navigateSuggestion(1);

      store.confirmSuggestion();
      expect(
        useMemoOverlayStore.getState().selectedLabels.length,
      ).toBeGreaterThan(0);
      expect(useMemoOverlayStore.getState().labelInput).toBe('');
    });
  });

  describe('phase transitions and validation', () => {
    it('should handle normal phase transitions (phase 0 -> 1 -> 2)', () => {
      const store = useMemoOverlayStore.getState();
      store.setTimeStr('123'); // 1分23秒

      const res0 = store.nextPhase();
      expect(res0).toBe('OK');
      expect(useMemoOverlayStore.getState().phase).toBe(1);

      const res1 = store.nextPhase();
      expect(res1).toBe('OK');
      expect(useMemoOverlayStore.getState().phase).toBe(2);

      // prevPhase
      store.prevPhase();
      expect(useMemoOverlayStore.getState().phase).toBe(1);

      store.prevPhase();
      expect(useMemoOverlayStore.getState().phase).toBe(0);

      // prevPhase at 0 stays at 0
      store.prevPhase();
      expect(useMemoOverlayStore.getState().phase).toBe(0);
    });

    it('should confirm suggestion on nextPhase if listMode or labelInput is active in phase 1', () => {
      const store = useMemoOverlayStore.getState();
      store.setTimeStr('123');
      store.nextPhase();
      expect(useMemoOverlayStore.getState().phase).toBe(1);

      store.setLabelInput('パス');
      const res = store.nextPhase();
      expect(res).toBe('OK');
      // When confirming suggestion during phase 1 nextPhase, phase stays 1 to allow adding more or proceeding
      expect(useMemoOverlayStore.getState().phase).toBe(1);
      expect(
        useMemoOverlayStore.getState().selectedLabels.length,
      ).toBeGreaterThan(0);
    });

    it('should block transition and set error on invalid timeStr in phase 0', () => {
      const store = useMemoOverlayStore.getState();
      store.setTimeStr(''); // Empty time string

      const res = store.nextPhase();
      expect(res).toBe('BLOCKED');
      expect(useMemoOverlayStore.getState().error).toBeDefined();
      expect(useMemoOverlayStore.getState().phase).toBe(0);
    });

    it('should force set phase via forceSetPhase', () => {
      const store = useMemoOverlayStore.getState();
      store.forceSetPhase(2);
      expect(useMemoOverlayStore.getState().phase).toBe(2);
      expect(useMemoOverlayStore.getState().error).toBeUndefined();
    });

    it('should always return OK on nextPhase in MATCH mode', () => {
      const store = useMemoOverlayStore.getState();
      store.reset('MATCH');
      const res = store.nextPhase();
      expect(res).toBe('OK');
    });
  });

  describe('filterByCategory', () => {
    it('should append number in phase 0 and set labelInput in phase 1', () => {
      const store = useMemoOverlayStore.getState();

      // Phase 0: categoryIndex 0 -> append '1'
      store.filterByCategory(0);
      expect(useMemoOverlayStore.getState().timeStr).toBe('1');

      store.filterByCategory(2);
      expect(useMemoOverlayStore.getState().timeStr).toBe('13');

      // Move to phase 1
      store.forceSetPhase(1);

      // Phase 1: categoryIndex 0 -> '攻撃'
      store.filterByCategory(0);
      expect(useMemoOverlayStore.getState().labelInput).toBe('攻撃');

      // Phase 1: categoryIndex 1 -> '守備'
      store.filterByCategory(1);
      expect(useMemoOverlayStore.getState().labelInput).toBe('守備');
    });
  });

  describe('other state setters', () => {
    it('should update memo, error, isSaving, eventId, modalOpen, and selectedLabels', () => {
      const store = useMemoOverlayStore.getState();

      store.setMemo('Tactical observation');
      expect(useMemoOverlayStore.getState().memo).toBe('Tactical observation');

      store.setError('Custom error');
      expect(useMemoOverlayStore.getState().error).toBe('Custom error');

      store.setIsSaving(true);
      expect(useMemoOverlayStore.getState().isSaving).toBe(true);

      store.setEventId('evt-999');
      expect(useMemoOverlayStore.getState().eventId).toBe('evt-999');

      store.setModalOpen(true);
      expect(useMemoOverlayStore.getState().isModalOpen).toBe(true);

      store.setSelectedLabels(['Tag1', 'Tag2']);
      expect(useMemoOverlayStore.getState().selectedLabels).toEqual([
        'Tag1',
        'Tag2',
      ]);
    });
  });
});
