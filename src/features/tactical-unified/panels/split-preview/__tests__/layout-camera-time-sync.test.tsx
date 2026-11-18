import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TacticalSplitPreviewPanel } from '@/features/tactical-unified/panels/split-preview/tactical-split-preview-panel';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import * as frameRenderer from '@/lib/tactical/export/tactical-phase-frame-renderer';
import { toMilliseconds } from '@/lib/types/tactical';

function createTestProject(): Parameters<typeof createDocumentStore>[0] {
  return {
    id: 'project-1',
    name: 'Test Project',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    activePhaseId: 'phase-1',
    phases: [
      {
        id: 'phase-1',
        name: 'Phase 1',
        aspectRatio: '16:9',
        slides: [
          {
            id: 'slide-1',
            name: 'Slide 1',
            players: [],
            arrows: [],
            zones: [],
            texts: [],
            ball: { x: 0.5, y: 0.5, locked: false },
            balls: [],
            drawings: [],
            annotations: [],
            regions: [],
            transitionDurationMs: 1000,
            pauseMs: 500,
          },
          {
            id: 'slide-2',
            name: 'Slide 2',
            players: [],
            arrows: [],
            zones: [],
            texts: [],
            ball: { x: 0.5, y: 0.5, locked: false },
            balls: [],
            drawings: [],
            annotations: [],
            regions: [],
            transitionDurationMs: 1000,
            pauseMs: 500,
          },
        ],
      },
    ],
  } as unknown as Parameters<typeof createDocumentStore>[0];
}

function renderWithStores(initialTimeMs: number) {
  const project = createTestProject();
  const documentStore = createDocumentStore(project);
  const sessionStore = createSessionStore({
    activePhaseId: 'phase-1',
    activeSlideId: 'slide-2',
  } as unknown as Parameters<typeof createSessionStore>[0]);
  const playbackStore = createPlaybackStore(toMilliseconds(initialTimeMs));

  const utils = render(
    <TacticalStoreProvider
      stores={{
        documentStore,
        sessionStore,
        playbackStore,
      }}
    >
      <TacticalSplitPreviewPanel />
    </TacticalStoreProvider>,
  );

  return { ...utils, documentStore, playbackStore };
}

describe('TacticalSplitPreviewPanel layout camera time sync', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('maintains playbackTimeMs=1500 and reflects new globalKeyframe angles after Orbit drag', () => {
    const renderSpy = vi
      .spyOn(frameRenderer, 'renderTacticalPhaseFrameToCanvas')
      .mockImplementation(() => {});

    const { container } = renderWithStores(1500);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();

    fireEvent.pointerDown(canvas!, {
      button: 0,
      clientX: 100,
      clientY: 150,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas!, {
      clientX: 150,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas!, {
      button: 0,
      clientX: 150,
      clientY: 100,
      pointerId: 1,
    });

    const lastCall = renderSpy.mock.calls.at(-1)?.[0];
    expect(lastCall).toBeDefined();
    expect(lastCall?.timeMs).toBe(1500);
    const keyframeAt1500 = lastCall?.directorCamera?.globalKeyframes?.find(
      (kf) => kf.timeMs === 1500,
    );
    expect(keyframeAt1500).toBeDefined();
    expect(keyframeAt1500?.tilt).not.toBe(0);
  });

  it('maintains playbackTimeMs=1500 and reflects updated panX/panY/zoom in actionCues after Shift+drag Pan and Wheel Zoom', () => {
    const renderSpy = vi
      .spyOn(frameRenderer, 'renderTacticalPhaseFrameToCanvas')
      .mockImplementation(() => {});

    const { container } = renderWithStores(1500);
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();

    fireEvent.pointerDown(canvas!, {
      button: 0,
      shiftKey: true,
      clientX: 100,
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(canvas!, {
      shiftKey: true,
      clientX: 160,
      clientY: 140,
      pointerId: 1,
    });
    fireEvent.pointerUp(canvas!, {
      button: 0,
      shiftKey: true,
      clientX: 160,
      clientY: 140,
      pointerId: 1,
    });

    const afterPanCall = renderSpy.mock.calls.at(-1)?.[0];
    expect(afterPanCall?.timeMs).toBe(1500);
    const panCue = afterPanCall?.directorCamera?.actionCues?.find(
      (c) => c.startTimeMs === 1500,
    );
    expect(panCue).toBeDefined();
    expect(panCue?.panX).not.toBe(0);

    fireEvent.wheel(canvas!, { deltaY: -120 });

    const afterZoomCall = renderSpy.mock.calls.at(-1)?.[0];
    expect(afterZoomCall?.timeMs).toBe(1500);
    const zoomCue = afterZoomCall?.directorCamera?.actionCues?.find(
      (c) => c.startTimeMs === 1500,
    );
    expect(zoomCue).toBeDefined();
    expect(zoomCue?.zoom).toBeGreaterThan(1);
  });
});
