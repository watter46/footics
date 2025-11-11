/**
 * vertical-stripe用SVG文字列生成関数
 * @param patternColor - ストライプの色
 * @param patternOpacity - ストライプの透明度
 * @returns SVG文字列
 */
export function getVerticalStripeSVG(
  patternColor: string,
  patternOpacity: number
): string {
  const stripeWidth = 14;
  const totalWidth = 100;
  const numStripes = 3;
  const numGaps = numStripes + 1;
  const gapWidth = (totalWidth - stripeWidth * numStripes) / numGaps;

  const x1 = gapWidth;
  const x2 = gapWidth * 2 + stripeWidth;
  const x3 = gapWidth * 3 + stripeWidth * 2;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <rect width="100" height="100" fill="transparent"/>
      <rect x="${x1}" y="0" width="${stripeWidth}" height="100" fill="${patternColor}" opacity="${patternOpacity}" />
      <rect x="${x2}" y="0" width="${stripeWidth}" height="100" fill="${patternColor}" opacity="${patternOpacity}" />
      <rect x="${x3}" y="0" width="${stripeWidth}" height="100" fill="${patternColor}" opacity="${patternOpacity}" />
    </svg>
  `;
}
