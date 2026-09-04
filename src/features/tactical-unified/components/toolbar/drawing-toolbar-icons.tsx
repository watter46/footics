'use client';

/**
 * drawing-toolbar-icons.tsx
 * Custom SVG icons for the drawing toolbar
 */

export function StraightLineIcon({
  size = 16,
  className,
}: {
  size?: number | string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="3" y1="19" x2="21" y2="5" />
    </svg>
  );
}

export function RouteLineIcon({
  size = 16,
  className,
}: {
  size?: number | string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="6" y1="18" x2="18" y2="6" />
      <circle
        cx="5"
        cy="19"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="19"
        cy="5"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function DashedArrowIcon({
  size = 16,
  className,
}: {
  size?: number | string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12H22" strokeDasharray="3.5 2.5" />
      <path d="M18 8L22 12L18 16" />
    </svg>
  );
}

export function WavyArrowIcon({
  size = 16,
  className,
}: {
  size?: number | string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12 C 5 7, 7 17, 10 12 C 13 7, 15 17, 18 12 H 22" />
      <path d="M18 8L22 12L18 16" />
    </svg>
  );
}

export function CustomPolygonZoneIcon({
  size = 16,
  className,
}: {
  size?: number | string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon
        points="4 7 17 4 20 16 7 19"
        strokeWidth={1.75}
        fill="currentColor"
        fillOpacity={0.15}
      />
      <circle cx="4" cy="7" r="1.5" fill="currentColor" />
      <circle cx="17" cy="4" r="1.5" fill="currentColor" />
      <circle cx="20" cy="16" r="1.5" fill="currentColor" />
      <circle cx="7" cy="19" r="1.5" fill="currentColor" />
      <path
        d="M12 9l3 3-5 5-2-1 1-2 3-5z"
        strokeWidth={1.2}
        fill="currentColor"
        fillOpacity={0.25}
      />
    </svg>
  );
}

export function RingMarkerIcon({
  size = 16,
  className,
}: {
  size?: number | string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <ellipse cx="12" cy="14" rx="9" ry="5" strokeWidth={2} />
      <circle
        cx="12"
        cy="9"
        r="3.5"
        strokeWidth={1.5}
        fill="currentColor"
        fillOpacity={0.2}
      />
    </svg>
  );
}
