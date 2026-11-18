import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBarMoreMenu } from '@/features/tactical-unified/panels/toolbar/top-bar-more-menu';
import {
  createDocumentStore,
  type DocumentStore,
} from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  createPlaybackStore,
  type PlaybackStore,
} from '@/features/tactical-unified/stores/playback-store';
import {
  createSessionStore,
  type SessionStore,
} from '@/features/tactical-unified/stores/session-store';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';

type TacticalStores = {
  documentStore: DocumentStore;
  sessionStore: SessionStore;
  playbackStore: PlaybackStore;
};

import { db } from '@/lib/db';
import { createDefaultDomainPlayer } from '@/lib/tactical/domain/formation-placement';
import * as tacticalStorage from '@/lib/tactical/tactical-storage';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import type { DomainTacticalProject } from '@/lib/types/tactical/domain-hierarchy';
import { SquadSubForm } from '../squad-sub-form';
import { SquadSubPanel } from '../squad-sub-panel';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('matchId=999'),
}));

describe('SquadSubPanel - Phase 4 Bench Canvas & Interactivity', () => {
  const dummyBenchPlayers: DomainPlayer[] = [
    {
      ...createDefaultDomainPlayer(
        'home',
        0,
        0,
        '#3b82f6',
        'bench',
        'bench-gk',
      ),
      name: 'Robert Sanchez',
      shirtNo: '1',
      position: 'GK',
    },
    {
      ...createDefaultDomainPlayer(
        'home',
        0,
        0,
        '#3b82f6',
        'bench',
        'bench-fw',
      ),
      name: 'Nicolas Jackson',
      shirtNo: '15',
      position: 'FW',
    },
    {
      ...createDefaultDomainPlayer(
        'home',
        0,
        0,
        '#3b82f6',
        'bench',
        'bench-mf',
      ),
      name: 'Enzo Fernandez',
      shirtNo: '8',
      position: 'MF',
    },
    {
      ...createDefaultDomainPlayer(
        'home',
        0,
        0,
        '#3b82f6',
        'bench',
        'bench-df',
      ),
      name: 'Levi Colwill',
      shirtNo: '6',
      position: 'DF',
    },
  ];

  let stores: TacticalStores;
  let phaseId: string;
  let slideId: string;

  beforeEach(async () => {
    await Promise.all([
      db.matches.clear(),
      db.tactical_projects.clear(),
      db.keyval.clear(),
    ]);
    const mockCtx = new Proxy(
      {
        getImageData: () => ({ data: new Array(4) }),
        createImageData: () => [],
        getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
        measureText: () => ({ width: 0 }),
        getLineDash: () => [],
        isPointInPath: () => true,
      } as Record<string, unknown>,
      {
        get: (target, prop: string) =>
          prop in target ? target[prop] : vi.fn(),
      },
    );
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);

    const initialProject: DomainTacticalProject = {
      id: 'proj-1',
      title: 'Test Project',
      version: '3.0.0',
      screenBackground: { type: 'dark' },
      tags: [],
      homeColor: { primary: '#3b82f6', secondary: '#ffffff' },
      awayColor: { primary: '#ef4444', secondary: '#ffffff' },
      pitchAppearance: {
        pitchBackgroundType: 'solid',
        overlayColor: '#000000',
        overlayOpacity: 0,
        lineColor: '#ffffff',
        lineWidth: 2,
        lineOpacity: 0.8,
      },
      phases: [
        {
          id: 'phase-1',
          name: 'Phase 1',
          aspectRatio: '16:9',
          boundaryBox: { x: 0, y: 0, width: 100, height: 100, enabled: false },
          backgroundType: 'pitch',
          slides: [
            {
              id: 'slide-1',
              index: 0,
              transitionDurationMs: 1000,
              pauseMs: 1000,
              easing: 'ease-in-out',
              players: [...dummyBenchPlayers],
              ball: {
                x: clampToScreenNorm(50),
                y: clampToScreenNorm(50),
                visible: true,
                locked: false,
              },
              arrows: [],
              zones: [],
              texts: [],
            },
          ],
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const documentStore = createDocumentStore(initialProject);
    const project = documentStore.getState().project;
    phaseId = project.phases[0].id;
    slideId = project.phases[0].slides[0].id;
    const sessionStore = createSessionStore({
      activePhaseId: phaseId,
      activeSlideId: slideId,
    });
    const playbackStore = createPlaybackStore();
    stores = { documentStore, sessionStore, playbackStore };
    vi.clearAllMocks();
  });

  it('1. renders id="tactical-bench-canvas" sub-canvas container and PlayerMarkerItem markers instead of DOM cards', () => {
    const { container } = render(
      <TacticalStoreProvider stores={stores}>
        <SquadSubPanel />
      </TacticalStoreProvider>,
    );

    // サブキャンバスコンテナが存在すること
    const canvasContainer = container.querySelector('#tactical-bench-canvas');
    expect(canvasContainer).not.toBeNull();

    // 旧ベンチカードの要素（Drag player to pitch ボタン、Removeボタン等）が存在しないこと
    expect(
      screen.queryByRole('button', { name: /Drag player to pitch/i }),
    ).toBeNull();
    expect(screen.queryByTitle('Remove')).toBeNull();

    // Konva Stage コンテナが存在すること
    const konvaStage = canvasContainer?.querySelector('.konvajs-content');
    expect(konvaStage).toBeDefined();
  });

  it('2. organizes bench players into 3-column grid (FW -> MF -> DF -> GK) on "整理" click', () => {
    render(
      <TacticalStoreProvider stores={stores}>
        <SquadSubPanel />
      </TacticalStoreProvider>,
    );

    const organizeBtn = screen.getByRole('button', { name: /整理/i });
    fireEvent.click(organizeBtn);

    const activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );
    const benchPlayers =
      activeSlide?.players.filter((p) => p.area === 'bench') ?? [];

    // FW (Jackson): idx 0 -> x: 20, y: 14 + 0 * 22 = 14
    const fw = benchPlayers.find((p) => p.id === 'bench-fw');
    expect(fw?.x).toBe(20);
    expect(fw?.y).toBe(14);

    // MF (Enzo): idx 1 -> x: 50, y: 14 + 0 * 22 = 14
    const mf = benchPlayers.find((p) => p.id === 'bench-mf');
    expect(mf?.x).toBe(50);
    expect(mf?.y).toBe(14);

    // DF (Colwill): idx 2 -> x: 80, y: 14 + 0 * 22 = 14
    const df = benchPlayers.find((p) => p.id === 'bench-df');
    expect(df?.x).toBe(80);
    expect(df?.y).toBe(14);

    // GK (Sanchez): idx 3 (row 1, col 0) -> x: 20, y: 14 + 1 * 22 = 36
    const gk = benchPlayers.find((p) => p.id === 'bench-gk');
    expect(gk?.x).toBe(20);
    expect(gk?.y).toBe(36);
  });

  it('3. renders "Club & Season Presets" at bottom when project.matchId is undefined', () => {
    render(
      <TacticalStoreProvider stores={stores}>
        <SquadSubPanel />
      </TacticalStoreProvider>,
    );
    const presetAccordion = screen.getByText('Club & Season Presets');
    expect(presetAccordion).toBeDefined();
  });

  it('4. hides "Club & Season Presets" when project.matchId is present', () => {
    stores.documentStore.getState().loadProject({
      ...stores.documentStore.getState().project,
      matchId: 'match-123',
    });

    render(
      <TacticalStoreProvider stores={stores}>
        <SquadSubPanel />
      </TacticalStoreProvider>,
    );
    expect(screen.queryByText('Club & Season Presets')).toBeNull();
  });

  it('5. expands Stage height when bench has many players (e.g. 5+ rows)', () => {
    const manyBenchPlayers: DomainPlayer[] = Array.from(
      { length: 15 },
      (_, i) => ({
        ...dummyBenchPlayers[0],
        id: `bench-many-${i}`,
        y: clampToScreenNorm(14 + Math.floor(i / 3) * 22), // row 4 has y: 102
      }),
    );

    stores.documentStore.getState().dispatch({
      type: 'APPLY_SLIDE_COMMAND',
      phaseId,
      slideId,
      command: { type: 'REPLACE_PLAYERS', players: manyBenchPlayers },
    });

    const { container } = render(
      <TacticalStoreProvider stores={stores}>
        <SquadSubPanel />
      </TacticalStoreProvider>,
    );
    const canvasContainer = container.querySelector(
      '#tactical-bench-canvas',
    ) as HTMLElement | null;
    expect(canvasContainer).not.toBeNull();
    // 15 players -> 5 rows, max y = 102 -> height should be > 280
    const heightStyle = canvasContainer?.style.height;
    const heightNum = Number.parseInt(
      heightStyle?.replace('px', '') ?? '0',
      10,
    );
    expect(heightNum).toBeGreaterThan(280);
  });

  it('6. TopBarMoreMenu re-initializes match data when project has matchId', async () => {
    window.confirm = vi.fn().mockReturnValue(true);

    const matchRecord: Parameters<typeof db.matches.put>[0] = {
      id: 999 as unknown as string,
      homeTeam: { id: 1, name: 'Chelsea' },
      awayTeam: { id: 2, name: 'Arsenal' },
      date: '2026-01-01',
      matchType: 'club',
      score: '2 - 1',
      playerIdNameDictionary: {},
      teams: {
        home: {
          teamId: 1,
          name: 'Chelsea',
          players: [],
        },
        away: {
          teamId: 2,
          name: 'Arsenal',
          players: [],
        },
      },
    };

    await db.matches.put(matchRecord);
    const projectWithMatch: DomainTacticalProject = {
      ...stores.documentStore.getState().project,
      matchId: '999',
    };
    await tacticalStorage.saveActiveProjectToDb(projectWithMatch, '999');

    const getMatchSpy = vi.spyOn(db.matches, 'get');
    const clearProjectSpy = vi.spyOn(
      tacticalStorage,
      'clearActiveProjectFromDb',
    );

    stores.documentStore.getState().loadProject(projectWithMatch);

    render(
      <TacticalStoreProvider stores={stores}>
        <TopBarMoreMenu />
      </TacticalStoreProvider>,
    );

    const moreBtn = screen.getByRole('button', { name: /More actions/i });
    fireEvent.click(moreBtn);

    const newProjBtn = screen.getByRole('menuitem', { name: /New Project/i });
    fireEvent.click(newProjBtn);

    expect(getMatchSpy).toHaveBeenCalledWith(999);
    await vi.waitFor(() => {
      expect(clearProjectSpy).toHaveBeenCalledWith('999');
    });
    await expect(
      tacticalStorage.loadActiveProjectFromDb('999'),
    ).resolves.toBeNull();
  });

  it('7. selecting marker in sub-canvas updates selectedObjects in store', () => {
    render(
      <TacticalStoreProvider stores={stores}>
        <SquadSubPanel />
      </TacticalStoreProvider>,
    );
    const canvasContainer = document.getElementById('tactical-bench-canvas');
    expect(canvasContainer).not.toBeNull();

    stores.sessionStore
      .getState()
      .selectObject({ id: 'bench-fw', kind: 'player' });
    const selected = stores.sessionStore.getState().selectedObjects;
    expect(selected.some((o) => o.id === 'bench-fw')).toBe(true);
  });

  it('8. moving player from sub-canvas to pitch updates player area to pitch', () => {
    stores.documentStore.getState().dispatch({
      type: 'APPLY_SLIDE_COMMAND',
      phaseId,
      slideId,
      command: {
        type: 'MOVE_PLAYER_TO_PITCH',
        id: 'bench-fw',
        x: clampToScreenNorm(45),
        y: clampToScreenNorm(55),
      },
    });

    const activeSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      phaseId,
      slideId,
    );
    const player = activeSlide?.players.find((p) => p.id === 'bench-fw');
    expect(player?.area).toBe('pitch');
    expect(player?.x).toBe(45);
    expect(player?.y).toBe(55);
  });

  describe('Bench & Squad Forms Primitives & Layout Cleanup', () => {
    it('SquadSubForm uses Input and Button UI components', () => {
      const { container } = render(
        <SquadSubForm
          newSubNo="10"
          setNewSubNo={vi.fn()}
          newSubPos="FW"
          setNewSubPos={vi.fn()}
          newSubName="Mudryk"
          setNewSubName={vi.fn()}
          onSubmit={vi.fn()}
        />,
      );
      const submitBtn = screen.getByRole('button', { name: 'Add' });
      expect(submitBtn.className).toContain('btn-interactive');

      const inputs = container.querySelectorAll('input');
      expect(inputs.length).toBe(3);
      for (const input of inputs) {
        expect(input.className).toContain('focus:ring-1');
      }
    });
  });
});
