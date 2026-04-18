import type { Editor, TLShapeId } from 'tldraw';
import type { AppShape } from './app-shapes';

/** マーカーに従属するオプションShapeのtypeリスト */
const MARKER_OPTION_TYPES = [
  'marker_arrow_solid',
  'marker_arrow_dash',
  'marker_man_mark',
  'marker_fov',
] as const;

type MarkerOptionType = (typeof MARKER_OPTION_TYPES)[number];

function isMarkerOption(s: AppShape): s is AppShape & {
  type: MarkerOptionType;
  props: { targetMarkerId: TLShapeId | null };
} {
  return (MARKER_OPTION_TYPES as readonly string[]).includes(s.type);
}

/**
 * マーカー移動・削除に伴い、従属Shapeを同期するサイドエフェクトを登録する。
 *
 * **中心点共有方式:**
 * オプションShape (arrow, fov, man-mark) は `x, y` をマーカーと完全に同じ値に保つ。
 * 差分加算（+dx）ではなく `next.x / next.y` を直接上書きするため、ドリフトが発生しない。
 */
export function registerMarkerSync(editor: Editor) {
  // ------------------------------------------------------------------
  // 1. マーカー移動時: 子Shapeの x,y を親の x,y へ完全上書き
  // ------------------------------------------------------------------
  editor.sideEffects.registerAfterChangeHandler(
    'shape',
    (prevShape, nextShape) => {
      const prev = prevShape as AppShape;
      const next = nextShape as AppShape;

      if (prev.type !== 'marker' || next.type !== 'marker') return nextShape;

      // 座標変化がなければスキップ（不要な更新を防ぐ）
      if (prev.x === next.x && prev.y === next.y) return nextShape;

      const allShapes = editor.getCurrentPageShapes() as AppShape[];
      const shapesToUpdate: {
        id: TLShapeId;
        type: string;
        x: number;
        y: number;
      }[] = [];

      for (const s of allShapes) {
        if (!isMarkerOption(s)) continue;
        if ((s.props as any).targetMarkerId !== next.id) continue;

        // 差分加算ではなく親の絶対座標に上書き（中心点共有方式）
        shapesToUpdate.push({
          id: s.id,
          type: s.type,
          x: next.x,
          y: next.y,
        });
      }

      if (shapesToUpdate.length > 0) {
        editor.updateShapes(shapesToUpdate as any);
      }

      return nextShape;
    },
  );

  // ------------------------------------------------------------------
  // 2. マーカー削除時: 従属する全Shapeをカスケード削除
  // ------------------------------------------------------------------
  editor.sideEffects.registerBeforeDeleteHandler('shape', (deletedShape) => {
    const shape = deletedShape as AppShape;
    if (shape.type !== 'marker') return;

    const allShapes = editor.getCurrentPageShapes() as AppShape[];
    const shapesToDelete: TLShapeId[] = [];

    for (const s of allShapes) {
      // オプションShape（矢印・FOV・マンマーク）
      if (isMarkerOption(s)) {
        if ((s.props as any).targetMarkerId === shape.id) {
          shapesToDelete.push(s.id);
        }
      }
      // コネクタ（始端または終端のマーカーが削除されたら連鎖削除）
      if (s.type === 'marker_connector') {
        const p = s.props as any;
        if (p.startMarkerId === shape.id || p.endMarkerId === shape.id) {
          shapesToDelete.push(s.id);
        }
      }
    }

    if (shapesToDelete.length > 0) {
      editor.deleteShapes(shapesToDelete);
    }
  });
}
