interface TiltedThumbnailProps {
  strokeColor?: string;
  backgroundColor?: string;
}

export function TiltedThumbnail({
  strokeColor = "#06b6d4",
  backgroundColor = "#1e293b",
}: TiltedThumbnailProps) {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      {/* 背景 */}
      <rect width="100" height="100" fill={backgroundColor} />

      {/* 台形フレーム */}
      <path
        d="M 20 10 L 80 10 L 90 90 L 10 90 Z"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
      />
    </svg>
  );
}
