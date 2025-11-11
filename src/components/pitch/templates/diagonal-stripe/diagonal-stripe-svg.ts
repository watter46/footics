/**
 * diagonal-stripe用SVG文字列生成関数
 * @param patternColor - ストライプの色
 * @param patternOpacity - ストライプの透明度
 * @returns SVG文字列
 */
export function getDiagonalStripeSVG(
  patternColor: string,
  patternOpacity: number
): string {
  const stripeWidth = 14;
  const spacing = 28;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <rect width="100" height="100" fill="transparent"/>
      <defs>
        <pattern id="diagonalStripe" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect x="0" y="0" width="${stripeWidth}" height="${spacing}" fill="${patternColor}" opacity="${patternOpacity}"/>
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#diagonalStripe)"/>
    </svg>
  `;
}
