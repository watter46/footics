'use client';

import { createContext, type ReactNode, useContext, useRef } from 'react';
import { useStore } from 'zustand';
import { createDefaultDomainPlayers } from '@/lib/tactical/domain/default-players';
import type { Milliseconds } from '@/lib/types/tactical/branded';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainTacticalProject } from '@/lib/types/tactical/domain-hierarchy';
import {
  createDocumentStore,
  type DocumentStore,
  type DocumentStoreState,
} from './document-store';
import {
  createPlaybackStore,
  type PlaybackStore,
  type PlaybackStoreState,
} from './playback-store';
import {
  type CreateSessionStoreOptions,
  createSessionStore,
  type SessionStore,
  type SessionStoreState,
} from './session-store';

export interface TacticalStoresContextValue {
  readonly documentStore: DocumentStore;
  readonly sessionStore: SessionStore;
  readonly playbackStore: PlaybackStore;
}

export const TacticalStoresContext =
  createContext<TacticalStoresContextValue | null>(null);

export function createDefaultTacticalProject(): DomainTacticalProject {
  const now = '1970-01-01T00:00:00.000Z';
  return {
    id: 'default-project',
    version: '3.0.0',
    title: 'Untitled Tactical Plan',
    createdAt: now,
    updatedAt: now,
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
    phases: [
      {
        id: 'default-phase-1',
        name: 'Phase 1',
        aspectRatio: '4:5',
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
        slides: [
          {
            id: 'default-slide-1',
            index: 0,
            label: 'Scene 1',
            players: createDefaultDomainPlayers(
              '#034694',
              '#ef4444',
              '4:5',
            ).map((player, index) => ({
              ...player,
              id: `default-player-${player.team}-${index}`,
            })),
            arrows: [],
            zones: [],
            texts: [],
            ball: {
              x: clampToScreenNorm(50),
              y: clampToScreenNorm(50),
              visible: true,
            },
            transitionDurationMs: 1000,
            pauseMs: 500,
            easing: 'ease-in-out',
          },
        ],
      },
    ],
    tags: [],
  };
}

export interface TacticalStoreProviderProps {
  initialProject?: DomainTacticalProject;
  initialSession?: CreateSessionStoreOptions;
  initialTimeMs?: Milliseconds;
  stores?: {
    documentStore?: DocumentStore;
    sessionStore?: SessionStore;
    playbackStore?: PlaybackStore;
  };
  children?: ReactNode;
}

export function TacticalStoreProvider({
  initialProject,
  initialSession,
  initialTimeMs,
  stores,
  children,
}: TacticalStoreProviderProps): React.JSX.Element {
  const storesRef = useRef<TacticalStoresContextValue | null>(null);

  if (!storesRef.current) {
    const documentStore =
      stores?.documentStore ??
      createDocumentStore(initialProject ?? createDefaultTacticalProject());
    const resolvedProject = documentStore.getState().project;
    const defaultPhase = resolvedProject.phases[0];
    const defaultSlide = defaultPhase?.slides[0];
    const sessionStore =
      stores?.sessionStore ??
      createSessionStore({
        ...initialSession,
        activePhaseId: initialSession?.activePhaseId || defaultPhase?.id || '',
        activeSlideId: initialSession?.activeSlideId || defaultSlide?.id || '',
      });
    const playbackStore =
      stores?.playbackStore ?? createPlaybackStore(initialTimeMs);

    storesRef.current = {
      documentStore,
      sessionStore,
      playbackStore,
    };
  }

  return (
    <TacticalStoresContext.Provider value={storesRef.current}>
      {children}
    </TacticalStoresContext.Provider>
  );
}

export function useTacticalStoresContext(): TacticalStoresContextValue {
  const context = useContext(TacticalStoresContext);
  if (!context) {
    throw new Error(
      'useTacticalStoresContext must be used within a TacticalStoreProvider',
    );
  }
  return context;
}

const identity = <S,>(state: S): S => state;

export function useDocumentStore(): DocumentStoreState;
export function useDocumentStore<T>(
  selector: (state: DocumentStoreState) => T,
): T;
export function useDocumentStore<T>(
  selector: (state: DocumentStoreState) => T = identity as (
    state: DocumentStoreState,
  ) => T,
): T {
  const { documentStore } = useTacticalStoresContext();
  return useStore(documentStore, selector);
}

export function useSessionStore(): SessionStoreState;
export function useSessionStore<T>(
  selector: (state: SessionStoreState) => T,
): T;
export function useSessionStore<T>(
  selector: (state: SessionStoreState) => T = identity as (
    state: SessionStoreState,
  ) => T,
): T {
  const { sessionStore } = useTacticalStoresContext();
  return useStore(sessionStore, selector);
}

export function usePlaybackStore(): PlaybackStoreState;
export function usePlaybackStore<T>(
  selector: (state: PlaybackStoreState) => T,
): T;
export function usePlaybackStore<T>(
  selector: (state: PlaybackStoreState) => T = identity as (
    state: PlaybackStoreState,
  ) => T,
): T {
  const { playbackStore } = useTacticalStoresContext();
  return useStore(playbackStore, selector);
}
