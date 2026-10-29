import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PITCH_APPEARANCE } from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '../tactical-unified-store';

describe('tactical-unified-store - pitch appearance & right panel tabs', () => {
  beforeEach(() => {
    const store = useTacticalUnifiedStore.getState();
    store.resetProject();
    useTacticalUnifiedStore.setState({
      selectedObjects: [],
      clipboard: null,
      past: [],
      future: [],
    });
  });

  describe('pitch appearance state', () => {
    it('初期状態の pitchAppearance が DEFAULT_PITCH_APPEARANCE と一致する', () => {
      const { project } = useTacticalUnifiedStore.getState();
      expect(project.pitchAppearance).toEqual(DEFAULT_PITCH_APPEARANCE);
    });

    it('updatePitchAppearance で部分更新され、isDirty が true になり、履歴が記録される', () => {
      const store = useTacticalUnifiedStore.getState();
      expect(store.isDirty).toBe(false);
      expect(store.past).toHaveLength(0);

      store.updatePitchAppearance({
        pitchBackgroundType: 'marble',
        overlayColor: '#123456',
        overlayOpacity: 0.8,
        lineWidth: 3.5,
      });

      const updated = useTacticalUnifiedStore.getState();
      expect(updated.project.pitchAppearance).toEqual({
        pitchBackgroundType: 'marble',
        overlayColor: '#123456',
        overlayOpacity: 0.8,
        lineColor: '#ffffff',
        lineWidth: 3.5,
        lineOpacity: 1.0,
      });
      expect(updated.isDirty).toBe(true);
      expect(updated.past.length).toBeGreaterThan(0);
    });

    it('updatePitchAppearance で DEFAULT_PITCH_APPEARANCE を指定して既定値に復元できる', () => {
      const store = useTacticalUnifiedStore.getState();
      store.updatePitchAppearance({
        pitchBackgroundType: 'marble',
        lineWidth: 5.0,
      });

      store.updatePitchAppearance(DEFAULT_PITCH_APPEARANCE);

      const updated = useTacticalUnifiedStore.getState();
      expect(updated.project.pitchAppearance).toEqual(DEFAULT_PITCH_APPEARANCE);
    });
  });

  describe('rightPanelTab pitch switching', () => {
    it('rightPanelTab に pitch を設定でき、inspectorOpen が true になる', () => {
      const store = useTacticalUnifiedStore.getState();
      expect(store.panels.rightPanelTab).toBe('formation');

      store.setRightPanelTab('pitch');

      const updated = useTacticalUnifiedStore.getState();
      expect(updated.panels.rightPanelTab).toBe('pitch');
      expect(updated.panels.inspectorOpen).toBe(true);
    });

    it('formation, squad, pitch 間でタブを相互に切り替えられる', () => {
      const store = useTacticalUnifiedStore.getState();

      store.setRightPanelTab('squad');
      expect(useTacticalUnifiedStore.getState().panels.rightPanelTab).toBe(
        'squad',
      );

      store.setRightPanelTab('pitch');
      expect(useTacticalUnifiedStore.getState().panels.rightPanelTab).toBe(
        'pitch',
      );

      store.setRightPanelTab('formation');
      expect(useTacticalUnifiedStore.getState().panels.rightPanelTab).toBe(
        'formation',
      );
    });
  });
});
