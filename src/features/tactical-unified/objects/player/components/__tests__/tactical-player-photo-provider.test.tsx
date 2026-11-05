import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePlayerPhotoContext } from '@/features/tactical-unified/core';
import { TacticalPlayerPhotoProvider } from '../tactical-player-photo-provider';

// Mocks
vi.mock(
  '@/features/tactical-unified/stores/tactical-unified-store-provider',
  () => ({
    useTacticalUnifiedStoreContext: vi.fn(),
  }),
);

vi.mock(
  '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry',
  () => ({
    usePlayerPhotoRegistry: vi.fn(),
  }),
);

import { usePlayerPhotoRegistry } from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';

function TestConsumer() {
  const photos = usePlayerPhotoContext();
  return (
    <div>
      <span data-testid="photo-count">{photos ? photos.size : 'null'}</span>
      <span data-testid="has-p1">{photos?.has('p1') ? 'yes' : 'no'}</span>
    </div>
  );
}

describe('TacticalPlayerPhotoProvider', () => {
  it('collects all active phase players (including bench) and provides photo map to children', () => {
    const mockPlayers = [
      {
        id: 'p1',
        name: 'Haaland',
        area: 'bench' as const,
        style: { insideContent: 'photo' },
      },
      {
        id: 'p2',
        name: 'De Bruyne',
        area: 'pitch' as const,
        style: { insideContent: 'photo' },
      },
    ];

    vi.mocked(useTacticalUnifiedStoreContext).mockImplementation(
      (selector: any) => {
        // simulate returning active slides
        return [{ players: mockPlayers }];
      },
    );

    const mockPhotoMap = new Map<string, HTMLImageElement>([
      ['p1', {} as HTMLImageElement],
    ]);
    vi.mocked(usePlayerPhotoRegistry).mockReturnValue(mockPhotoMap);

    render(
      <TacticalPlayerPhotoProvider>
        <TestConsumer />
      </TacticalPlayerPhotoProvider>,
    );

    // Verify usePlayerPhotoRegistry was called with mockPlayers
    expect(usePlayerPhotoRegistry).toHaveBeenCalledWith(mockPlayers);

    // Verify context is provided to child
    expect(screen.getByTestId('photo-count').textContent).toBe('1');
    expect(screen.getByTestId('has-p1').textContent).toBe('yes');
  });

  it('handles slides with undefined players safely', () => {
    vi.mocked(useTacticalUnifiedStoreContext).mockReturnValue([{}]);
    vi.mocked(usePlayerPhotoRegistry).mockReturnValue(new Map());

    render(
      <TacticalPlayerPhotoProvider>
        <TestConsumer />
      </TacticalPlayerPhotoProvider>,
    );

    expect(usePlayerPhotoRegistry).toHaveBeenCalledWith([]);
    expect(screen.getByTestId('photo-count').textContent).toBe('0');
  });
});
