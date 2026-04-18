import { createShapeId, StateNode } from 'tldraw';
import { MARKER_DEFAULT_PROPS } from './marker-styles';

/**
 * Custom tool for placing a Marker shape with a single click.
 * Clicking on the canvas creates a Marker at the cursor position,
 * then returns to the select tool.
 */
export class MarkerTool extends StateNode {
  static override id = 'marker';

  override onEnter() {
    this.editor.setCursor({ type: 'cross', rotation: 0 });
  }

  override onPointerDown() {
    const { currentPagePoint } = this.editor.inputs;
    const id = createShapeId();
    const size = MARKER_DEFAULT_PROPS.w;

    this.editor.markHistoryStoppingPoint('creating-marker');

    this.editor.run(() => {
      this.editor.createShape({
        id,
        type: 'marker' as any,
        // Centre the marker on the click position
        x: currentPagePoint.x - size / 2,
        y: currentPagePoint.y - size / 2,
        props: {
          ...MARKER_DEFAULT_PROPS,
        },
      });

      this.editor.setSelectedShapes([id]);
    });
  }

  override onPointerUp() {
    this.editor.setCurrentTool('select');
  }
}
