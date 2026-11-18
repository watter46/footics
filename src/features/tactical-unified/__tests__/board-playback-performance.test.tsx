import { act, render, renderHook, screen } from '@testing-library/react';
import React, { Profiler, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useTacticalAnimation } from '@/features/tactical-unified/hooks/use-tactical-animation';
import { CameraControlPanel } from '@/features/tactical-unified/panels/right-panel/camera-control-panel';
import { TacticalSplitPreviewPanel } from '@/features/tactical-unified/panels/split-preview/tactical-split-preview-panel';
import { DirectorCameraTimeline } from '@/features/tactical-unified/panels/timeline/director-camera-timeline';
import { PlaybackControls } from '@/features/tactical-unified/panels/timeline/playback-controls';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';

function createTestProject(): DomainTacticalProject {
  const slide1: DomainSlide = {
    id: 'slide-1',
    index: 0,
    label: 'Slide 1',
    players: [
      {
        id: 'p1',
        shirtNo: '10',
        name: 'Player 1',
        position: 'FW',
        area: 'pitch',
        team: 'home',
        x: clampToScreenNorm(10),
        y: clampToScreenNorm(10),
        style: {
          markerType: 'circle',
          insideContent: 'number',
          bottomLabel: 'name',
          color: '#034694',
          strokeColor: '#ffffff',
          strokeWidth: 2,
          sizeScale: 1.0,
          numberSizeScale: 1.0,
          labelSizeScale: 1.0,
        },
        connectLines: [],
        badges: [],
      },
    ],
    arrows: [],
    zones: [],
    texts: [],
    ball: {
      x: clampToScreenNorm(10),
      y: clampToScreenNorm(10),
      visible: true,
    },
    transitionDurationMs: 1000,
    pauseMs: 500,
    easing: 'linear',
  };

  const slide2: DomainSlide = {
    ...slide1,
    id: 'slide-2',
    index: 1,
    label: 'Slide 2',
    players: [
      {
        ...slide1.players[0],
        x: clampToScreenNorm(50),
        y: clampToScreenNorm(50),
      },
    ],
  };

  const phase: DomainTacticalPhase = {
    id: 'phase-1',
    name: 'Phase 1',
    aspectRatio: '16:9',
    boundaryBox: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    },
    backgroundType: 'pitch',
    slides: [slide1, slide2],
  };

  return {
    id: 'test-project',
    version: '3.0.0',
    title: 'Test Project',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    homeColor: { primary: '#034694' },
    awayColor: { primary: '#ef4444' },
    pitchAppearance: {
      pitchBackgroundType: 'solid',
      overlayColor: '#0B303E',
      overlayOpacity: 1.0,
      lineColor: '#ffffff',
      lineWidth: 2.5,
      lineOpacity: 1.0,
    },
    screenBackground: { type: 'cinematic' },
    phases: [phase],
    tags: [],
  };
}

