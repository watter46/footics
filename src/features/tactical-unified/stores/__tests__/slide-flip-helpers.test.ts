import { describe, expect, it } from 'vitest';
import {
  createDefaultPlayer,
  createDefaultSlide,
} from '@/lib/types/tactical-unified';
import { flipSlideObjects, isVerticalPitch } from '../slide-flip-helpers';

describe('slide-flip-helpers', () => {
  describe('isVerticalPitch', () => {
    it('returns true for 9:16, 4:5, and 1:1', () => {
      expect(isVerticalPitch('9:16')).toBe(true);
      expect(isVerticalPitch('4:5')).toBe(true);
      expect(isVerticalPitch('1:1')).toBe(true);
    });

    it('returns false for 16:9, 4:3, etc.', () => {
      expect(isVerticalPitch('16:9')).toBe(false);
      expect(isVerticalPitch('4:3')).toBe(false);
      expect(isVerticalPitch(null)).toBe(false);
      expect(isVerticalPitch(undefined)).toBe(false);
    });
  });

  describe('flipSlideObjects', () => {
    it('flips pitch players, ball, arrow, zone, text by 180deg point reflection (100 - x, 100 - y) regardless of vertical/horizontal', () => {
      const slide = createDefaultSlide(0, 's1');
      const pitchPlayer = createDefaultPlayer('home', 30, 20, '#034694');
      pitchPlayer.trajectory = {
        type: 'custom',
        controlPoint: { x: 35, y: 25 },
      };
      const benchPlayer = createDefaultPlayer('home', 20, 14, '#034694');
      benchPlayer.area = 'bench';

      slide.players = [pitchPlayer, benchPlayer];
      slide.ball = {
        x: 50,
        y: 15,
        visible: true,
        trajectory: {
          type: 'custom',
          controlPoint: { x: 45, y: 10 },
        },
      };
      slide.arrows = [
        {
          id: 'arrow-1',
          annotationType: 'arrow',
          arrowType: 'pass',
          curveType: 'straight',
          points: [
            { x: 20, y: 30 },
            { x: 40, y: 60 },
          ],
          controlPoint: { x: 30, y: 45 },
          color: '#ffffff',
          strokeWidth: 2,
          dashArray: [],
          arrowHead: true,
        },
      ];
      slide.zones = [
        {
          id: 'zone-1',
          annotationType: 'zone',
          zoneType: 'highlight',
          shapeType: 'rect',
          x: 10,
          y: 20,
          width: 30,
          height: 40,
          points: [
            { x: 10, y: 20 },
            { x: 40, y: 60 },
          ],
          color: '#f59e0b',
          opacity: 0.25,
          strokeWidth: 0,
        },
      ];
      slide.texts = [
        {
          id: 'text-1',
          annotationType: 'text',
          x: 25,
          y: 35,
          content: 'Tactics',
          fontSize: 14,
          color: '#ffffff',
          bold: false,
          italic: false,
        },
      ];
      slide.isSidesSwapped = false;

      // 1. 横ピッチでの反転
      const flipped = flipSlideObjects(slide, false);

      expect(flipped.isSidesSwapped).toBe(true);

      // ピッチ選手は 100 - x, 100 - y
      expect(flipped.players[0].x).toBe(70); // 100 - 30
      expect(flipped.players[0].y).toBe(80); // 100 - 20
      expect(flipped.players[0].trajectory?.controlPoint).toEqual({
        x: 65,
        y: 75,
      });

      // ベンチ選手は反転対象外（元の座標のまま）
      expect(flipped.players[1].x).toBe(20);
      expect(flipped.players[1].y).toBe(14);
      expect(flipped.players[1].area).toBe('bench');

      // ボール
      expect(flipped.ball.x).toBe(50); // 100 - 50
      expect(flipped.ball.y).toBe(85); // 100 - 15
      expect(flipped.ball.trajectory?.controlPoint).toEqual({ x: 55, y: 90 });

      // 矢印
      expect(flipped.arrows[0].points).toEqual([
        { x: 80, y: 70 },
        { x: 60, y: 40 },
      ]);
      expect(flipped.arrows[0].controlPoint).toEqual({ x: 70, y: 55 });

      // ゾーン: x' = 100 - (10 + 30) = 60, y' = 100 - (20 + 40) = 40
      expect(flipped.zones[0].x).toBe(60);
      expect(flipped.zones[0].y).toBe(40);
      expect(flipped.zones[0].points).toEqual([
        { x: 90, y: 80 },
        { x: 60, y: 40 },
      ]);

      // テキスト
      expect(flipped.texts[0].x).toBe(75);
      expect(flipped.texts[0].y).toBe(65);

      // 2. もう一度反転すると isSidesSwapped が false に戻り、元に戻る
      const flippedBack = flipSlideObjects(flipped, false);
      expect(flippedBack.isSidesSwapped).toBe(false);
      expect(flippedBack.players[0].x).toBe(30);
      expect(flippedBack.players[0].y).toBe(20);
    });

    it('flips symmetrically by 180deg when isVertical is true as well', () => {
      const slide = createDefaultSlide(0, 's1');
      slide.players = [createDefaultPlayer('home', 30, 20, '#034694')];
      slide.ball = { x: 50, y: 15, visible: true };

      const flipped = flipSlideObjects(slide, true);

      expect(flipped.players[0].x).toBe(70); // 100 - 30
      expect(flipped.players[0].y).toBe(80); // 100 - 20
      expect(flipped.ball.x).toBe(50); // 100 - 50
      expect(flipped.ball.y).toBe(85); // 100 - 15
      expect(flipped.isSidesSwapped).toBe(true);
    });
  });
});
