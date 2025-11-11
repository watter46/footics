interface GridThumbnailProps {
  baseColor?: string;
  patternColor?: string;
  patternOpacity?: number;
}

/**
 * Grid Background Thumbnail
 * グリッド背景のサムネイル
 */
export function GridThumbnail({
  baseColor = "#0f213e",
  patternColor = "#145666",
  patternOpacity = 1,
}: GridThumbnailProps) {
  const lineWidth = 1;
  const gridSize = 20;

  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <rect width="100" height="100" fill={baseColor} />
      <defs>
        <pattern
          id="gridThumb"
          width={gridSize}
          height={gridSize}
          patternUnits="userSpaceOnUse"
        >
          <rect
            width={gridSize}
            height={gridSize}
            fill="none"
            stroke={patternColor}
            strokeWidth={lineWidth}
            opacity={patternOpacity}
          />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#gridThumb)" />
    </svg>
  );
}
