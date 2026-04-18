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

/** Default arrow length in pixels */
export const MARKER_ARROW_DEFAULT_LENGTH = 120;

/** Default FOV arc length in pixels */
export const MARKER_FOV_DEFAULT_LENGTH = 180;

/** Default FOV spread angle in radians (60 degrees) */
export const MARKER_FOV_DEFAULT_ANGLE = Math.PI / 3;

/** Arrowhead dimensions */
export const MARKER_ARROWHEAD_WIDTH = 4.5;
export const MARKER_ARROWHEAD_HEIGHT = 4;

/** Default stroke width for man-mark lines */
export const MARKER_MAN_MARK_STROKE_WIDTH = 2;

/** Dot radius for man-mark endpoints (both ends of the line) */
export const MARKER_MAN_MARK_DOT_RADIUS = 3;

/** Default stroke width for marker connector lines */
export const MARKER_CONNECTOR_STROKE_WIDTH = 6;

/** Default props for a newly created Marker shape */
export const MARKER_DEFAULT_PROPS = {
  w: MARKER_DEFAULT_SIZE,
  h: MARKER_DEFAULT_SIZE,
  color: '#034694' as const,
};
