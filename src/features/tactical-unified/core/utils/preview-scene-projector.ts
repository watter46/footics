import type {
  AspectRatio,
  BoundaryBox,
  PitchTransform,
} from '@/lib/types/tactical-unified';
import type { AnnotationsData, BallAnnotation } from '../types';
import type { PitchRectBounds } from './canvas-coordinates';
import { buildExportMVPMatrix } from './canvas-pitch-transform-helper';

export interface ProjectSceneParams {
  annotations: AnnotationsData;
  ball: BallAnnotation | null;
  pitchTransform?: PitchTransform | null;
  aspectRatio: AspectRatio;
}

export interface ProjectedSceneResult {
  annotations: AnnotationsData;
  ball: BallAnnotation | null;
  mvpMatrix: Float32Array | null;
}

const DEFAULT_PITCH_TRANSFORM: PitchTransform = {
  tilt: 0,
  yaw: 90,
  zoom: 1,
  panX: 0,
  panY: 0,
  isLocked: false,
};

export function hasActiveCameraTransform(pt?: PitchTransform | null): boolean {
  if (!pt) return false;
  return (
    pt.tilt !== DEFAULT_PITCH_TRANSFORM.tilt ||
    pt.yaw !== DEFAULT_PITCH_TRANSFORM.yaw ||
    pt.zoom !== DEFAULT_PITCH_TRANSFORM.zoom ||
    pt.panX !== DEFAULT_PITCH_TRANSFORM.panX ||
    pt.panY !== DEFAULT_PITCH_TRANSFORM.panY
  );
}

export function projectNorm100WithMatrix(
  normX: number,
  normY: number,
  m: Float32Array,
): { x: number; y: number } {
  const modelX = normX / 100 - 0.5;
  const modelY = 0.5 - normY / 100;
  const clipX = modelX * m[0] + modelY * m[4] + m[12];
  const clipY = modelX * m[1] + modelY * m[5] + m[13];
  const clipW = modelX * m[3] + modelY * m[7] + m[15];
  if (Math.abs(clipW) < 1e-6) return { x: 0, y: 0 };
  return {
    x: (clipX / clipW + 1) * 50,
    y: (1 - clipY / clipW) * 50,
  };
}

export function applyBoundaryCropToPitchRect(
  vRect: PitchRectBounds,
  boundaryBox?: BoundaryBox | null,
): PitchRectBounds {
  if (
    !boundaryBox?.enabled ||
    boundaryBox.width <= 0 ||
    boundaryBox.height <= 0 ||
    (boundaryBox.width >= 100 &&
      boundaryBox.height >= 100 &&
      boundaryBox.x === 0 &&
      boundaryBox.y === 0)
  ) {
    return vRect;
  }
  const fullWidth = vRect.width * (100 / boundaryBox.width);
  const fullHeight = vRect.height * (100 / boundaryBox.height);
  const x = vRect.x - (boundaryBox.x / 100) * fullWidth;
  const y = vRect.y - (boundaryBox.y / 100) * fullHeight;
  return {
    x,
    y,
    width: fullWidth,
    height: fullHeight,
  };
}

const REF_DIMS: Record<AspectRatio, { w: number; h: number }> = {
  '16:9': { w: 1920, h: 1080 },
  '9:16': { w: 1080, h: 1920 },
  '4:5': { w: 1080, h: 1350 },
  '1:1': { w: 1080, h: 1080 },
};

