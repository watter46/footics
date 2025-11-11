interface GradientThumbnailProps {
  fromColor?: string;
  toColor?: string;
}

/**
 * Gradient Background Thumbnail
 * グラデーション背景のサムネイル
 *
 * #19163b
 * #0b5375
 * #e2b434ff
 */
export function GradientThumbnail({
  fromColor = "#161346",
  toColor = "#3f6a7e",
}: GradientThumbnailProps) {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id="gradientThumb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={fromColor} />
          <stop offset="100%" stopColor={toColor} />
        </linearGradient>
      </defs>

      {/* グラデーション背景 */}
      <rect width="100" height="100" fill="url(#gradientThumb)" />
    </svg>
  );
}
