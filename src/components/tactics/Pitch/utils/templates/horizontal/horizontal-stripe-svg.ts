/**
 * horizontal-stripe用SVG文字列生成関数
 * @param patternColor - ストライプの色
 * @param patternOpacity - ストライプの透明度
 * @returns SVG文字列
 */
export function getHorizontalStripeSVG(
  patternColor: string,
  patternOpacity: number
): string {
  const stripeHeight = 11;
  const totalHeight = 100;
  const numStripes = 4;
  const numGaps = numStripes + 1;
  const gapHeight = (totalHeight - stripeHeight * numStripes) / numGaps;

  const y1 = gapHeight;
  const y2 = gapHeight * 2 + stripeHeight;
  const y3 = gapHeight * 3 + stripeHeight * 2;
  const y4 = gapHeight * 4 + stripeHeight * 3;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <rect width="100" height="100" fill="transparent"/>
      <rect y="${y1}" width="100" height="${stripeHeight}" fill="${patternColor}" opacity="${patternOpacity}" />
      <rect y="${y2}" width="100" height="${stripeHeight}" fill="${patternColor}" opacity="${patternOpacity}" />
      <rect y="${y3}" width="100" height="${stripeHeight}" fill="${patternColor}" opacity="${patternOpacity}" />
      <rect y="${y4}" width="100" height="${stripeHeight}" fill="${patternColor}" opacity="${patternOpacity}" />
    </svg>
  `;
}
