import type { StateCreator } from 'zustand';
import type {
  ArrowAnnotation,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type { TacticalUnifiedState } from './tactical-unified-store';
import {
  distToSegment,
  getSlide,
  isPointInPolygon,
  recordHistory,
  updateSlideInProject,
} from './tactical-unified-store';

export interface AnnotationSlice {
  addArrow: (slideId: string, arrow: ArrowAnnotation) => void;
  updateArrow: (
    slideId: string,
    arrowId: string,
    patch: Partial<ArrowAnnotation>,
  ) => void;
  removeArrow: (slideId: string, arrowId: string) => void;
  addZone: (slideId: string, zone: ZoneAnnotation) => void;
  updateZone: (
    slideId: string,
    zoneId: string,
    patch: Partial<ZoneAnnotation>,
  ) => void;
  removeZone: (slideId: string, zoneId: string) => void;
  addText: (slideId: string, text: TextAnnotation) => void;
  updateText: (
    slideId: string,
    textId: string,
    patch: Partial<TextAnnotation>,
  ) => void;
  removeText: (slideId: string, textId: string) => void;
  clearAnnotations: (slideId: string) => void;
  eraseAtPoint: (
    slideId: string,
    point: { x: number; y: number },
    radius?: number,
  ) => void;
}

export const createAnnotationSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  AnnotationSlice
> = (set, _get, _store) => ({
  addArrow: (slideId, arrow) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        arrows: [...sl.arrows, arrow],
      })),
      isDirty: true,
    })),

  updateArrow: (slideId, arrowId, patch) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      const existingArrow = slide?.arrows.find((a) => a.id === arrowId);
      if (existingArrow?.locked && !('locked' in patch)) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          arrows: sl.arrows.map((a) =>
            a.id === arrowId ? { ...a, ...patch } : a,
          ),
        })),
        isDirty: true,
      };
    }),

  removeArrow: (slideId, arrowId) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      const existingArrow = slide?.arrows.find((a) => a.id === arrowId);
      if (existingArrow?.locked) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          arrows: sl.arrows.filter((a) => a.id !== arrowId),
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter((o) => o.id !== arrowId),
      };
    }),

  addZone: (slideId, zone) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        zones: [...sl.zones, zone],
      })),
      isDirty: true,
    })),

  updateZone: (slideId, zoneId, patch) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      const existingZone = slide?.zones.find((z) => z.id === zoneId);
      if (existingZone?.locked && !('locked' in patch)) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          zones: sl.zones.map((z) =>
            z.id === zoneId ? { ...z, ...patch } : z,
          ),
        })),
        isDirty: true,
      };
    }),

  removeZone: (slideId, zoneId) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      const existingZone = slide?.zones.find((z) => z.id === zoneId);
      if (existingZone?.locked) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          zones: sl.zones.filter((z) => z.id !== zoneId),
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter((o) => o.id !== zoneId),
      };
    }),

  addText: (slideId, text) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        texts: [...sl.texts, text],
      })),
      isDirty: true,
    })),

  updateText: (slideId, textId, patch) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      const existingText = slide?.texts.find((t) => t.id === textId);
      if (existingText?.locked && !('locked' in patch)) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          texts: sl.texts.map((t) =>
            t.id === textId ? { ...t, ...patch } : t,
          ),
        })),
        isDirty: true,
      };
    }),

  removeText: (slideId, textId) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      const existingText = slide?.texts.find((t) => t.id === textId);
      if (existingText?.locked) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          texts: sl.texts.filter((t) => t.id !== textId),
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter((o) => o.id !== textId),
      };
    }),

  clearAnnotations: (slideId) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        arrows: [],
        zones: [],
        texts: [],
      })),
      isDirty: true,
      selectedObjects: s.selectedObjects.filter(
        (o) => o.kind === 'player' || o.kind === 'ball',
      ),
    })),

  eraseAtPoint: (slideId, point, radius = 4.0) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => {
        // 1. 矢印・線の消去（プレイヤーは絶対に削除しない）
        const remainingArrows = sl.arrows.filter((arrow) => {
          const pts = arrow.points;
          for (let i = 0; i < pts.length; i++) {
            const pt = pts[i];
            if (pt && Math.hypot(pt.x - point.x, pt.y - point.y) <= radius) {
              return false;
            }
          }
          if (pts.length >= 2) {
            for (let i = 0; i < pts.length - 1; i++) {
              const p1 = pts[i];
              const p2 = pts[i + 1];
              if (p1 && p2 && distToSegment(point, p1, p2) <= radius) {
                return false;
              }
            }
          }
          return true;
        });

        // 2. ゾーンの消去 (矩形・楕円・多角形フリーゾーンすべてに対応)
        const remainingZones = sl.zones.filter((zone) => {
          const pts = zone.points;
          if (pts && pts.length >= 2) {
            // 頂点チェック
            for (const pt of pts) {
              if (Math.hypot(pt.x - point.x, pt.y - point.y) <= radius) {
                return false;
              }
            }
            // エッジ線分チェック
            for (let i = 0; i < pts.length; i++) {
              const p1 = pts[i];
              const p2 = pts[(i + 1) % pts.length];
              if (p1 && p2 && distToSegment(point, p1, p2) <= radius) {
                return false;
              }
            }
            // 内部チェック（3点以上の多角形）
            if (pts.length >= 3 && isPointInPolygon(point, pts)) {
              return false;
            }
          }
          if (
            zone.x !== undefined &&
            zone.y !== undefined &&
            zone.width !== undefined &&
            zone.height !== undefined
          ) {
            if (
              point.x >= zone.x - radius &&
              point.x <= zone.x + zone.width + radius &&
              point.y >= zone.y - radius &&
              point.y <= zone.y + zone.height + radius
            ) {
              return false;
            }
          }
          return true;
        });

        // 3. テキストの消去
        const remainingTexts = sl.texts.filter(
          (t) => Math.hypot(t.x - point.x, t.y - point.y) > radius,
        );

        // 4. リングマーカー（描画オブジェクトとしての3D足元リング）は消しゴムで削除可能、通常選手はマーカーオプション（視野コーン・バッジ・コネクト線）を個別消去
        const updatedPlayers = sl.players
          .filter((player) => {
            if (player.style.markerType === 'ring') {
              return (
                Math.hypot(player.x - point.x, player.y - point.y) > radius
              );
            }
            return true;
          })
          .map((player) => {
            let visionCone = player.visionCone;
            if (visionCone) {
              const dist = Math.hypot(player.x - point.x, player.y - point.y);
              if (dist <= radius + visionCone.radius && dist >= 3.0) {
                visionCone = undefined;
              }
            }

            const badges = player.badges.filter((b) => {
              const bx = player.x + (b.offsetX || 0) * 0.1;
              const by = player.y + (b.offsetY || 0) * 0.1;
              return Math.hypot(bx - point.x, by - point.y) > radius;
            });

            const connectLines = player.connectLines.filter((cl) => {
              const target = sl.players.find((p) => p.id === cl.toPlayerId);
              if (!target) return false;
              const dist = distToSegment(
                point,
                { x: player.x, y: player.y },
                { x: target.x, y: target.y },
              );
              return dist > radius;
            });

            return {
              ...player,
              visionCone,
              badges,
              connectLines,
            };
          });

        return {
          ...sl,
          arrows: remainingArrows,
          zones: remainingZones,
          texts: remainingTexts,
          players: updatedPlayers,
        };
      }),
      isDirty: true,
    })),
});