export function projectSceneForCamera(
  params: ProjectSceneParams,
): ProjectedSceneResult {
  const { annotations, ball, pitchTransform, aspectRatio } = params;

  if (!hasActiveCameraTransform(pitchTransform)) {
    return {
      annotations,
      ball,
      mvpMatrix: null,
    };
  }

  const { w: refW, h: refH } = REF_DIMS[aspectRatio] ?? REF_DIMS['16:9'];
  const m = new Float32Array(
    buildExportMVPMatrix(pitchTransform!, refW, refH, aspectRatio),
  );
  const hasPerspectiveTilt = Math.abs(m[7]) > 1e-5 || Math.abs(m[3]) > 1e-5;

  const markers = annotations.markers.map((p) => {
    if (p.area === 'bench') return p;
    const pos = projectNorm100WithMatrix(p.x, p.y, m);
    let style = p.style;
    if (hasPerspectiveTilt) {
      const depthScale = Math.max(
        0.75,
        Math.min(1.25, 0.88 + (p.y / 100) * 0.24),
      );
      style = {
        ...p.style,
        sizeScale: (p.style?.sizeScale ?? 1) * depthScale,
      };
    }
    return {
      ...p,
      x: pos.x,
      y: pos.y,
      style,
    };
  });

  let nextBall: BallAnnotation | null = null;
  if (ball) {
    const pos = projectNorm100WithMatrix(ball.x, ball.y, m);
    nextBall = {
      ...ball,
      x: pos.x,
      y: pos.y,
    };
  }

  const texts = annotations.texts.map((t) => {
    const pos = projectNorm100WithMatrix(t.x, t.y, m);
    return {
      ...t,
      x: pos.x,
      y: pos.y,
    };
  });

  const arrows = annotations.arrows.map((a) => {
    const nextPoints = a.points.map((pt) =>
      projectNorm100WithMatrix(pt.x, pt.y, m),
    );
    const nextControlPoint = a.controlPoint
      ? projectNorm100WithMatrix(a.controlPoint.x, a.controlPoint.y, m)
      : undefined;
    return {
      ...a,
      points: nextPoints,
      controlPoint: nextControlPoint,
    };
  });

  const zones = annotations.zones.map((z) => {
    if (z.shapeType === 'rect') {
      const zx = z.x ?? z.points[0]?.x ?? 0;
      const zy = z.y ?? z.points[0]?.y ?? 0;
      const zw = z.width ?? 0;
      const zh = z.height ?? 0;
      const cx = zx + zw / 2;
      const cy = zy + zh / 2;
      const rad = ((z.rotation ?? 0) * Math.PI) / 180;
      const halfW = zw / 2;
      const halfH = zh / 2;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const corners = [
        { dx: -halfW, dy: -halfH },
        { dx: halfW, dy: -halfH },
        { dx: halfW, dy: halfH },
        { dx: -halfW, dy: halfH },
      ].map((c) => {
        const px = cx + c.dx * cos - c.dy * sin;
        const py = cy + c.dx * sin + c.dy * cos;
        return projectNorm100WithMatrix(px, py, m);
      });
      return {
        ...z,
        shapeType: 'polygon' as const,
        points: corners,
      };
    }
    if (z.shapeType === 'ellipse') {
      const zx = z.x ?? 0;
      const zy = z.y ?? 0;
      const zw = z.width ?? 0;
      const zh = z.height ?? 0;
      const cx = zx + zw / 2;
      const cy = zy + zh / 2;
      const rx = zw / 2;
      const ry = zh / 2;
      const rad = ((z.rotation ?? 0) * Math.PI) / 180;
      const segments = 32;
      const cosRot = Math.cos(rad);
      const sinRot = Math.sin(rad);
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i < segments; i++) {
        const angle = (Math.PI * 2 * i) / segments;
        const dx = Math.cos(angle) * rx;
        const dy = Math.sin(angle) * ry;
        const ox = cx + dx * cosRot - dy * sinRot;
        const oy = cy + dx * sinRot + dy * cosRot;
        pts.push(projectNorm100WithMatrix(ox, oy, m));
      }
      return {
        ...z,
        shapeType: 'polygon' as const,
        points: pts,
      };
    }
    const nextPoints = z.points.map((pt) =>
      projectNorm100WithMatrix(pt.x, pt.y, m),
    );
    return {
      ...z,
      points: nextPoints,
    };
  });

  return {
    annotations: {
      markers,
      arrows,
      zones,
      texts,
    },
    ball: nextBall,
    mvpMatrix: m,
  };
}
