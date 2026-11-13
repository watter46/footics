import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import {
  selectDomainActiveBoundaryBox,
  selectDomainActivePhase,
  selectDomainActivePhaseAspectRatio,
  selectDomainActiveSlide,
  selectDomainIsMultiSlide,
  selectDomainPreviousSlide,
  selectDomainRenderSnapshot,
} from '../domain-selectors';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
  useSessionStore,
} from '../tactical-store-provider';

describe('domain-selectors and TacticalStoreProvider defaults', () => {
  it('createDefaultTacticalProject creates 22 pitch players and valid hierarchy', () => {
    const project = createDefaultTacticalProject();
    expect(project.version).toBe('3.0.0');
    expect(project.phases).toHaveLength(1);
    const slide = project.phases[0]?.slides[0];
    expect(slide?.players).toHaveLength(22);
    expect(slide?.players.filter((p) => p.team === 'home')).toHaveLength(11);
    expect(slide?.players.filter((p) => p.team === 'away')).toHaveLength(11);
  });

  it('TacticalStoreProvider initializes activePhaseId and activeSlideId from project when omitted', () => {
    const project = createDefaultTacticalProject();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        TacticalStoreProvider,
        { initialProject: project },
        children,
      );
    const { result } = renderHook(
      () => ({
        phaseId: useSessionStore((s) => s.activePhaseId),
        slideId: useSessionStore((s) => s.activeSlideId),
      }),
      { wrapper },
    );
    expect(result.current.phaseId).toBe(project.phases[0]?.id);
    expect(result.current.slideId).toBe(project.phases[0]?.slides[0]?.id);
  });

  it('selects active phase, slide, previous slide, boundaryBox, and snapshot', () => {
    const base = createDefaultTacticalProject();
    const phase1 = base.phases[0]!;
    const slide1 = phase1.slides[0]!;
    const slide2 = { ...slide1, id: 'slide-2', index: 1, label: 'Scene 2' };
    const project = {
      ...base,
      phases: [
        { ...phase1, aspectRatio: '16:9' as const, slides: [slide1, slide2] },
      ],
    };

    expect(selectDomainActivePhase(project, phase1.id)?.id).toBe(phase1.id);
    expect(selectDomainActivePhase(project, 'missing')?.id).toBe(phase1.id);
    expect(selectDomainActiveSlide(project, phase1.id, 'slide-2')?.id).toBe(
      'slide-2',
    );
    expect(selectDomainPreviousSlide(project, phase1.id, slide1.id)).toBeNull();
    expect(selectDomainPreviousSlide(project, phase1.id, 'slide-2')?.id).toBe(
      slide1.id,
    );
    expect(selectDomainActivePhaseAspectRatio(project, phase1.id)).toBe('16:9');
    expect(selectDomainActiveBoundaryBox(project, phase1.id)).toEqual(
      phase1.boundaryBox,
    );
    expect(selectDomainIsMultiSlide(project, phase1.id)).toBe(true);

    const snapshot = selectDomainRenderSnapshot(
      project,
      phase1.id,
      'slide-2',
      'home',
    );
    expect(snapshot.activeSlide?.id).toBe('slide-2');
    expect(snapshot.slides).toHaveLength(2);
    expect(snapshot.teamVisibility).toBe('home');
  });
});
