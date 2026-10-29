import { describe, expect, it } from 'vitest';
import type { AspectRatio } from '@/lib/types/tactical-unified';
import {
  calculatePitchGeometryForAspect,
  PITCH_BOUNDARY_CONFIGS,
} from '../pitch-geometry';
import { generatePitchSvg, getPitchSvgDataUrl } from '../pitch-svg';

describe('pitch-svg generator', () => {
  const allRatios: AspectRatio[] = ['16:9', '9:16', '4:5', '1:1'];

  it('4種すべてのアスペクト比で正常にSVGマークアップを生成する', () => {
    for (const ratio of allRatios) {
      const svg = generatePitchSvg(ratio);
      const config = PITCH_BOUNDARY_CONFIGS[ratio];

      expect(svg).toBeDefined();
      expect(svg).toContain(`<svg viewBox="${config.viewBox}"`);
      expect(svg).toContain(`width="${config.widthPx}"`);
      expect(svg).toContain(`height="${config.heightPx}"`);
      expect(svg).toContain('</svg>');
    }
  });

  it('4種すべてのアスペクト比でセンターサークルが真円半径を維持して描画される', () => {
    for (const ratio of allRatios) {
      const geom = calculatePitchGeometryForAspect(ratio);
      const svg = generatePitchSvg(ratio);

      const rStr = geom.centerCircleRadius.toFixed(2);
      const cxStr = geom.centerX.toFixed(2);
      const cyStr = geom.centerY.toFixed(2);

      expect(svg).toContain(`cx="${cxStr}"`);
      expect(svg).toContain(`cy="${cyStr}"`);
      expect(svg).toContain(`r="${rStr}"`);
    }
  });

  it('デフォルト余白3%がピッチ外枠に正しく適用される', () => {
    for (const ratio of allRatios) {
      const geom = calculatePitchGeometryForAspect(ratio, 3.0);
      const svg = generatePitchSvg(ratio);

      const leftStr = geom.pitchLeft.toFixed(2);
      const topStr = geom.pitchTop.toFixed(2);
      const widthStr = geom.pitchWidth.toFixed(2);
      const heightStr = geom.pitchHeight.toFixed(2);

      expect(svg).toContain(
        `x="${leftStr}" y="${topStr}" width="${widthStr}" height="${heightStr}"`,
      );
    }
  });

  it('ペナルティエリア、ゴールエリア、ペナルティスポット、アーク等の幾何要素が含まれる', () => {
    for (const ratio of allRatios) {
      const svg = generatePitchSvg(ratio);
      expect(svg).toContain('<!-- Touchlines & Goal lines -->');
      expect(svg).toContain('<!-- Halfway Line -->');
      expect(svg).toContain('<!-- Center Circle & Spot -->');
      expect(svg).toContain('<!-- Penalty Areas -->');
      expect(svg).toContain('<!-- Goal Areas -->');
      expect(svg).toContain('<!-- Penalty Spots -->');
      expect(svg).toContain('<!-- Penalty Arcs -->');
      expect(svg).toContain('<!-- Corner Arcs -->');
    }
  });

  it('デフォルトでゴールド(#e2b48d)の枠線とベタ塗り黒(#000000)の背景で描画され、芝生ストライプを含まない', () => {
    const svg = generatePitchSvg('16:9');
    expect(svg).toContain('fill="#000000"');
    expect(svg).toContain('stroke="#e2b48d"');
    expect(svg).not.toContain('opacity="0.65"');
    expect(svg).not.toContain('#020617');
    expect(svg).not.toContain('#080e1e');
    expect(svg).not.toContain('#38bdf8');
  });

  it('grass オプションに関わらずベタ塗り黒(#000000)の背景となりストライプを含まない', () => {
    const withGrass = generatePitchSvg('16:9', { grass: true });
    expect(withGrass).toContain('fill="#000000"');
    expect(withGrass).not.toContain('opacity="0.65"');

    const withoutGrass = generatePitchSvg('16:9', { grass: false });
    expect(withoutGrass).toContain('fill="#000000"');
    expect(withoutGrass).not.toContain('opacity="0.65"');
  });

  it('getPitchSvgDataUrl が有効な data URL を生成・キャッシュする', () => {
    const url1 = getPitchSvgDataUrl('16:9');
    expect(url1.startsWith('data:image/svg+xml;utf8,')).toBe(true);

    const url2 = getPitchSvgDataUrl('16:9');
    expect(url1).toBe(url2);
  });

  it('onlyMarkings: true のとき背景黒矩形を描画せずマーキングのみ生成する', () => {
    const svgOnly = generatePitchSvg('16:9', { onlyMarkings: true });
    expect(svgOnly).not.toContain('fill="#000000"');
    expect(svgOnly).toContain('<!-- Touchlines & Goal lines -->');
    expect(svgOnly).toContain('<!-- Halfway Line -->');

    const defaultSvg = generatePitchSvg('16:9');
    expect(defaultSvg).toContain('fill="#000000"');
  });

  it('getCacheKey が onlyMarkings, strokeWidth, strokeOpacity を区別する', () => {
    const normalUrl = getPitchSvgDataUrl('16:9', { onlyMarkings: false });
    const markingsUrl = getPitchSvgDataUrl('16:9', { onlyMarkings: true });
    const thickLineUrl = getPitchSvgDataUrl('16:9', {
      onlyMarkings: true,
      strokeWidth: 6,
    });
    const opaqueLineUrl = getPitchSvgDataUrl('16:9', {
      onlyMarkings: true,
      strokeOpacity: 0.5,
    });

    expect(normalUrl).not.toBe(markingsUrl);
    expect(markingsUrl).not.toBe(thickLineUrl);
    expect(markingsUrl).not.toBe(opaqueLineUrl);
  });
});
