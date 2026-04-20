import { createShapeId, type Editor } from 'tldraw';
import type { AppShape } from '../types/app-shapes';

/**
 * 古いマーカーデータ（arrows, fovsが内包されていた時代）から独立Shapeへの自動マイグレーションを実行する
 */
export function migrateLegacyMarkerData(editor: Editor) {
  const allShapes = editor.getCurrentPageShapes() as AppShape[];
  const shapesToUpdate: any[] = [];
  const shapesToCreate: any[] = [];

  for (const shape of allShapes) {
    if (shape.type === 'marker') {
      const props = shape.props as any;
      let needsUpdate = false;
      const newProps = { ...props };

      // 旧 arrows 配列の処理
      if (Array.isArray(props.arrows) && props.arrows.length > 0) {
        props.arrows.forEach((arrow: any) => {
          const newType =
            arrow.type === 'dashed'
              ? 'marker_arrow_dash'
              : 'marker_arrow_solid';
          shapesToCreate.push({
            id: createShapeId(),
            type: newType,
            x: shape.x,
            y: shape.y,
            props: {
              targetMarkerId: shape.id,
              angle: arrow.angle,
              length: arrow.length,
              bend: arrow.bend || 0,
            },
          });
        });
        delete newProps.arrows;
        needsUpdate = true;
      }

      // 旧 fovs 配列の処理
      if (Array.isArray(props.fovs) && props.fovs.length > 0) {
        props.fovs.forEach((fov: any) => {
          shapesToCreate.push({
            id: createShapeId(),
            type: 'marker_fov',
            x: shape.x,
            y: shape.y,
            props: {
              targetMarkerId: shape.id,
              angle: fov.angle,
              direction: fov.direction,
              length: fov.length,
            },
          });
        });
        delete newProps.fovs;
        needsUpdate = true;
      }

      if (needsUpdate) {
        shapesToUpdate.push({
          id: shape.id,
          type: 'marker',
          props: newProps,
        });
      }
    }
  }

  if (shapesToCreate.length > 0 || shapesToUpdate.length > 0) {
    editor.run(
      () => {
        if (shapesToCreate.length > 0) editor.createShapes(shapesToCreate);
        if (shapesToUpdate.length > 0) editor.updateShapes(shapesToUpdate);
      },
      { history: 'ignore' },
    );
  }
}
