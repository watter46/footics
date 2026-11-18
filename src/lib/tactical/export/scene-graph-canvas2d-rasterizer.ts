import type {
  ResolvedArrowPrimitive,
  ResolvedConnectLinePrimitive,
  ResolvedSceneGraphDTO,
  ResolvedTrajectoryPrimitive,
  ResolvedZonePrimitive,
} from '@/lib/tactical/compiler/scene-graph-dto';
import { renderBillboardItem } from './scene-graph-billboard-rasterizer';

export interface RasterizeSceneGraphOptions {
  readonly ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  readonly sceneGraph: ResolvedSceneGraphDTO;
  readonly playerPhotos?: Readonly<
    Record<string, CanvasImageSource | null | undefined>
  >;
}

function renderZone(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  zone: ResolvedZonePrimitive,
): void {
  if (!zone.visible || zone.opacity <= 0) return;

  ctx.save();
  ctx.fillStyle = zone.color;
  ctx.strokeStyle = zone.strokeColor;
  ctx.lineWidth = zone.strokeWidthPx;

  if (zone.shapeType === 'polygon') {
    if (zone.flatPointsPx && zone.flatPointsPx.length >= 4) {
      ctx.globalAlpha = zone.opacity;
      ctx.beginPath();
      ctx.moveTo(zone.flatPointsPx[0], zone.flatPointsPx[1]);
      for (let i = 2; i < zone.flatPointsPx.length; i += 2) {
        ctx.lineTo(zone.flatPointsPx[i], zone.flatPointsPx[i + 1]);
      }
      ctx.closePath();
      ctx.fill();
      if (zone.strokeWidthPx > 0) {
        ctx.globalAlpha = zone.strokeOpacity;
        ctx.stroke();
      }
    }
  } else if (zone.shapeType === 'rect') {
    const x = zone.xPx ?? 0;
    const y = zone.yPx ?? 0;
    const w = zone.widthPx ?? 0;
    const h = zone.heightPx ?? 0;
    const rot = zone.rotationDeg ?? 0;

    if (rot !== 0) {
      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.translate(cx, cy);
      if (typeof ctx.rotate === 'function') {
        ctx.rotate((rot * Math.PI) / 180);
      }
      ctx.globalAlpha = zone.opacity;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      if (zone.strokeWidthPx > 0) {
        ctx.globalAlpha = zone.strokeOpacity;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
      }
    } else {
      ctx.globalAlpha = zone.opacity;
      ctx.fillRect(x, y, w, h);
      if (zone.strokeWidthPx > 0) {
        ctx.globalAlpha = zone.strokeOpacity;
        ctx.strokeRect(x, y, w, h);
      }
    }
  } else if (zone.shapeType === 'ellipse') {
    const x = zone.xPx ?? 0;
    const y = zone.yPx ?? 0;
    const w = zone.widthPx ?? 0;
    const h = zone.heightPx ?? 0;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = Math.max(1, w / 2);
    const ry = Math.max(1, h / 2);
    const rotRad = ((zone.rotationDeg ?? 0) * Math.PI) / 180;

    ctx.globalAlpha = zone.opacity;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, rotRad, 0, Math.PI * 2);
    ctx.fill();
    if (zone.strokeWidthPx > 0) {
      ctx.globalAlpha = zone.strokeOpacity;
      ctx.stroke();
    }
  }

  ctx.restore();
}

