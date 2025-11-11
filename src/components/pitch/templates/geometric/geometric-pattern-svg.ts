/**
 * geometric用SVG文字列生成関数
 * @param patternColor - パターンの色
 * @param patternOpacity - パターンの透明度
 * @returns SVG文字列
 */
export function getGeometricPatternSVG(
  patternColor: string,
  patternOpacity: number
): string {
  const size = 40;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <rect width="100" height="100" fill="transparent"/>
      <defs>
        <pattern id="geometric" width="${size}" height="${size}" patternUnits="userSpaceOnUse">
          <polygon points="${size / 2},0 ${size},${size / 2} ${size / 2},${size} 0,${size / 2}" 
                   fill="none" stroke="${patternColor}" stroke-width="1" opacity="${patternOpacity}"/>
          <line x1="0" y1="0" x2="${size}" y2="${size}" stroke="${patternColor}" stroke-width="1" opacity="${patternOpacity * 0.5}"/>
          <line x1="${size}" y1="0" x2="0" y2="${size}" stroke="${patternColor}" stroke-width="1" opacity="${patternOpacity * 0.5}"/>
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#geometric)"/>
    </svg>
  `;
}
