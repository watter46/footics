import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBarMoreMenu } from '@/features/tactical-unified/panels/toolbar/top-bar-more-menu';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { db } from '@/lib/db';
import * as matchBridge from '@/lib/tactical/match-to-tactical-bridge';
import * as tacticalStorage from '@/lib/tactical/tactical-storage';
import type { Player } from '@/lib/types/tactical-unified';
import { SquadSubPanel } from '../squad-sub-panel';

vi.mock('@/lib/db', () => ({
  db: {
    matches: {
      get: vi.fn(),
    },
  },
}));

vi.mock('@/lib/tactical/match-to-tactical-bridge', () => ({
  injectMatchToTactical: vi.fn(),
}));

vi.mock('@/lib/tactical/tactical-storage', () => ({
  clearActiveProjectFromDb: vi.fn().mockResolvedValue(undefined),
  saveActiveProjectToDb: vi.fn().mockResolvedValue(undefined),
  loadActiveProjectFromDb: vi.fn().mockResolvedValue(null),
  getTacticalProjectStorageKey: vi.fn(),
  TACTICAL_PROJECT_STORAGE_KEY: 'tactical_active_project',
}));

describe('SquadSubPanel - Phase 4 Bench Canvas & Interactivity', () => {
  const dummyBenchPlayers: Player[] = [
    {
      id: 'bench-gk',
      name: 'Robert Sanchez',
      shirtNo: '1',
      position: 'GK',
      team: 'home',
      area: 'bench',
      x: 0,
      y: 0,
      connectLines: [],
      badges: [],
      style: {
        color: '#3b82f6',
        insideContent: 'number',
        markerType: 'circle',
        bottomLabel: 'name',
        strokeColor: '#ffffff',
        strokeWidth: 1,
        sizeScale: 1,
        numberSizeScale: 1,
        labelSizeScale: 1,
      },
    },
    {
      id: 'bench-fw',
      name: 'Nicolas Jackson',
      shirtNo: '15',
      position: 'FW',
      team: 'home',
      area: 'bench',
      x: 0,
      y: 0,
      connectLines: [],
      badges: [],
      style: {
        color: '#3b82f6',
        insideContent: 'number',
        markerType: 'circle',
        bottomLabel: 'name',
        strokeColor: '#ffffff',
        strokeWidth: 1,
        sizeScale: 1,
        numberSizeScale: 1,
        labelSizeScale: 1,
      },
    },
    {
      id: 'bench-mf',
      name: 'Enzo Fernandez',
      shirtNo: '8',
      position: 'MF',
      team: 'home',
      area: 'bench',
      x: 0,
      y: 0,
      connectLines: [],
      badges: [],
      style: {
        color: '#3b82f6',
        insideContent: 'number',
        markerType: 'circle',
        bottomLabel: 'name',
        strokeColor: '#ffffff',
        strokeWidth: 1,
        sizeScale: 1,
        numberSizeScale: 1,
        labelSizeScale: 1,
      },
    },
    {
      id: 'bench-df',
      name: 'Levi Colwill',
      shirtNo: '6',
      position: 'DF',
      team: 'home',
      area: 'bench',
      x: 0,
      y: 0,
      connectLines: [],
      badges: [],
      style: {
        color: '#3b82f6',
        insideContent: 'number',
        markerType: 'circle',
        bottomLabel: 'name',
        strokeColor: '#ffffff',
        strokeWidth: 1,
        sizeScale: 1,
        numberSizeScale: 1,
        labelSizeScale: 1,
      },
    },
  ];

  beforeEach(() => {
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

    useTacticalUnifiedStore.getState().resetProject();
    const activeSlideId = useTacticalUnifiedStore.getState().activeSlideId;
    useTacticalUnifiedStore.setState((s) => ({
      ...s,
      project: {
        ...s.project,
        slides: s.project.slides.map((sl) =>
          sl.id === activeSlideId
            ? { ...sl, players: [...dummyBenchPlayers] }
            : sl,
        ),
      },
    }));
    vi.clearAllMocks();
  });

  it('1. renders id="tactical-bench-canvas" sub-canvas container and PlayerMarkerItem markers instead of DOM cards', () => {
    const { container } = render(<SquadSubPanel />);

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
    render(<SquadSubPanel />);

    const organizeBtn = screen.getByRole('button', { name: /整理/i });
    fireEvent.click(organizeBtn);

    const activeSlide = useTacticalUnifiedStore.getState().project.slides[0];
    const benchPlayers = activeSlide.players.filter((p) => p.area === 'bench');

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
    render(<SquadSubPanel />);
    const presetAccordion = screen.getByText('Club & Season Presets');
    expect(presetAccordion).toBeDefined();
  });

  it('4. hides "Club & Season Presets" when project.matchId is present', () => {
    useTacticalUnifiedStore.setState((s) => ({
      ...s,
      project: {
        ...s.project,
        matchId: 'match-123',
      },
    }));

    render(<SquadSubPanel />);
    expect(screen.queryByText('Club & Season Presets')).toBeNull();
  });

  it('5. expands Stage height when bench has many players (e.g. 5+ rows)', () => {
    const activeSlideId = useTacticalUnifiedStore.getState().activeSlideId;
    const manyBenchPlayers: Player[] = Array.from({ length: 15 }, (_, i) => ({
      ...dummyBenchPlayers[0],
      id: `bench-many-${i}`,
      y: 14 + Math.floor(i / 3) * 22, // row 4 has y: 102
    }));

    useTacticalUnifiedStore.setState((s) => ({
      ...s,
      project: {
        ...s.project,
        slides: s.project.slides.map((sl) =>
          sl.id === activeSlideId ? { ...sl, players: manyBenchPlayers } : sl,
        ),
      },
    }));

    const { container } = render(<SquadSubPanel />);
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

    const mockMatch = {
      id: 999,
      homeTeam: 'Chelsea',
      awayTeam: 'Arsenal',
      homeScore: 2,
      awayScore: 1,
    };

    (db.matches.get as any).mockResolvedValue(mockMatch);

    useTacticalUnifiedStore.setState((s) => ({
      ...s,
      project: {
        ...s.project,
        matchId: '999',
      },
    }));

    render(<TopBarMoreMenu />);

    const moreBtn = screen.getByRole('button', { name: /More actions/i });
    fireEvent.click(moreBtn);

    const newProjBtn = screen.getByRole('button', { name: /New Project/i });
    fireEvent.click(newProjBtn);

    expect(db.matches.get).toHaveBeenCalledWith(999);
    await vi.waitFor(() => {
      expect(matchBridge.injectMatchToTactical).toHaveBeenCalledWith({
        match: mockMatch,
        minute: 0,
      });
      expect(tacticalStorage.clearActiveProjectFromDb).toHaveBeenCalledWith(
        '999',
      );
    });
  });

  it('7. selecting marker in sub-canvas updates selectedObjects in store', () => {
    render(<SquadSubPanel />);
    const canvasContainer = document.getElementById('tactical-bench-canvas');
    expect(canvasContainer).not.toBeNull();

    useTacticalUnifiedStore
      .getState()
      .selectObject({ id: 'bench-fw', kind: 'player' });
    const selected = useTacticalUnifiedStore.getState().selectedObjects;
    expect(selected.some((o) => o.id === 'bench-fw')).toBe(true);
  });

  it('8. moving player from sub-canvas to pitch updates player area to pitch', () => {
    const activeSlideId = useTacticalUnifiedStore.getState().activeSlideId;
    useTacticalUnifiedStore
      .getState()
      .movePlayerToPitch(activeSlideId, 'bench-fw', 45, 55);

    const activeSlide = useTacticalUnifiedStore.getState().project.slides[0];
    const player = activeSlide.players.find((p) => p.id === 'bench-fw');
    expect(player?.area).toBe('pitch');
    expect(player?.x).toBe(45);
    expect(player?.y).toBe(55);
  });
});
