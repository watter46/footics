interface DeepThumbnailProps {
  strokeColor?: string;
  backgroundColor?: string;
}

export function DeepThumbnail({
  strokeColor = "#06b6d4",
  backgroundColor = "#1e293b",
}: DeepThumbnailProps) {
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

      {/* カスタム3Dフレーム */}
      <path
        d="M 30 5 L 70 5 L 95 95 L 5 95 Z"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
      />
    </svg>
  );
}
