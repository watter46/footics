import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SquadCategoryList } from '../squad-category-list';
import type { MergedSquadPlayer } from '../squad-player-card';
import type { PositionCategory } from '../squad-stats-summary';

const mockCategories: PositionCategory[] = [
  { key: 'GK', label: 'Goalkeepers', positions: ['GK'] },
  { key: 'DF', label: 'Defenders', positions: ['DF'] },
  { key: 'MID', label: 'Midfielders', positions: ['MID'] },
];

const createMockPlayer = (
  overrides: Partial<MergedSquadPlayer>,
): MergedSquadPlayer =>
  ({
    playerId: 1,
    name: 'Player',
    shirtNo: 1,
    position: 'MID',
    height: 180,
    weight: 75,
    age: 24,
    isManOfTheMatch: false,
    field: ':home:',
    isFirstEleven: true,
    ...overrides,
  }) as MergedSquadPlayer;

const mockPlayersByCategory: Record<string, MergedSquadPlayer[]> = {
  GK: [
    createMockPlayer({
      playerId: 1,
      name: 'Robert Sanchez',
      shirtNo: 1,
      position: 'GK',
    }),
  ],
  DF: [],
  MID: [
    createMockPlayer({
      playerId: 10,
      name: 'Cole Palmer',
      shirtNo: 20,
      position: 'MID',
    }),
  ],
};

describe('SquadCategoryList', () => {
  it('renders categories with players and skips empty categories', () => {
    render(
      <SquadCategoryList
        positionCategories={mockCategories}
        playersByCategory={mockPlayersByCategory}
        selectedSeason="25-26"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onPhotoUpload={vi.fn()}
        onPhotoDelete={vi.fn()}
      />,
    );

    // GK and MID should be visible
    expect(screen.getByText('Goalkeepers')).toBeDefined();
    expect(screen.getByText('Midfielders')).toBeDefined();
    expect(screen.getByText('Robert Sanchez')).toBeDefined();
    expect(screen.getByText('Cole Palmer')).toBeDefined();

    // DF has no players, so Defenders header should not be rendered
    expect(screen.queryByText('Defenders')).toBeNull();
  });
});
