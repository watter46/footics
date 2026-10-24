import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopBarMoreMenu } from '@/features/tactical-unified/panels/toolbar/top-bar-more-menu';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { db } from '@/lib/db';
import * as matchBridge from '@/lib/tactical/match-to-tactical-bridge';
import * as tacticalStorage from '@/lib/tactical/tactical-storage';
import type { Player } from '@/lib/types/tactical-unified';
import { FormationBenchItem } from '../formation-bench-item';
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

describe('SquadPanel & BenchItem & TopBarMoreMenu (Step 5)', () => {
  const dummyBenchPlayer: Player = {
    id: 'bench-p1',
    name: 'Cole Palmer',
    shirtNo: '10',
    position: 'AM',
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
  };

  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    vi.clearAllMocks();
  });

  describe('FormationBenchItem', () => {
    it('1. does not render "投入" (insert) or "交代" (swap) buttons, but renders drag grip and trash button', () => {
      const handleRemove = vi.fn();

      render(
        <FormationBenchItem
          player={dummyBenchPlayer}
          teamColor="#3b82f6"
          activeSlideId="slide-1"
          onRemovePlayer={handleRemove}
        />,
      );

      // "投入" and "交代" buttons should not exist
      expect(screen.queryByText(/投入/i)).toBeNull();
      expect(screen.queryByTitle(/Swap/i)).toBeNull();
      expect(screen.queryByRole('button', { name: /投入/i })).toBeNull();

      // Drag grip must exist
      expect(
        screen.getByRole('button', { name: /Drag player to pitch/i }),
      ).toBeDefined();

      // Trash2 (Remove) button must exist and trigger onRemovePlayer
      const removeBtn = screen.getByTitle('Remove');
      expect(removeBtn).toBeDefined();
      fireEvent.click(removeBtn);
      expect(handleRemove).toHaveBeenCalledWith('slide-1', 'bench-p1');
    });
  });

  describe('SquadSubPanel', () => {
    it('2. renders "Club & Season Presets" at bottom when project.matchId is undefined', () => {
      // Normal project: matchId is not set
      render(<SquadSubPanel />);

      const presetAccordion = screen.getByText('Club & Season Presets');
      expect(presetAccordion).toBeDefined();
    });

    it('3. hides "Club & Season Presets" when project.matchId is present', () => {
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
  });

  describe('TopBarMoreMenu - New Project with matchId', () => {
    it('4. re-initializes match data when project has matchId', async () => {
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

      // Open menu
      const moreBtn = screen.getByRole('button', { name: /More actions/i });
      fireEvent.click(moreBtn);

      // Click "New Project"
      const newProjBtn = screen.getByRole('button', { name: /New Project/i });
      fireEvent.click(newProjBtn);

      expect(db.matches.get).toHaveBeenCalledWith(999);
      // Wait microtasks
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
  });
});
