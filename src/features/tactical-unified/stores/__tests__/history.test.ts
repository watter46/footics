import { beforeEach, describe, expect, it } from 'vitest';
import { selectCanRedo, selectCanUndo } from '../tactical-unified-selectors';
import { useTacticalUnifiedStore } from '../tactical-unified-store';

describe('Zundo Undo/Redo & History Integration', () => {
  beforeEach(() => {
    // ストアリセット
    useTacticalUnifiedStore.setState({
      past: [],
      future: [],
      selectedObjects: [],
      isDirty: false,
    });
    // temporal が存在する場合はクリア
    if ('temporal' in useTacticalUnifiedStore) {
      useTacticalUnifiedStore.temporal.getState().clear();
    }
  });

  it('provides working temporal undo and redo with compatibility selectors', () => {
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    expect(selectCanUndo(useTacticalUnifiedStore.getState())).toBe(false);
    expect(selectCanRedo(useTacticalUnifiedStore.getState())).toBe(false);

    // 矢印を追加して履歴を更新
    store.addArrow(slideId, {
      id: 'arrow-test-1',
      annotationType: 'arrow',
      arrowType: 'pass',
      curveType: 'straight',
      points: [
        { x: 10, y: 10 },
        { x: 20, y: 20 },
      ],
      color: '#ff0000',
      strokeWidth: 2,
      dashArray: [],
      arrowHead: true,
    });

    const stateAfterAdd = useTacticalUnifiedStore.getState();
    const slideAfterAdd = stateAfterAdd.project.slides.find(
      (s) => s.id === slideId,
    );
    expect(slideAfterAdd?.arrows).toHaveLength(1);
    expect(selectCanUndo(stateAfterAdd)).toBe(true);
    expect(selectCanRedo(stateAfterAdd)).toBe(false);

    // undo
    useTacticalUnifiedStore.getState().undo();
    const stateAfterUndo = useTacticalUnifiedStore.getState();
    const slideAfterUndo = stateAfterUndo.project.slides.find(
      (s) => s.id === slideId,
    );
    expect(slideAfterUndo?.arrows).toHaveLength(0);
    expect(selectCanUndo(stateAfterUndo)).toBe(false);
    expect(selectCanRedo(stateAfterUndo)).toBe(true);

    // redo
    useTacticalUnifiedStore.getState().redo();
    const stateAfterRedo = useTacticalUnifiedStore.getState();
    const slideAfterRedo = stateAfterRedo.project.slides.find(
      (s) => s.id === slideId,
    );
    expect(slideAfterRedo?.arrows).toHaveLength(1);
    expect(selectCanUndo(stateAfterRedo)).toBe(true);
    expect(selectCanRedo(stateAfterRedo)).toBe(false);
  });

  it('exposes temporal store from zundo middleware', () => {
    expect('temporal' in useTacticalUnifiedStore).toBe(true);
    const temporalStore = useTacticalUnifiedStore.temporal;
    expect(temporalStore).toBeDefined();
    expect(typeof temporalStore.getState().undo).toBe('function');
    expect(typeof temporalStore.getState().redo).toBe('function');
  });
});
