/**
 * 多角形タイル（Polygon Tile）SVGパターン生成関数
 * 中央部分を切り出してrepeatで軽量化
 * @param color 線の色
 * @param strokeWidth 線の太さ
 * @param opacity 不透明度
 * @returns SVG文字列
 */
export function generatePolygonTileSVG({
  color = "#3b73b9",
  strokeWidth = 3.5,
  opacity = 0.8,
}: {
  color?: string;
  strokeWidth?: number;
  opacity?: number;
} = {}): string {
  return `
<svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="polygonTile" patternUnits="userSpaceOnUse" width="200" height="200">
      <g shape-rendering="crispEdges" stroke-linejoin="round" fill="none" stroke-width="${strokeWidth}" stroke="${color}" opacity="${opacity}">
        <polygon points="100,0 100,50 50,50" />
        <polygon points="50,50 50,0 0,50" />
        <polygon points="50,50 0,50 0,100" />
        <polygon points="100,100 50,50 100,50" />
        <polygon points="150,50 200,50 150,100" />
        <polygon points="100,50 150,50 150,0" />
        <polygon points="150,0 200,0 150,50" />
        <polygon points="200,100 150,100 200,50" />
        <polygon points="100,100 100,150 50,150" />
        <polygon points="0,100 50,100 0,150" />
        <polygon points="50,150 50,100 100,150" />
        <polygon points="50,150 0,150 0,200" />
        <polygon points="100,150 100,200 50,200" />
        <polygon points="150,150 200,150 150,100" />
        <polygon points="150,150 100,150 150,100" />
        <polygon points="150,150 150,200 100,200" />
        <polygon points="200,200 200,150 150,200" />
      </g>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#polygonTile)" />
</svg>
`;
}
