import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveBoundaryBox } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { XMediaPresetMenu } from '../x-media-preset-menu';

function renderPresetMenu() {
  const project = createDefaultTacticalProject();
  const p0 = project.phases[0]!;
  const documentStore = createDocumentStore(project);
  documentStore.getState().dispatch({
    type: 'CHANGE_PHASE_ASPECT_RATIO',
    phaseId: p0.id,
    aspectRatio: '16:9',
  });
  const stores = {
    documentStore,
    sessionStore: createSessionStore({
      activePhaseId: p0.id,
      activeSlideId: p0.slides[0]?.id ?? '',
    }),
    playbackStore: createPlaybackStore(),
  };
  return {
    stores,
    ...render(
      <TacticalStoreProvider stores={stores}>
        <XMediaPresetMenu />
      </TacticalStoreProvider>,
    ),
  };
}

describe('XMediaPresetMenu rendering and toggle', () => {
  it('renders trigger button and toggles menu on click', () => {
    renderPresetMenu();

    const triggerBtn = screen.getByRole('button', {
      name: /Xメディア最適化比率メニュー/i,
    });
    expect(triggerBtn).toBeDefined();
    expect(screen.queryByRole('dialog')).toBeNull();

    // Open menu
    fireEvent.click(triggerBtn);
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('X メディア最適化比率')).toBeDefined();

    // Close menu on toggle
    fireEvent.click(triggerBtn);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('displays all 4 primary X presets and pitch fit reset option', () => {
    renderPresetMenu();

    const triggerBtn = screen.getByRole('button', {
      name: /Xメディア最適化比率メニュー/i,
    });
    fireEvent.click(triggerBtn);

    expect(screen.getByText(/画像1枚 \(4:5\)/i)).toBeDefined();
    expect(screen.getByText(/画像2枚カルーセル \(9:16\)/i)).toBeDefined();
    expect(screen.getByText(/動画1本 \(9:16\)/i)).toBeDefined();
    expect(screen.getByText(/ピッチ全体横画像 \(16:9\)/i)).toBeDefined();
    expect(screen.getByText(/ピッチ白線フィット/i)).toBeDefined();
  });

  it('closes menu when Escape key is pressed', () => {
    renderPresetMenu();

    const triggerBtn = screen.getByRole('button', {
      name: /Xメディア最適化比率メニュー/i,
    });
    fireEvent.click(triggerBtn);
    expect(screen.getByRole('dialog')).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('XMediaPresetMenu preset selection actions', () => {
  it('applies 4:5 preset when clicked and updates phase boundaryBox', () => {
    const { stores } = renderPresetMenu();

    const triggerBtn = screen.getByRole('button', {
      name: /Xメディア最適化比率メニュー/i,
    });
    fireEvent.click(triggerBtn);

    fireEvent.click(screen.getByText(/画像1枚 \(4:5\)/i));
    expect(screen.queryByRole('dialog')).toBeNull();

    const activePhaseId = stores.sessionStore.getState().activePhaseId;
    const box = selectDomainActiveBoundaryBox(
      stores.documentStore.getState().project,
      activePhaseId,
    );
    expect(box.enabled).toBe(true);
    expect(box.height).toBe(100);
    expect(box.width).toBe(45);
  });

  it('applies 9:16 preset and pitch fit reset option', () => {
    const { stores } = renderPresetMenu();

    const triggerBtn = screen.getByRole('button', {
      name: /Xメディア最適化比率メニュー/i,
    });
    fireEvent.click(triggerBtn);
    fireEvent.click(screen.getByText(/画像2枚カルーセル \(9:16\)/i));

    const activePhaseId = stores.sessionStore.getState().activePhaseId;
    let box = selectDomainActiveBoundaryBox(
      stores.documentStore.getState().project,
      activePhaseId,
    );
    expect(box.width).toBe(31.64);

    fireEvent.click(triggerBtn);
    fireEvent.click(screen.getByText(/ピッチ白線フィット/i));

    box = selectDomainActiveBoundaryBox(
      stores.documentStore.getState().project,
      activePhaseId,
    );
    expect(box.x).toBe(0);
    expect(box.y).toBe(0);
    expect(box.width).toBe(100);
    expect(box.height).toBe(100);
  });
});
