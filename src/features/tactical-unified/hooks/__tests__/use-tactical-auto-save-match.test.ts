import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { db } from '@/lib/db/schema';
import {
  getTacticalProjectStorageKey,
  loadActiveProjectFromDb,
  saveActiveProjectToDb,
} from '@/lib/tactical/tactical-storage';
import type { DomainTacticalProject } from '@/lib/types/tactical/domain-hierarchy';
import { useTacticalAutoSave } from '../use-tactical-auto-save';

function projectFor(matchId: string, title: string): DomainTacticalProject {
  return {
    ...createDefaultTacticalProject(),
    id: `proj-${matchId}`,
    matchId,
    title,
  };
}

function createAutoSaveHarness(initialProject?: DomainTacticalProject) {
  const project = initialProject ?? createDefaultTacticalProject();
  const phaseId = project.phases[0]?.id ?? '';
  const slideId = project.phases[0]?.slides[0]?.id ?? '';
  const documentStore = createDocumentStore(project);
  const sessionStore = createSessionStore({
    activePhaseId: phaseId,
    activeSlideId: slideId,
  });
  const playbackStore = createPlaybackStore();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      TacticalStoreProvider,
      { stores: { documentStore, sessionStore, playbackStore } },
      children,
    );
  return { documentStore, sessionStore, playbackStore, wrapper };
}

describe('useTacticalAutoSave (試合別)', () => {
  beforeEach(async () => {
    await db.keyval.delete(getTacticalProjectStorageKey('m1'));
    await db.keyval.delete(getTacticalProjectStorageKey('m2'));
  });

  it('matchId ごとに復元され、保存のない試合は前試合を引き継がない', async () => {
    await saveActiveProjectToDb(projectFor('m1', 'Match One'), 'm1');
    const { documentStore, wrapper } = createAutoSaveHarness();

    const { rerender } = renderHook(
      ({ matchId }) => useTacticalAutoSave({ matchId }),
      { initialProps: { matchId: 'm1' }, wrapper },
    );
    await waitFor(() => {
      expect(documentStore.getState().project.title).toBe('Match One');
    });

    rerender({ matchId: 'm2' });
    await waitFor(() => {
      const p = documentStore.getState().project;
      expect(p.title).not.toBe('Match One');
      expect(p.matchId).not.toBe('m1');
    });
  });

  it('変更は matchId 専用キーに保存される', async () => {
    const { documentStore, wrapper } = createAutoSaveHarness(
      projectFor('m2', 'Two'),
    );
    renderHook(
      () => useTacticalAutoSave({ matchId: 'm2', skipRestore: true }),
      {
        wrapper,
      },
    );

    act(() => {
      documentStore.getState().dispatch({
        type: 'UPDATE_PROJECT_META',
        patch: { title: 'Two Edited' },
      });
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

  it('matchId なし（単独用）マウント時にストア内に matchId が残っていれば新規プロジェクトで初期化される', async () => {
    const { documentStore, wrapper } = createAutoSaveHarness(
      projectFor('m1', 'Match Remnant'),
    );
    expect(documentStore.getState().project.matchId).toBe('m1');

    renderHook(() => useTacticalAutoSave({ matchId: null }), { wrapper });

    await waitFor(() => {
      const p = documentStore.getState().project;
      expect(p.matchId).toBeUndefined();
      expect(p.title).not.toBe('Match Remnant');
    });
  });

  it('pointerdown 中は isDirty でも saving を発火せず、pointerup 後に saving -> saved へ遷移する', async () => {
    const { documentStore, sessionStore, wrapper } = createAutoSaveHarness(
      projectFor('m1', 'One'),
    );
    renderHook(
      () => useTacticalAutoSave({ matchId: 'm1', skipRestore: true }),
      {
        wrapper,
      },
    );

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerdown'));
    });

    act(() => {
      documentStore.getState().dispatch({
        type: 'UPDATE_PROJECT_META',
        patch: { title: 'One During Drag' },
      });
    });

    expect(sessionStore.getState().saveStatus).not.toBe('saving');

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup'));
    });

    await waitFor(
      async () => {
        expect((await loadActiveProjectFromDb('m1'))?.title).toBe(
          'One During Drag',
        );
        expect(sessionStore.getState().saveStatus).toBe('saved');
      },
      { timeout: 3000 },
    );
  });
});
