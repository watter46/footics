import { Line, FabricObject, classRegistry } from 'fabric';

/**
 * ConnectedLine
 * A line that stays anchored to two objects (fromObj, toObj).
 */
export class ConnectedLine extends Line {
  static type = 'ConnectedLine';
  fromObj: FabricObject | null = null;
  toObj: FabricObject | null = null;
  fromId: string | null = null;
  toId: string | null = null;

  constructor(coords: [number, number, number, number], options: any) {
    super(coords, {
      ...options,
      selectable: false,
      evented: false,
      stroke: options.stroke || '#fff',
      strokeWidth: options.strokeWidth || 2,
    });
    this.fromObj = options.fromObj || null;
    this.toObj = options.toObj || null;
    this.fromId = options.fromId || (options.fromObj as any)?.id || null;
    this.toId = options.toId || (options.toObj as any)?.id || null;
    
    this.bindEvents();
  }

  bindEvents() {
    const update = () => this.updateCoords();
    if (this.fromObj) {
      this.fromObj.on('moving', update);
      this.fromObj.on('scaling', update);
    }
    if (this.toObj) {
      this.toObj.on('moving', update);
      this.toObj.on('scaling', update);
    }
  }

  updateCoords() {
    if (this.fromObj && this.toObj) {
      const p1 = this.fromObj.getCenterPoint();
      const p2 = this.toObj.getCenterPoint();
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const angle = Math.atan2(dy, dx);
      
      const d1 = this.getDistanceToEdge(this.fromObj, angle);
      const d2 = this.getDistanceToEdge(this.toObj, angle + Math.PI);
      
      this.set({
        x1: p1.x + d1 * Math.cos(angle),
        y1: p1.y + d1 * Math.sin(angle),
        x2: p2.x + d2 * Math.cos(angle + Math.PI),
        y2: p2.y + d2 * Math.sin(angle + Math.PI),
      });
      this.setCoords();
      this.canvas?.renderAll();
    }
  }

  private getDistanceToEdge(obj: FabricObject, angle: number): number {
    const w = (obj.width * (obj.scaleX || 1)) / 2;
    const h = (obj.height * (obj.scaleY || 1)) / 2;
    
    // Check type
    if (obj.type === 'circle' || obj.type === 'ellipse' || obj.type === 'Circle' || obj.type === 'Ellipse') {
        // Ellipse radius at angle formula
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return (w * h) / Math.sqrt(Math.pow(h * cos, 2) + Math.pow(w * sin, 2));
    }
    
    // Default to Rectangle box intersection
    const absCos = Math.abs(Math.cos(angle));
    const absSin = Math.abs(Math.sin(angle));
    
    if (w * absSin <= h * absCos) {
        return w / absCos;
    } else {
        return h / absSin;
    }
  }

  // @ts-ignore
  toObject(propertiesToInclude: string[] = []): any {
    return super.toObject([
      'fromId',
      'toId',
      ...propertiesToInclude
    ] as any);
  }
}

classRegistry.setClass(ConnectedLine);
