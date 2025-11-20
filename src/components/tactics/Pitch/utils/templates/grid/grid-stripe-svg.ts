/**
 * grid用SVG文字列生成関数
 * @param patternColor - グリッドの色
 * @param patternOpacity - グリッドの透明度
 * @returns SVG文字列
 */
export function getGridStripeSVG(
  patternColor: string,
  patternOpacity: number
): string {
  const lineWidth = 1;
  const gridSize = 20;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <rect width="100" height="100" fill="transparent"/>
      <defs>
        <pattern id="grid" width="${gridSize}" height="${gridSize}" patternUnits="userSpaceOnUse">
          <rect width="${gridSize}" height="${gridSize}" fill="none" stroke="${patternColor}" stroke-width="${lineWidth}" opacity="${patternOpacity}"/>
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#grid)"/>
    </svg>
  `;
}
