/**
 * Shared constants and defaults for the Marker custom shape.
 */

/** Original SVG viewBox size (64×64) */
export const MARKER_SVG_SIZE = 64;

/** Default marker dimension in pixels */
export const MARKER_DEFAULT_SIZE = 230;

/** Minimum marker dimension in pixels */
export const MARKER_MIN_SIZE = 24;

/**
 * Approximate ellipse radii of the visible ring in the 64×64 SVG space.
 * Used to compute arrow / FOV origin points on the ring perimeter.
 */
export const MARKER_RING_RX = 28;
export const MARKER_RING_RY = 10;

/** Default stroke width for arrows coming out of the marker */
export const MARKER_ARROW_STROKE_WIDTH = 8;

/** Default props for a newly created Marker shape */
export const MARKER_DEFAULT_PROPS = {
  w: MARKER_DEFAULT_SIZE,
  h: MARKER_DEFAULT_SIZE,
  color: '#034694' as const,
  arrows: [] as Array<{ type: string; angle: number; length: number; bend: number }>,
  fovs: [] as Array<{ angle: number; direction: number; length: number }>,
};
