import type { CanvasShape } from './canvas-history';

/**
 * 矢印の頭部を描画する
 */
function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  headLength: number,
) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * CanvasRenderingContext2D に図形リストを描画する
 */
export function renderCanvasShapes(
  ctx: CanvasRenderingContext2D,
  shapes: CanvasShape[],
) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const shape of shapes) {
    ctx.strokeStyle = shape.color;
    ctx.fillStyle = shape.color;
    ctx.lineWidth = shape.strokeWidth;

    switch (shape.type) {
      case 'pen': {
        if (shape.points.length < 2) {
          if (shape.points.length === 1) {
            ctx.beginPath();
            ctx.arc(
              shape.points[0].x,
              shape.points[0].y,
              shape.strokeWidth / 2,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
          break;
        }
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.stroke();
        break;
      }

      case 'line': {
        ctx.beginPath();
        ctx.moveTo(shape.from.x, shape.from.y);
        ctx.lineTo(shape.to.x, shape.to.y);
        ctx.stroke();
        break;
      }

      case 'arrow': {
        ctx.beginPath();
        ctx.moveTo(shape.from.x, shape.from.y);
        ctx.lineTo(shape.to.x, shape.to.y);
        ctx.stroke();

        const headLength = Math.max(shape.strokeWidth * 3.5, 12);
        drawArrowHead(
          ctx,
          shape.from.x,
          shape.from.y,
          shape.to.x,
          shape.to.y,
          headLength,
        );
        break;
      }

      case 'rect': {
        const x = Math.min(shape.from.x, shape.to.x);
        const y = Math.min(shape.from.y, shape.to.y);
        const w = Math.abs(shape.to.x - shape.from.x);
        const h = Math.abs(shape.to.y - shape.from.y);
        ctx.strokeRect(x, y, w, h);
        break;
      }

      case 'circle': {
        ctx.beginPath();
        ctx.arc(shape.center.x, shape.center.y, shape.radius, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }

      case 'text': {
        ctx.font = `bold ${shape.fontSize}px sans-serif`;
        ctx.fillText(shape.text, shape.x, shape.y);
        break;
      }
    }
  }

  ctx.restore();
}
