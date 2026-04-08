import { DrawingObject, ObjectType } from './drawing';
import * as fabric from 'fabric';

/**
 * Normalizes screen coordinates to 0-100
 */
export const normalize = (val: number, max: number) => (val / max) * 100;

/**
 * Denormalizes 0-100 coordinates back to screen pixels
 */
export const denormalize = (val: number, max: number) => (val / 100) * max;

/**
 * Normalizes a size/width value relative to the canvas width to maintain aspect ratio independent of resolution.
 * All "thickness" and "size" values should use this.
 */
export const normalizeSize = (val: number, canvasWidth: number) => (val / canvasWidth) * 100;

/**
 * Denormalizes a size/width value based on the current canvas width.
 */
export const denormalizeSize = (val: number, canvasWidth: number) => (val / 100) * canvasWidth;

export function fabricToModel(
  obj: any, 
  canvasWidth: number, 
  canvasHeight: number
): DrawingObject {
  const common = {
    id: obj.id,
    type: obj.type as ObjectType,
    x: normalize(obj.left, canvasWidth),
    y: normalize(obj.top, canvasHeight),
    // Width and Height are also normalized relative to the canvas width/height respectively
    // to maintain their relative coverage of the area.
    width: obj.width ? normalize(obj.width, canvasWidth) : undefined,
    height: obj.height ? normalize(obj.height, canvasHeight) : undefined,
    fill: obj.fill as string,
    stroke: obj.stroke as string,
    // CRITICAL: strokeWidth normalized to canvas width
    strokeWidth: normalizeSize(obj.strokeWidth, canvasWidth),
    strokeDashArray: obj.strokeDashArray ? obj.strokeDashArray.map((v: number) => normalizeSize(v, canvasWidth)) : null,
    opacity: obj.opacity,
    angle: obj.angle,
    scaleX: obj.scaleX,
    scaleY: obj.scaleY,
    visible: obj.visible,
    locked: !!obj.lockMovementX,
    name: obj.name,
  };

  if (obj instanceof fabric.Line) {
    return {
      ...common,
      x1: normalize(obj.x1, canvasWidth),
      y1: normalize(obj.y1, canvasHeight),
      x2: normalize(obj.x2, canvasWidth),
      y2: normalize(obj.y2, canvasHeight),
    };
  }

  if (obj instanceof fabric.Ellipse) {
    return {
      ...common,
      rx: normalize(obj.rx, canvasWidth),
      ry: normalize(obj.ry, canvasHeight),
    };
  }

  if (obj instanceof fabric.Path) {
    return {
      ...common,
      // For paths, we might need more complex normalization if scaling happens, 
      // but for now SVG export is a placeholder.
      pathData: obj.toSVG(), 
    };
  }
  
  if (obj.type === 'ConnectedLine') {
    return {
        ...common,
        fromId: obj.fromId,
        toId: obj.toId,
    };
  }

  if (obj instanceof fabric.FabricImage) {
      return {
          ...common,
          url: obj.getSrc(),
          // Images also need their scale and crop normalized if we want perfect abstraction,
          // but for basic SNS usage, x/y/scale is enough.
      };
  }

  return common as DrawingObject;
}
