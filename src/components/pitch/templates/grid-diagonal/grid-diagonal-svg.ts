/**
 * 斜め格子（太線・ずれた格子）SVGパターン生成関数
 * @param color 線の色
 * @param strokeWidth 線の太さ
 * @param spacing 格子の間隔
 * @param opacity 不透明度
 * @returns SVG文字列
 */
export function generateGridDiagonalPatternSVG({
  color = "#ff2e8b",
  strokeWidth = 8,
  spacing = 208,
  opacity = 0.7,
}: {
  color?: string;
  strokeWidth?: number;
  spacing?: number;
  opacity?: number;
} = {}): string {
  return `
<svg width="100%" height="100%" viewBox="0 0 ${spacing * 3} ${spacing * 3}" xmlns="http://www.w3.org/2000/svg">
  <g stroke-width="${strokeWidth}" stroke="${color}" fill="none" stroke-linecap="square" opacity="${opacity}">
    <line x1="0" y1="0" x2="${spacing}" y2="${spacing}" />
    <line x1="${spacing}" y1="0" x2="${spacing * 2}" y2="${spacing}" />
    <line x1="${spacing * 2}" y1="0" x2="${spacing * 3}" y2="${spacing}" />
    <line x1="${spacing * 3}" y1="0" x2="${spacing * 4}" y2="${spacing}" />

    <line x1="${spacing}" y1="${spacing}" x2="0" y2="${spacing * 2}" />
    <line x1="${spacing}" y1="${spacing}" x2="${spacing * 2}" y2="${spacing * 2}" />
    <line x1="${spacing * 3}" y1="${spacing}" x2="${spacing * 2}" y2="${spacing * 2}" />
    <line x1="${spacing * 3}" y1="${spacing}" x2="${spacing * 4}" y2="${spacing * 2}" />

    <line x1="${spacing}" y1="${spacing * 2}" x2="0" y2="${spacing * 3}" />
    <line x1="${spacing * 2}" y1="${spacing * 2}" x2="${spacing}" y2="${spacing * 3}" />
    <line x1="${spacing * 2}" y1="${spacing * 2}" x2="${spacing * 3}" y2="${spacing * 3}" />
    <line x1="${spacing * 3}" y1="${spacing * 2}" x2="${spacing * 4}" y2="${spacing * 3}" />

    <line x1="0" y1="${spacing * 3}" x2="${spacing}" y2="${spacing * 4}" />
    <line x1="${spacing}" y1="${spacing * 3}" x2="${spacing * 2}" y2="${spacing * 4}" />
    <line x1="${spacing * 3}" y1="${spacing * 3}" x2="${spacing * 2}" y2="${spacing * 4}" />
    <line x1="${spacing * 4}" y1="${spacing * 3}" x2="${spacing * 3}" y2="${spacing * 4}" />
  </g>
</svg>
`;
}
