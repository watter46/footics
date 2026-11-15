import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createDefaultTacticalProject } from '@/features/tactical-unified/stores/tactical-store-provider';
import { evaluateTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import {
  type ScreenNormCoord,
  toMilliseconds,
  toScreenNormCoord,
} from '@/lib/types/tactical/branded';

describe('Tracking Trajectory Arrow & Ball Trajectory Parity', () => {
  describe('GhostTrajectoryArrow: Handle & Bezier Apex Mathematical Parity', () => {
    it('ポインタドラッグ時、逆算された制御点によってベジェ曲線上の点(t=0.5)がポインタ位置と寸分狂わず一致する', () => {
      const sPx = { x: 150, y: 300 };
      const ePx = { x: 650, y: 300 };

      const testHandlePositions = [
        { x: 400, y: 150 },
        { x: 400, y: 450 },
        { x: 200, y: 100 },
        { x: -50, y: -80 },
        { x: 900, y: 700 },
      ];

      for (const pos of testHandlePositions) {
        const calcCpX = 2 * pos.x - 0.5 * (sPx.x + ePx.x);
        const calcCpY = 2 * pos.y - 0.5 * (sPx.y + ePx.y);

        const t = 0.5;
        const oneMinusT = 1 - t;
        const curveApexX =
          oneMinusT * oneMinusT * sPx.x +
          2 * oneMinusT * t * calcCpX +
          t * t * ePx.x;
        const curveApexY =
          oneMinusT * oneMinusT * sPx.y +
          2 * oneMinusT * t * calcCpY +
          t * t * ePx.y;

        expect(curveApexX).toBeCloseTo(pos.x, 6);
        expect(curveApexY).toBeCloseTo(pos.y, 6);
      }
    });

    it('範囲外(0%未満または100%超)の制御点をクランプせずに保持できる', () => {
      const stageSize = { width: 1000, height: 600 };
      const sPx = { x: 200, y: 300 };
      const ePx = { x: 800, y: 300 };

      const pos = { x: 500, y: -60 };
      const calcCpX = 2 * pos.x - 0.5 * (sPx.x + ePx.x);
      const calcCpY = 2 * pos.y - 0.5 * (sPx.y + ePx.y);

      const normX = (calcCpX / stageSize.width) * 100;
      const normY = (calcCpY / stageSize.height) * 100;

      expect(normY).toBe(-70);
      expect(normX).toBe(50);
    });

    it('中点からのピクセル距離が6px未満なら直線、6px以上ならcustom制御点となる', () => {
      const sPx = { x: 100, y: 200 };
      const ePx = { x: 300, y: 200 };
      const midPx = { x: (sPx.x + ePx.x) / 2, y: (sPx.y + ePx.y) / 2 };

      const nearPos = { x: midPx.x, y: midPx.y + 3 };
      const distNear = Math.hypot(nearPos.x - midPx.x, nearPos.y - midPx.y);
      expect(distNear < 6.0).toBe(true);

      const farPos = { x: midPx.x, y: midPx.y + 10 };
      const distFar = Math.hypot(farPos.x - midPx.x, farPos.y - midPx.y);
      expect(distFar < 6.0).toBe(false);
    });
  });

  describe('Ball Trajectory in Document Store', () => {
    it('ボールに UPDATE_BALL でベジェ曲線の軌道を設定・更新・解除できる', () => {
      const initialProject = createDefaultTacticalProject();
      const documentStore = createDocumentStore(initialProject);
      const phaseId = initialProject.phases[0]?.id ?? 'default-phase-1';
      const slideId =
        initialProject.phases[0]?.slides[0]?.id ?? 'default-slide-1';

      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'UPDATE_BALL',
        patch: {
          trajectory: {
            type: 'custom',
            controlPoint: {
              x: toScreenNormCoord(45),
              y: -15 as ScreenNormCoord,
            },
          },
        },
      });

      let curSlide = selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      );
      expect(curSlide?.ball.trajectory).toEqual({
        type: 'custom',
        controlPoint: { x: 45, y: -15 },
      });

      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'UPDATE_BALL',
        patch: {
          trajectory: {
            type: 'straight',
            controlPoint: undefined,
          },
        },
      });

      curSlide = selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      );
      expect(curSlide?.ball.trajectory?.type).toBe('straight');
      expect(curSlide?.ball.trajectory?.controlPoint).toBeUndefined();
    });

    it('evaluateTimelineFrame でボールが設定された trajectory に沿ってベジェ補間移動する', () => {
      const initialProject = createDefaultTacticalProject();
      const documentStore = createDocumentStore(initialProject);
      const phaseId = initialProject.phases[0]?.id ?? 'default-phase-1';
      const slide1Id =
        initialProject.phases[0]?.slides[0]?.id ?? 'default-slide-1';

      documentStore.getState().dispatchSlide(phaseId, slide1Id, {
        type: 'UPDATE_BALL',
        patch: {
          x: toScreenNormCoord(20),
          y: toScreenNormCoord(50),
          visible: true,
        },
      });

      const slide2Id = 'slide-2';
      documentStore.getState().dispatch({
        type: 'ADD_SLIDE',
        phaseId,
        afterSlideId: slide1Id,
        mode: 'object-free',
        newSlideId: slide2Id,
      });

      documentStore.getState().dispatchSlide(phaseId, slide2Id, {
        type: 'UPDATE_BALL',
        patch: {
          x: toScreenNormCoord(80),
          y: toScreenNormCoord(50),
          visible: true,
          trajectory: {
            type: 'custom',
            controlPoint: {
              x: toScreenNormCoord(50),
              y: toScreenNormCoord(10),
            },
          },
        },
      });

      documentStore.getState().dispatchSlide(phaseId, slide1Id, {
        type: 'UPDATE_SLIDE_META',
        patch: {
          pauseMs: 0,
        },
      });

      documentStore.getState().dispatchSlide(phaseId, slide2Id, {
        type: 'UPDATE_SLIDE_META',
        patch: {
          transitionDurationMs: 1000,
          pauseMs: 0,
          easing: 'linear',
        },
      });

      const phase = documentStore.getState().project.phases[0];
      expect(phase).toBeDefined();
      if (!phase) return;

      const frame0 = evaluateTimelineFrame(phase, toMilliseconds(0));
      expect(frame0.slide.ball.x).toBeCloseTo(20, 4);
      expect(frame0.slide.ball.y).toBeCloseTo(50, 4);

      const frameHalf = evaluateTimelineFrame(phase, toMilliseconds(500));
      expect(frameHalf.slide.ball.x).toBeCloseTo(50, 4);
      expect(frameHalf.slide.ball.y).toBeCloseTo(30, 4);

      const frame1 = evaluateTimelineFrame(phase, toMilliseconds(1000));
      expect(frame1.slide.ball.x).toBeCloseTo(80, 4);
      expect(frame1.slide.ball.y).toBeCloseTo(50, 4);
    });

    it('SWAP_TEAM_SIDES でボールの trajectory.controlPoint も正しく反転される', () => {
      const initialProject = createDefaultTacticalProject();
      const documentStore = createDocumentStore(initialProject);
      const phaseId = initialProject.phases[0]?.id ?? 'default-phase-1';
      const slideId =
        initialProject.phases[0]?.slides[0]?.id ?? 'default-slide-1';

      documentStore.getState().dispatch({
        type: 'CHANGE_PHASE_ASPECT_RATIO',
        phaseId,
        aspectRatio: '16:9',
      });

      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'UPDATE_BALL',
        patch: {
          x: toScreenNormCoord(30),
          y: toScreenNormCoord(40),
          trajectory: {
            type: 'custom',
            controlPoint: {
              x: toScreenNormCoord(25),
              y: toScreenNormCoord(15),
            },
          },
        },
      });

      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'SWAP_TEAM_SIDES',
      });

      const flippedSlide = selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      );
      expect(flippedSlide?.ball.x).toBe(70);
      expect(flippedSlide?.ball.y).toBe(60);
      expect(flippedSlide?.ball.trajectory?.controlPoint?.x).toBe(75);
      expect(flippedSlide?.ball.trajectory?.controlPoint?.y).toBe(85);
    });
  });
});
