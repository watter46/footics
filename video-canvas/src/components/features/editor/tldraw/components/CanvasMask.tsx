import { createShapeId, track, useEditor } from 'tldraw';

/**
 * 背景画像の外側を暗くするマスクコンポーネント。
 * 背景画像 (id: bg-screenshot) の外側にレイヤーを重ね、編集エリアを視覚的に強調します。
 */
export const CanvasMask = track(() => {
  const editor = useEditor();

  const captureFrameId = createShapeId('capture_frame');
  const captureBounds = editor.getShapePageBounds(captureFrameId);

  const bgShapeId = createShapeId('bg-screenshot');
  const bgBounds = editor.getShapePageBounds(bgShapeId);

  const targetBounds = captureBounds ?? bgBounds;

  if (!targetBounds) return null;

  // キャンバス全体を覆うのに十分な広域サイズ
  const BUFFER = 100000;
  const minX = -BUFFER;
  const minY = -BUFFER;
  const maxX = BUFFER;
  const maxY = BUFFER;

  // SVGのパスデータ: 巨大な矩形を描画し、背景画像の範囲を反時計回りでくり抜く (fillRule="evenodd")
  const path = `
    M ${minX} ${minY} H ${maxX} V ${maxY} H ${minX} Z
    M ${targetBounds.x} ${targetBounds.y} 
    L ${targetBounds.x} ${targetBounds.y + targetBounds.h} 
    L ${targetBounds.x + targetBounds.w} ${targetBounds.y + targetBounds.h} 
    L ${targetBounds.x + targetBounds.w} ${targetBounds.y} 
    Z
  `;

  return (
    <svg
      className="tldraw-canvas-mask"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1, // シェイプより前面に配置して「くり抜き」効果を出す
      }}
    >
      <path d={path} fill="rgba(0, 0, 0, 0.45)" fillRule="evenodd" />
    </svg>
  );
});
