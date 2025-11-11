interface HorizontalThumbnailProps {
  color?: string;
  patternColor?: string;
}

export function HorizontalThumbnail({
  color = "#10b981",
  patternColor = "#ffffff",
}: HorizontalThumbnailProps) {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* ベース色 */}
      <rect width="100" height="100" fill={color} />

      {/* 横3本線 */}
      <rect
        x="0"
        y="20"
        width="100"
        height="10"
        fill={patternColor}
        opacity="0.6"
      />
      <rect
        x="0"
        y="45"
        width="100"
        height="10"
        fill={patternColor}
        opacity="0.6"
      />
      <rect
        x="0"
        y="70"
        width="100"
        height="10"
        fill={patternColor}
        opacity="0.6"
      />
    </svg>
  );
}
