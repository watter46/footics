export interface TextureCoverRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculates cover fit dimensions and centered coordinates for pitch texture within pitch bounds.
 */
export function calculatePitchTextureCover(
  pitchBounds: { left: number; top: number; width: number; height: number },
  imageSize: { width: number; height: number },
): TextureCoverRect {
  const { left, top, width: boundsWidth, height: boundsHeight } = pitchBounds;
  const { width: imgWidth, height: imgHeight } = imageSize;

  if (
    imgWidth <= 0 ||
    imgHeight <= 0 ||
    boundsWidth <= 0 ||
    boundsHeight <= 0
  ) {
    return {
      x: left,
      y: top,
      width: Math.max(0, boundsWidth),
      height: Math.max(0, boundsHeight),
    };
  }

  const scale = Math.max(boundsWidth / imgWidth, boundsHeight / imgHeight);
  const coveredWidth = imgWidth * scale;
  const coveredHeight = imgHeight * scale;

  const x = left + (boundsWidth - coveredWidth) / 2;
  const y = top + (boundsHeight - coveredHeight) / 2;

  return {
    x,
    y,
    width: coveredWidth,
    height: coveredHeight,
  };
}
