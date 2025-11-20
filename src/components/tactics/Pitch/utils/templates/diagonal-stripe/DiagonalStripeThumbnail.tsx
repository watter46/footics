interface DiagonalStripeThumbnailProps {
  baseColor?: string;
  patternColor?: string;
  patternOpacity?: number;
}

/**
 * Diagonal Stripe Background Thumbnail
 * 斜めストライプ背景のサムネイル
 */
export function DiagonalStripeThumbnail({
  baseColor = "#0f213e",
  patternColor = "#145666",
  patternOpacity = 0.4,
}: DiagonalStripeThumbnailProps) {
  const stripeWidth = 14;
  const spacing = 28;

  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
    >
      <rect width="100" height="100" fill={baseColor} />
      <defs>
        <pattern
          id="diagonalStripeThumb"
          width={spacing}
          height={spacing}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect
            x="0"
            y="0"
            width={stripeWidth}
            height={spacing}
            fill={patternColor}
            opacity={patternOpacity}
          />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#diagonalStripeThumb)" />
    </svg>
  );
}
