interface GeometricThumbnailProps {
  baseColor?: string;
  patternColor?: string;
  patternOpacity?: number;
}

/**
 * Geometric Pattern Background Thumbnail
 * 幾何学パターン背景のサムネイル
 */
export function GeometricThumbnail({
  baseColor = "#0f213e",
  patternColor = "#145666",
  patternOpacity = 0.4,
}: GeometricThumbnailProps) {
  const size = 40;

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
          id="geometricThumb"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
        >
          <polygon
            points={`${size / 2},0 ${size},${size / 2} ${size / 2},${size} 0,${size / 2}`}
            fill="none"
            stroke={patternColor}
            strokeWidth="1"
            opacity={patternOpacity}
          />
          <line
            x1="0"
            y1="0"
            x2={size}
            y2={size}
            stroke={patternColor}
            strokeWidth="1"
            opacity={patternOpacity * 0.5}
          />
          <line
            x1={size}
            y1="0"
            x2="0"
            y2={size}
            stroke={patternColor}
            strokeWidth="1"
            opacity={patternOpacity * 0.5}
          />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#geometricThumb)" />
    </svg>
  );
}
