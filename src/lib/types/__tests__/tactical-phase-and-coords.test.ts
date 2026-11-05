import { describe, expect, it } from 'vitest';
import {
  getFormationActualPos,
  getFormationActualPosVertical,
} from '@/lib/data/formations';
import {
  calculateNormalizedPitchBounds,
  getScreenOuterPitchRect,
  getScreenPitchBounds,
} from '@/lib/tactical/pitch-geometry';
import {
  createDefaultPhase,
  createDefaultProject,
  createDefaultSlide,
} from '@/lib/types/tactical/factory';
import { ensureTacticalProject } from '@/lib/types/tactical/migration';
import { transformCoord } from '@/lib/types/tactical/primitives';
import {
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_4_5,
  DEFAULT_BOUNDARY_BOX_16_9,
  X_MEDIA_PRESETS,
} from '@/lib/types/tactical/slide';

describe('Phase 1: TacticalPhase & Single Coordinate System', () => {
  describe('Default creation & factory', () => {
    it('creates default project with 4:5 and default boundaryBox', () => {
      const defaultBox = createXBoundaryBox('4:5', '4:5');
      const project = createDefaultProject('test-project');
      expect(project.aspectRatio).toBe('4:5');
      expect(project.boundaryBox).toEqual(defaultBox);
      expect(project.boundaryBox?.visible).toBe(false);

      const phase = project.phases[0];
      expect(phase.aspectRatio).toBe('4:5');
      expect(phase.boundaryBox).toEqual(defaultBox);
      expect(phase.boundaryBox?.visible).toBe(false);

      const slide = phase.slides[0];
      expect(slide.aspectRatio).toBe('4:5');
      expect(slide.boundaryBox).toEqual(defaultBox);
    });

    it('creates default phase with 4:5 and default boundaryBox', () => {
      const defaultBox = createXBoundaryBox('4:5', '4:5');
      const phase = createDefaultPhase('test-phase');
      expect(phase.aspectRatio).toBe('4:5');
      expect(phase.boundaryBox).toEqual(defaultBox);
      expect(phase.slides[0].aspectRatio).toBe('4:5');
      expect(phase.slides[0].boundaryBox).toEqual(defaultBox);
    });

    it('creates default slide with 4:5 and default boundaryBox', () => {
      const defaultBox = createXBoundaryBox('4:5', '4:5');
      const slide = createDefaultSlide(0);
      expect(slide.aspectRatio).toBe('4:5');
      expect(slide.boundaryBox).toEqual(defaultBox);
    });
  });

  describe('ensureTacticalProject normalization', () => {
    it('normalizes legacy project without phase aspectRatio/boundaryBox to 16:9', () => {
      const legacy = {
        id: 'legacy-p',
        phases: [
          {
            id: 'ph-1',
            name: 'Phase 1',
            slides: [
              {
                id: 'sl-1',
                index: 0,
                players: [],
                arrows: [],
                zones: [],
                texts: [],
                ball: { x: 50, y: 50, visible: true },
              },
            ],
          },
        ],
      };

      const normalized = ensureTacticalProject(legacy);
      expect(normalized.aspectRatio).toBe('16:9');
      expect(normalized.boundaryBox).toEqual(DEFAULT_BOUNDARY_BOX_16_9);
      expect(normalized.phases[0].aspectRatio).toBe('16:9');
      expect(normalized.phases[0].boundaryBox).toEqual(
        DEFAULT_BOUNDARY_BOX_16_9,
      );
    });

    it('falls back to slide aspectRatio and boundaryBox when phase level is missing', () => {
      const legacyWithSlideAspect = {
        id: 'legacy-p2',
        phases: [
          {
            id: 'ph-1',
            name: 'Phase 1',
            slides: [
              {
                id: 'sl-1',
                index: 0,
                aspectRatio: '4:5',
                boundaryBox: {
                  x: 10,
                  y: 10,
                  width: 80,
                  height: 80,
                  enabled: true,
                  visible: true,
                },
                players: [],
                arrows: [],
                zones: [],
                texts: [],
                ball: { x: 50, y: 50, visible: true },
              },
            ],
          },
        ],
      };

      const normalized = ensureTacticalProject(legacyWithSlideAspect);
      expect(normalized.phases[0].aspectRatio).toBe('4:5');
      expect(normalized.phases[0].boundaryBox).toEqual({
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
        visible: true,
      });
      expect(normalized.aspectRatio).toBe('4:5');
      expect(normalized.boundaryBox).toEqual({
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
        visible: true,
      });
    });
  });

  describe('Pitch Bounds & Geometry in 16:9 screen', () => {
    it('calculates screen outer pitch rect correctly', () => {
      const r169 = getScreenOuterPitchRect('16:9');
      expect(r169).toEqual({ left: 0, top: 0, width: 100, height: 100 });

      const r45 = getScreenOuterPitchRect('4:5');
      expect(r45.height).toBe(100);
      expect(r45.top).toBe(0);
      expect(r45.width).toBeCloseTo(45, 1);
      expect(r45.left).toBeCloseTo(27.5, 1);

      const r916 = getScreenOuterPitchRect('9:16');
      expect(r916.height).toBe(100);
      expect(r916.top).toBe(0);
      expect(r916.width).toBeCloseTo((9 / 16 / (16 / 9)) * 100, 1);
      expect(r916.left).toBeCloseTo((100 - (9 / 16 / (16 / 9)) * 100) / 2, 1);

      const r11 = getScreenOuterPitchRect('1:1');
      expect(r11.height).toBe(100);
      expect(r11.top).toBe(0);
      expect(r11.width).toBeCloseTo((1 / (16 / 9)) * 100, 1);
      expect(r11.left).toBeCloseTo((100 - (1 / (16 / 9)) * 100) / 2, 1);
    });

    it('calculates screen pitch bounds with margin', () => {
      const b169 = getScreenPitchBounds('16:9');
      expect(b169.isHorizontal).toBe(true);
      expect(b169.xMin).toBe(3);
      expect(b169.xMax).toBe(97);
      expect(b169.xSpan).toBe(94);
      expect(b169.xMid).toBe(50);
      expect(b169.yMin).toBe(3);
      expect(b169.yMax).toBe(97);
      expect(b169.ySpan).toBe(94);
      expect(b169.yMid).toBe(50);

      const b45 = getScreenPitchBounds('4:5');
      expect(b45.isHorizontal).toBe(false);
      expect(b45.xMid).toBeCloseTo(50, 1);
      expect(b45.yMin).toBe(3);
      expect(b45.yMax).toBe(97);
      expect(b45.ySpan).toBe(94);
      expect(b45.xMin).toBeCloseTo(27.5 + 45 * 0.03, 1);
      expect(b45.xMax).toBeCloseTo(27.5 + 45 * 0.97, 1);
    });
  });

  describe('Formation coordinates calculation', () => {
    it('calculates horizontal (16:9) formation positions (Home left, Away right)', () => {
      const bounds = calculateNormalizedPitchBounds();
      // Home GK (top=100, left=50) -> x ≈ xMin, y ≈ yMid
      const homeGK = getFormationActualPos(100, 50, false, '16:9');
      expect(homeGK.x).toBeCloseTo(bounds.xMin, 1);
      expect(homeGK.y).toBeCloseTo(bounds.yMid, 1);

      // Home FW (top=0, left=50) -> x ≈ xMax (in full mode), y ≈ yMid
      const homeFW = getFormationActualPos(0, 50, false, '16:9');
      expect(homeFW.x).toBeCloseTo(bounds.xMax, 1);
      expect(homeFW.y).toBeCloseTo(bounds.yMid, 1);

      // Away GK (top=100, left=50) -> x ≈ xMax, y ≈ yMid
      const awayGK = getFormationActualPos(100, 50, true, '16:9');
      expect(awayGK.x).toBeCloseTo(bounds.xMax, 1);
      expect(awayGK.y).toBeCloseTo(bounds.yMid, 1);

      // Away FW (top=0, left=50) -> x ≈ xMin, y ≈ yMid
      const awayFW = getFormationActualPos(0, 50, true, '16:9');
      expect(awayFW.x).toBeCloseTo(bounds.xMin, 1);
      expect(awayFW.y).toBeCloseTo(bounds.yMid, 1);
    });

    it('calculates vertical (4:5) formation positions (Home bottom, Away top)', () => {
      const bounds = calculateNormalizedPitchBounds();
      // Home GK (top=100, left=50) -> x ≈ xMid, y ≈ yMax
      const homeGK = getFormationActualPos(100, 50, false, '4:5');
      expect(homeGK.x).toBeCloseTo(bounds.xMid, 1);
      expect(homeGK.y).toBeCloseTo(bounds.yMax, 1);

      // Home FW (top=0, left=50) -> x ≈ xMid, y ≈ yMin
      const homeFW = getFormationActualPos(0, 50, false, '4:5');
      expect(homeFW.x).toBeCloseTo(bounds.xMid, 1);
      expect(homeFW.y).toBeCloseTo(bounds.yMin, 1);

      // Away GK (top=100, left=50) -> x ≈ xMid, y ≈ yMin
      const awayGK = getFormationActualPos(100, 50, true, '4:5');
      expect(awayGK.x).toBeCloseTo(bounds.xMid, 1);
      expect(awayGK.y).toBeCloseTo(bounds.yMin, 1);

      // Away FW (top=0, left=50) -> x ≈ xMid, y ≈ yMax
      const awayFW = getFormationActualPos(0, 50, true, '4:5');
      expect(awayFW.x).toBeCloseTo(bounds.xMid, 1);
      expect(awayFW.y).toBeCloseTo(bounds.yMax, 1);
    });

    it('places wide players near pitch edges without shrink in 4:5', () => {
      // left=10 -> x ≈ 12.4, left=90 -> x ≈ 87.6
      const leftWinger = getFormationActualPos(50, 10, false, '4:5');
      const rightWinger = getFormationActualPos(50, 90, false, '4:5');
      expect(leftWinger.x).toBeCloseTo(12.4, 1);
      expect(rightWinger.x).toBeCloseTo(87.6, 1);
    });

    it('delegates getFormationActualPosVertical to 4:5', () => {
      const pos1 = getFormationActualPosVertical(0, 50, false);
      const pos2 = getFormationActualPos(0, 50, false, '4:5');
      expect(pos1.x).toBeCloseTo(pos2.x, 2);
      expect(pos1.y).toBeCloseTo(pos2.y, 2);
    });
  });

  describe('transformCoord round-trip and clamp options', () => {
    it('preserves coordinate on round-trip between 16:9 and 4:5', () => {
      const orig = { x: 30, y: 40 };
      const to45 = transformCoord(orig, '16:9', '4:5');
      const back169 = transformCoord(to45, '4:5', '16:9');
      expect(back169.x).toBeCloseTo(orig.x, 1);
      expect(back169.y).toBeCloseTo(orig.y, 1);
    });

    it('preserves normalized coordinates across vertical aspect ratios (4:5 <-> 9:16 <-> 1:1)', () => {
      const point = { x: 15, y: 80 };
      const to916 = transformCoord(point, '4:5', '9:16');
      expect(to916.x).toBeCloseTo(15, 2);
      expect(to916.y).toBeCloseTo(80, 2);

      const to11 = transformCoord(to916, '9:16', '1:1');
      expect(to11.x).toBeCloseTo(15, 2);
      expect(to11.y).toBeCloseTo(80, 2);

      const back45 = transformCoord(to11, '1:1', '4:5');
      expect(back45.x).toBeCloseTo(15, 2);
      expect(back45.y).toBeCloseTo(80, 2);
    });

    it('transforms tactical coordinates between 16:9 and 4:5 without width compression', () => {
      const leftWinger169 = { x: 50, y: 3 };
      const converted45 = transformCoord(leftWinger169, '16:9', '4:5');
      expect(converted45.x).toBeCloseTo(97, 1);
      expect(converted45.y).toBeCloseTo(50, 1);

      const rightWinger169 = { x: 50, y: 97 };
      const converted45RW = transformCoord(rightWinger169, '16:9', '4:5');
      expect(converted45RW.x).toBeCloseTo(3, 1);
      expect(converted45RW.y).toBeCloseTo(50, 1);
    });

    it('does not clamp coordinates when clamp is false', () => {
      const outOfBounds = { x: -10, y: 120 };
      const converted = transformCoord(outOfBounds, '16:9', '4:5', {
        clamp: false,
      });
      // Should not be clamped to [0, 100]
      expect(
        converted.x < 0 ||
          converted.x > 100 ||
          converted.y < 0 ||
          converted.y > 100,
      ).toBe(true);

      const back = transformCoord(converted, '4:5', '16:9', { clamp: false });
      expect(back.x).toBeCloseTo(outOfBounds.x, 1);
      expect(back.y).toBeCloseTo(outOfBounds.y, 1);
    });

    it('clamps coordinates by default or when clamp is true', () => {
      const outOfBounds = { x: -10, y: 120 };
      const converted = transformCoord(outOfBounds, '16:9', '4:5');
      expect(converted.x).toBeGreaterThanOrEqual(0);
      expect(converted.x).toBeLessThanOrEqual(100);
      expect(converted.y).toBeGreaterThanOrEqual(0);
      expect(converted.y).toBeLessThanOrEqual(100);
    });
  });

  describe('XMediaPresets and square_1_1', () => {
    it('has square_1_1 preset defined', () => {
      expect(X_MEDIA_PRESETS.square_1_1).toBeDefined();
      expect(X_MEDIA_PRESETS.square_1_1.ratio).toBe('1:1');
    });

    it('calculates 1:1 boundary box centered on 16:9 canvas', () => {
      const box = createXBoundaryBox('1:1', '16:9');
      expect(box.height).toBe(100);
      expect(box.y).toBe(0);
      const expectedWidth = (1 / (16 / 9)) * 100; // 56.25
      expect(box.width).toBeCloseTo(expectedWidth, 1);
      expect(box.x).toBeCloseTo((100 - expectedWidth) / 2, 1);
    });
  });
});
