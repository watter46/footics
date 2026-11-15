import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayerPhotoContext } from '@/features/tactical-unified/core';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import * as resolver from '@/lib/tactical/player-photo-resolver';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import { TacticalPlayerPhotoProvider } from '../tactical-player-photo-provider';

function makePhotoPlayer(
  id: string,
  playerId: string,
  name: string,
  area: 'pitch' | 'bench',
  baseStyle: DomainPlayer['style'],
): DomainPlayer {
  return {
    id,
    playerId,
    team: 'home',
    name,
    shirtNo: area === 'bench' ? '9' : '17',
    position: 'MF',
    x: clampToScreenNorm(area === 'bench' ? 0 : 40),
    y: clampToScreenNorm(area === 'bench' ? 0 : 50),
    area,
    connectLines: [],
    badges: [],
    style: {
      ...baseStyle,
      markerType: 'circle',
      insideContent: 'photo',
      photoUrl: `https://example.com/${playerId}.png`,
    },
  };
}

function TestConsumer() {
  const photos = usePlayerPhotoContext();
  return (
    <div>
      <span data-testid="photo-count">{photos ? photos.size : 'null'}</span>
      <span data-testid="has-p1">{photos?.has('101') ? 'yes' : 'no'}</span>
      <span data-testid="has-p2">{photos?.has('102') ? 'yes' : 'no'}</span>
    </div>
  );
}

describe('TacticalPlayerPhotoProvider', () => {
  let originalImage: typeof Image;

  beforeEach(() => {
    originalImage = globalThis.Image;
    class MockImage {
      onload: (() => void) | null = null;
      private _src = '';
      set src(value: string) {
        this._src = value;
        queueMicrotask(() => this.onload?.());
      }
      get src() {
        return this._src;
      }
    }
    globalThis.Image = MockImage as unknown as typeof Image;
  });

  afterEach(() => {
    globalThis.Image = originalImage;
    vi.restoreAllMocks();
  });

  it('collects all active phase players (including bench) and provides loaded photo map to children', async () => {
    const resolveSpy = vi
      .spyOn(resolver, 'resolvePlayerPhotoSources')
      .mockImplementation(
        async (targets) =>
          new Map(
            targets.map((t) => [
              t.key,
              { kind: 'url', url: `https://example.com/${t.key}.png` },
            ]),
          ),
      );
    const project = createDefaultTacticalProject();
    const basePhase = project.phases[0]!;
    const baseSlide = basePhase.slides[0]!;
    const baseStyle = baseSlide.players[0]!.style;
    const players = [
      makePhotoPlayer('p1', '101', 'Haaland', 'bench', baseStyle),
      makePhotoPlayer('p2', '102', 'De Bruyne', 'pitch', baseStyle),
    ];
    const stores = {
      documentStore: createDocumentStore({
        ...project,
        phases: [{ ...basePhase, slides: [{ ...baseSlide, players }] }],
      }),
      sessionStore: createSessionStore({
        activePhaseId: basePhase.id,
        activeSlideId: baseSlide.id,
      }),
      playbackStore: createPlaybackStore(),
    };
    render(
      <TacticalStoreProvider stores={stores}>
        <TacticalPlayerPhotoProvider>
          <TestConsumer />
        </TacticalPlayerPhotoProvider>
      </TacticalStoreProvider>,
    );
    await vi.waitFor(() =>
      expect(screen.getByTestId('photo-count').textContent).toBe('2'),
    );
    expect(resolveSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('has-p1').textContent).toBe('yes');
    expect(screen.getByTestId('has-p2').textContent).toBe('yes');
  });

  it('handles unknown activePhaseId safely with empty photo map', () => {
    const project = createDefaultTacticalProject();
    const stores = {
      documentStore: createDocumentStore(project),
      sessionStore: createSessionStore({
        activePhaseId: 'non-existent-phase',
        activeSlideId: '',
      }),
      playbackStore: createPlaybackStore(),
    };
    render(
      <TacticalStoreProvider stores={stores}>
        <TacticalPlayerPhotoProvider>
          <TestConsumer />
        </TacticalPlayerPhotoProvider>
      </TacticalStoreProvider>,
    );
    expect(screen.getByTestId('photo-count').textContent).toBe('0');
    expect(screen.getByTestId('has-p1').textContent).toBe('no');
  });
});
