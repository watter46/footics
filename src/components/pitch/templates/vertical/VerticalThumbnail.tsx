interface VerticalThumbnailProps {
  color?: string;
  patternColor?: string;
}

export function VerticalThumbnail({
  color = "#10b981",
  patternColor = "#ffffff",
}: VerticalThumbnailProps) {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
    >
      {/* ベース色 */}
      <rect width="100" height="100" fill={color} />

      {/* 縦3本線 */}
      <rect
        x="20"
        y="0"
        width="10"
        height="100"
        fill={patternColor}
        opacity="0.6"
      />
      <rect
        x="45"
        y="0"
        width="10"
        height="100"
        fill={patternColor}
        opacity="0.6"
      />
      <rect
        x="70"
        y="0"
        width="10"
        height="100"
        fill={patternColor}
        opacity="0.6"
      />
    </svg>
  );
}
