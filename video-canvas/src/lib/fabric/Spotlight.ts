import { FabricObject, TPointerEvent, util, Gradient } from 'fabric';

/**
 * Spotlight class
 * Represents a glowing focus effect for athletes.
 */
export class Spotlight extends FabricObject {
  static type = 'Spotlight';

  constructor(options: any) {
    super({
      ...options,
      width: 150,
      height: 250,
      fill: 'rgba(255, 255, 255, 0.2)',
      opacity: 0.8,
    });
  }

  _render(ctx: CanvasRenderingContext2D) {
    const w = this.width;
    const h = this.height;
    const x = -w / 2;
    const y = -h / 2;

    ctx.save();
    
    // Create soft beam effect
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.sqrt(w*w + h*h)/2);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 200, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 200, 0)');

    ctx.fillStyle = gradient;
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(255, 255, 200, 0.5)';
    
    // Draw elliptical beam
    ctx.beginPath();
    ctx.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Adding a subtle "beam" cone if height > width
    if (h > w) {
        ctx.beginPath();
        ctx.moveTo(-w/4, -h/2);
        ctx.lineTo(w/4, -h/2);
        ctx.lineTo(w/2, h/2);
        ctx.lineTo(-w/2, h/2);
        ctx.closePath();
        ctx.globalAlpha = 0.1;
        ctx.fill();
    }

    ctx.restore();
  }
}
