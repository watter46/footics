import {
  BaseBoxShapeUtil,
  Rectangle2d,
  SVGContainer,
  T,
  type TLBaseShape,
} from 'tldraw';

/**
 * 動画キャプチャの範囲を決定するフレームシェイプ
 */
export type TLCaptureFrameShape = TLBaseShape<
  'capture_frame',
  {
    w: number;
    h: number;
    isVisible: boolean;
  }
>;

// @ts-expect-error - Custom shape type does not satisfy the strict TLShape union constraint in older tldraw versions
export class CaptureFrameShapeUtil extends BaseBoxShapeUtil<TLCaptureFrameShape> {
  static override type = 'capture_frame' as const;

  static override props = {
    w: T.number,
    h: T.number,
    isVisible: T.boolean,
  };

  override getDefaultProps(): TLCaptureFrameShape['props'] {
    return {
      w: 1600,
      h: 900,
      isVisible: true,
    };
  }

  override getGeometry(shape: TLCaptureFrameShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: false,
    });
  }

  override canBind() {
    return false;
  }

  override component(shape: TLCaptureFrameShape) {
    const { w, h, isVisible } = shape.props;
    if (!isVisible) return null;

    // 見やすいグレー
    const strokeColor = '#94a3b8';
    const strokeWidth = 2;
    const handleSize = 12;

    return (
      <SVGContainer>
        {/* メインの枠線 */}
        <rect
          width={w}
          height={h}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray="8 4"
          style={{ pointerEvents: 'all' }}
        />

        {/* 四隅の強調ハンドル（見た目用） */}
        <path
          d={`M 0 ${handleSize} V 0 H ${handleSize} M ${w - handleSize} 0 H ${w} V ${handleSize} M ${w} ${h - handleSize} V ${h} H ${w - handleSize} M ${handleSize} ${h} H 0 V ${h - handleSize}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth * 2}
        />
      </SVGContainer>
    );
  }

  override indicator(shape: TLCaptureFrameShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }
}
