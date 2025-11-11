interface RectThumbnailProps {
  strokeColor?: string;
  backgroundColor?: string;
}

export function RectThumbnail({
  strokeColor = "#06b6d4",
  backgroundColor = "#1e293b",
}: RectThumbnailProps) {
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

      {/* 長方形フレーム */}
      <rect
        x="10"
        y="10"
        width="80"
        height="80"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        rx="4"
      />
    </svg>
  );
}