describe('board-playback-performance', () => {
  it('case 1: board モードで playbackStore.setTimeMs を連続実行しても PlaybackControls・CameraControlPanel が再レンダーされない', async () => {
    const documentStore = createDocumentStore(createTestProject());
    const playbackStore = createPlaybackStore();
    const sessionStore = createSessionStore({
      activePhaseId: 'phase-1',
      activeSlideId: 'slide-1',
    });

    let playbackControlsRenders = 0;
    let cameraControlRenders = 0;

    render(
      <TacticalStoreProvider
        stores={{
          documentStore,
          playbackStore,
          sessionStore,
        }}
      >
        <Profiler
          id="playback-controls"
          onRender={() => {
            playbackControlsRenders += 1;
          }}
        >
          <PlaybackControls />
        </Profiler>
        <Profiler
          id="camera-control"
          onRender={() => {
            cameraControlRenders += 1;
          }}
        >
          <CameraControlPanel />
        </Profiler>
      </TacticalStoreProvider>,
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const initialPlaybackRenders = playbackControlsRenders;
    const initialCameraRenders = cameraControlRenders;

    act(() => {
      playbackStore.getState().startPlayback();
    });

    const afterStartPlaybackRenders = playbackControlsRenders;
    const afterStartCameraRenders = cameraControlRenders;

    act(() => {
      playbackStore.getState().setTimeMs(100);
      playbackStore.getState().setTimeMs(250);
      playbackStore.getState().setTimeMs(500);
      playbackStore.getState().setTimeMs(750);
    });

    expect(initialPlaybackRenders).toBeGreaterThan(0);
    expect(initialCameraRenders).toBeGreaterThan(0);
    expect(playbackControlsRenders).toBe(afterStartPlaybackRenders);
    expect(cameraControlRenders).toBe(afterStartCameraRenders);
  });

  it('case 2: workspaceMode が director のときは playbackStore.startPlayback() しても useTacticalAnimation が rAF ループを起動しない', () => {
    const documentStore = createDocumentStore(createTestProject());
    const playbackStore = createPlaybackStore();
    const sessionStore = createSessionStore({
      activePhaseId: 'phase-1',
      activeSlideId: 'slide-1',
    });
    sessionStore.getState().setWorkspaceMode('director');

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <TacticalStoreProvider
        stores={{
          documentStore,
          playbackStore,
          sessionStore,
        }}
      >
        {children}
      </TacticalStoreProvider>
    );

    renderHook(() => useTacticalAnimation(), { wrapper });

    rafSpy.mockClear();

    act(() => {
      playbackStore.getState().startPlayback();
    });

    expect(rafSpy).not.toHaveBeenCalled();
    rafSpy.mockRestore();
  });

  it('case 4: director モードで startPlayback() 後に setTimeMs を 5 回連続実行しても CameraControlPanel・DirectorCameraTimeline・TacticalSplitPreviewPanel が再レンダーされず DOM が更新される', async () => {
    const project = createTestProject();
    for (const slide of project.phases[0].slides) {
      slide.ball.visible = false;
    }
    const documentStore = createDocumentStore(project);
    const playbackStore = createPlaybackStore();
    const sessionStore = createSessionStore({
      activePhaseId: 'phase-1',
      activeSlideId: 'slide-1',
    });
    sessionStore.getState().setWorkspaceMode('director');

    let cameraControlRenders = 0;
    let directorTimelineRenders = 0;
    let splitPreviewRenders = 0;

    render(
      <TacticalStoreProvider
        stores={{
          documentStore,
          playbackStore,
          sessionStore,
        }}
      >
        <Profiler
          id="camera-control"
          onRender={() => {
            cameraControlRenders += 1;
          }}
        >
          <CameraControlPanel />
        </Profiler>
        <Profiler
          id="director-timeline"
          onRender={() => {
            directorTimelineRenders += 1;
          }}
        >
          <DirectorCameraTimeline />
        </Profiler>
        <Profiler
          id="split-preview"
          onRender={() => {
            splitPreviewRenders += 1;
          }}
        >
          <TacticalSplitPreviewPanel />
        </Profiler>
      </TacticalStoreProvider>,
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const initialCameraRenders = cameraControlRenders;
    const initialTimelineRenders = directorTimelineRenders;
    const initialSplitPreviewRenders = splitPreviewRenders;

    act(() => {
      playbackStore.getState().startPlayback();
    });

    const afterStartCameraRenders = cameraControlRenders;
    const afterStartTimelineRenders = directorTimelineRenders;
    const afterStartSplitPreviewRenders = splitPreviewRenders;

    act(() => {
      playbackStore.getState().setTimeMs(300);
      playbackStore.getState().setTimeMs(600);
      playbackStore.getState().setTimeMs(900);
      playbackStore.getState().setTimeMs(1200);
      playbackStore.getState().setTimeMs(1500);
    });

    expect(initialCameraRenders).toBeGreaterThan(0);
    expect(initialTimelineRenders).toBeGreaterThan(0);
    expect(initialSplitPreviewRenders).toBeGreaterThan(0);

    expect(cameraControlRenders).toBe(afterStartCameraRenders);
    expect(directorTimelineRenders).toBe(afterStartTimelineRenders);
    expect(splitPreviewRenders).toBe(afterStartSplitPreviewRenders);

    expect(screen.getByTestId('director-scrubber-time').textContent).toBe(
      '1.5s',
    );
    expect(
      (screen.getByTestId('director-scrubber-input') as HTMLInputElement).value,
    ).toBe('1500');
  });
});