function renderArrow(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  arrow: ResolvedArrowPrimitive,
): void {
  if (!arrow.visible || arrow.opacity <= 0 || arrow.flatPointsPx.length < 4) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = arrow.opacity;
  ctx.strokeStyle = arrow.color;
  ctx.fillStyle = arrow.color;
  ctx.lineWidth = arrow.strokeWidthPx;

  if (arrow.dashArrayPx && arrow.dashArrayPx.length > 0) {
    ctx.setLineDash([...arrow.dashArrayPx]);
  }
  if (arrow.dashOffsetPx !== undefined) {
    ctx.lineDashOffset = arrow.dashOffsetPx;
  }

  ctx.beginPath();
  ctx.moveTo(arrow.flatPointsPx[0], arrow.flatPointsPx[1]);
  for (let i = 2; i < arrow.flatPointsPx.length; i += 2) {
    ctx.lineTo(arrow.flatPointsPx[i], arrow.flatPointsPx[i + 1]);
  }
  ctx.stroke();

  ctx.setLineDash([]);

  // End Marker
  if (arrow.endMarker === 'arrow') {
    const headEx = arrow.flatPointsPx[arrow.flatPointsPx.length - 2];
    const headEy = arrow.flatPointsPx[arrow.flatPointsPx.length - 1];
    const cos = Math.cos(arrow.endAngleRad);
    const sin = Math.sin(arrow.endAngleRad);
    const bx = headEx - arrow.pointerLengthPx * cos;
    const by = headEy - arrow.pointerLengthPx * sin;
    const halfWidth = arrow.pointerWidthPx / 2;

    ctx.beginPath();
    ctx.moveTo(headEx, headEy);
    ctx.lineTo(bx - halfWidth * sin, by + halfWidth * cos);
    ctx.lineTo(bx + halfWidth * sin, by - halfWidth * cos);
    ctx.closePath();
    ctx.fill();
  } else if (arrow.endMarker === 'dot') {
    const markerPt = arrow.endMarkerPointPx ?? arrow.endPointPx;
    ctx.beginPath();
    ctx.arc(markerPt.x, markerPt.y, arrow.dotRadiusPx, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Start Marker
  if (arrow.startMarker === 'dot') {
    const markerPt = arrow.startMarkerPointPx ?? arrow.startPointPx;
    ctx.beginPath();
    ctx.arc(markerPt.x, markerPt.y, arrow.dotRadiusPx, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function renderConnectLine(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  line: ResolvedConnectLinePrimitive,
): void {
  if (!line.visible) return;

  ctx.save();
  ctx.strokeStyle = line.color;
  ctx.lineWidth = line.strokeWidthPx;
  if (line.dashArrayPx && line.dashArrayPx.length > 0) {
    ctx.setLineDash([...line.dashArrayPx]);
  }

  ctx.beginPath();
  ctx.moveTo(line.flatPointsPx[0], line.flatPointsPx[1]);
  ctx.lineTo(line.flatPointsPx[2], line.flatPointsPx[3]);
  ctx.stroke();

  ctx.restore();
}

function renderTrajectory(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  traj: ResolvedTrajectoryPrimitive,
): void {
  if (!traj.visible || traj.flatPointsPx.length < 4) return;

  ctx.save();
  ctx.strokeStyle = traj.color;
  ctx.lineWidth = 2;
  if (traj.dashArrayPx && traj.dashArrayPx.length > 0) {
    ctx.setLineDash([...traj.dashArrayPx]);
  }

  ctx.beginPath();
  ctx.moveTo(traj.flatPointsPx[0], traj.flatPointsPx[1]);
  for (let i = 2; i < traj.flatPointsPx.length; i += 2) {
    ctx.lineTo(traj.flatPointsPx[i], traj.flatPointsPx[i + 1]);
  }
  ctx.stroke();

  ctx.restore();
}

export function rasterizeSceneGraphToCanvas2D(
  options: RasterizeSceneGraphOptions,
): void {
  const { ctx, sceneGraph, playerPhotos } = options;

  // 1. Zones
  for (const zone of sceneGraph.zones) {
    renderZone(ctx, zone);
  }

  // 2. Connect Lines
  for (const line of sceneGraph.connectLines) {
    renderConnectLine(ctx, line);
  }

  // 3. Trajectories
  for (const traj of sceneGraph.trajectories) {
    renderTrajectory(ctx, traj);
  }

  // 4. Arrows
  for (const arrow of sceneGraph.arrows) {
    renderArrow(ctx, arrow);
  }

  // 5. Billboard Items
  for (const item of sceneGraph.billboardItems) {
    renderBillboardItem(ctx, item, playerPhotos);
  }
}
