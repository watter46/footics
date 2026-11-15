import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDocumentStore,
  type DocumentStore,
} from '@/features/tactical-unified/stores/document-store';
import { createDefaultTacticalProject } from '@/features/tactical-unified/stores/tactical-store-provider';
import { buildExportMVPMatrix } from '@/lib/tactical/engine/projection-3d';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';

type DomainPitchTransform = NonNullable<DomainSlide['pitchTransform']>;

describe('L3-Tactical-028: Pitch Tilt Store Actions & Boundary Box Independence', () => {
  let docStore: DocumentStore;
  let phaseId: string;
  let slideId: string;

  beforeEach(() => {
    const project = createDefaultTacticalProject();
    docStore = createDocumentStore(project);
    phaseId = project.phases[0]?.id ?? '';
    slideId = project.phases[0]?.slides[0]?.id ?? '';
  });

  function updatePitchTransform(patch: Partial<DomainPitchTransform>) {
    const slide = docStore
      .getState()
      .project.phases.find((p) => p.id === phaseId)
      ?.slides.find((s) => s.id === slideId);
    const current = slide?.pitchTransform ?? {
      panX: 0,
      panY: 0,
      zoom: 1,
      tilt: 0,
      yaw: 0,
      isLocked: false,
    };
    docStore.getState().dispatchSlide(phaseId, slideId, {
      type: 'UPDATE_SLIDE_META',
      patch: {
        pitchTransform: {
          ...current,
          ...patch,
        },
      },
    });
  }

  function getActiveSlide() {
    return docStore
      .getState()
      .project.phases.find((p) => p.id === phaseId)
      ?.slides.find((s) => s.id === slideId);
  }

  it('UPDATE_SLIDE_META updates tilt and preserves existing panX, panY, zoom, isLocked', () => {
    updatePitchTransform({
      panX: 50,
      panY: -30,
      zoom: 1.5,
      isLocked: true,
    });

    // Update tilt to 45°
    updatePitchTransform({ tilt: 45 });

    const slide = getActiveSlide();

    expect(slide?.pitchTransform?.tilt).toBe(45);
    expect(slide?.pitchTransform?.panX).toBe(50);
    expect(slide?.pitchTransform?.panY).toBe(-30);
    expect(slide?.pitchTransform?.zoom).toBe(1.5);
    expect(slide?.pitchTransform?.isLocked).toBe(true);
  });

  it('UPDATE_SLIDE_META updates yaw and preserves existing transform properties', () => {
    updatePitchTransform({
      panX: 10,
      panY: 20,
      zoom: 1.2,
      tilt: 30,
      yaw: 75,
    });

    const slide = getActiveSlide();

    expect(slide?.pitchTransform?.yaw).toBe(75);
    expect(slide?.pitchTransform?.tilt).toBe(30);
    expect(slide?.pitchTransform?.zoom).toBe(1.2);
    expect(slide?.pitchTransform?.panX).toBe(10);
    expect(slide?.pitchTransform?.panY).toBe(20);
  });

  it('CENTER_PITCH_AND_BOUNDARY resets yaw to 90 alongside tilt, pan, zoom', () => {
    updatePitchTransform({
      tilt: 45,
      yaw: 120,
      panX: 50,
      panY: -30,
      zoom: 1.5,
    });

    docStore.getState().dispatch({
      type: 'CENTER_PITCH_AND_BOUNDARY',
      phaseId,
      slideId,
    });

    const slide = getActiveSlide();

    expect(slide?.pitchTransform?.tilt).toBe(0);
    expect(slide?.pitchTransform?.yaw).toBe(90);
    expect(slide?.pitchTransform?.zoom).toBe(1);
    expect(slide?.pitchTransform?.panX).toBe(0);
    expect(slide?.pitchTransform?.panY).toBe(0);
  });

  it('buildExportMVPMatrix produces different matrices for yaw=90 vs yaw=75', () => {
    const matrixFront = buildExportMVPMatrix(
      { panX: 0, panY: 0, zoom: 1, tilt: 30, yaw: 90, isLocked: true },
      1920,
      1080,
      '16:9',
    );
    const matrixYaw75 = buildExportMVPMatrix(
      { panX: 0, panY: 0, zoom: 1, tilt: 30, yaw: 75, isLocked: true },
      1920,
      1080,
      '16:9',
    );

    // Matrix should be Float32Array (mat4)
    expect(matrixFront).toHaveLength(16);
    expect(matrixYaw75).toHaveLength(16);
    // Yaw differences should alter the transformation matrix
    expect(Array.from(matrixFront)).not.toEqual(Array.from(matrixYaw75));
  });

  it('ピッチのチルト角度を変更しても他スライドやプロジェクト設定は影響を受けない', () => {
    // Pitch tilted to 60°
    updatePitchTransform({ tilt: 60 });

    const slide = getActiveSlide();

    expect(slide?.pitchTransform?.tilt).toBe(60);
    expect(docStore.getState().project.version).toBe('3.0.0');
  });

  it('DUPLICATE_SLIDE でピッチの tilt 状態が正しく複製先に引き継がれる', () => {
    updatePitchTransform({
      tilt: 45,
      zoom: 1.8,
      panX: 100,
      panY: 50,
    });

    docStore.getState().dispatch({
      type: 'DUPLICATE_SLIDE',
      phaseId,
      slideId,
    });

    const slides =
      docStore.getState().project.phases.find((p) => p.id === phaseId)
        ?.slides ?? [];
    expect(slides.length).toBe(2);
    const duplicated = slides[1];
    expect(duplicated?.pitchTransform?.tilt).toBe(45);
    expect(duplicated?.pitchTransform?.zoom).toBe(1.8);
    expect(duplicated?.pitchTransform?.panX).toBe(100);
    expect(duplicated?.pitchTransform?.panY).toBe(50);
  });
});
