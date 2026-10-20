import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { db } from '@/lib/db/schema';
import {
  getTacticalProjectStorageKey,
  loadActiveProjectFromDb,
  saveActiveProjectToDb,
} from '@/lib/tactical/tactical-storage';
import { createDefaultProject } from '@/lib/types/tactical-unified';
import { useTacticalAutoSave } from '../use-tactical-auto-save';

function projectFor(matchId: string, title: string) {
  const p = createDefaultProject(`proj-${matchId}`);
  p.matchId = matchId;
  p.title = title;
  return p;
}

describe('useTacticalAutoSave (試合別)', () => {
  beforeEach(async () => {
    await db.keyval.delete(getTacticalProjectStorageKey('m1'));
    await db.keyval.delete(getTacticalProjectStorageKey('m2'));
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('matchId ごとに復元され、保存のない試合は前試合を引き継がない', async () => {
    await saveActiveProjectToDb(projectFor('m1', 'Match One'), 'm1');

    const { rerender } = renderHook(
      ({ matchId }) => useTacticalAutoSave({ matchId }),
      { initialProps: { matchId: 'm1' } },
    );
    await waitFor(() => {
      expect(useTacticalUnifiedStore.getState().project.title).toBe(
        'Match One',
      );
    });

    rerender({ matchId: 'm2' });
    await waitFor(() => {
      const p = useTacticalUnifiedStore.getState().project;
      expect(p.title).not.toBe('Match One');
      expect(p.matchId).not.toBe('m1');
    });
  });

  it('変更は matchId 専用キーに保存される', async () => {
    useTacticalUnifiedStore.getState().loadProject(projectFor('m2', 'Two'));
    renderHook(() => useTacticalAutoSave({ matchId: 'm2', skipRestore: true }));

    act(() => {
      useTacticalUnifiedStore.setState((s) => ({
        project: { ...s.project, title: 'Two Edited' },
        isDirty: true,
      }));
    });

    await waitFor(
      async () => {
        expect((await loadActiveProjectFromDb('m2'))?.title).toBe('Two Edited');
      },
      { timeout: 3000 },
    );
    expect(await loadActiveProjectFromDb('m1')).toBeNull();
    expect(await loadActiveProjectFromDb()).toBeNull();
  });
});
