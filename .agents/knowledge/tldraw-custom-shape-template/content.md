# tldraw Custom Shape Template

## 概要
`video-canvas` やエディタ機能において、`tldraw` (v2/v3以降) のカスタムシェイプを追加する際の実装テンプレートです。
独自シェイプを正しく動作させるためには、型の定義、マイグレーションの準備、`ShapeUtil`の継承、そして描画ツール (`Tool`) の定義を一貫した手順で行う必要があります。

## 基本方針 (Rules)
1. **Utilの継承と使い分け**:
   - 矩形（バウンディングボックス）ベースの単純な形状の場合は `BaseBoxShapeUtil` を継承します。
   - 自由形状（ポリゴン、線など）の場合は `ShapeUtil` を直接継承します。
2. **型とバリデーション**:
   - `props` の定義には必ず `T` (tldraw Validator) を使用します。
3. **マイグレーション**:
   - スキーマ変更に備え、必ず `createShapePropsMigrationSequence` と `createShapePropsMigrationIds` を定義します。
4. **スタイルの外部化**:
   - 線の太さ（`ZONE_STROKE_WIDTH` 等）や色の解決ロジック（`resolveColor` 等）は、個別のシェイプコンポーネント内にハードコードせず、`styles/` 以下の共通ファイルからインポートします。

## 実装テンプレート (Code Template)

### 1. Shape 定義ファイル (例: `zone-rect.tsx`)

```typescript
import {
  BaseBoxShapeTool,
  BaseBoxShapeUtil,
  createShapePropsMigrationIds,
  createShapePropsMigrationSequence,
  DefaultColorStyle,
  DefaultDashStyle,
  DefaultFillStyle,
  Rectangle2d,
  SVGContainer,
  T,
  type TLBaseShape,
} from 'tldraw';
// プロジェクト固有のスタイル定数・解決関数をインポート
import {
  resolveColor,
  resolveDash,
  resolveFill,
  ZONE_DEFAULT_PROPS,
  ZONE_STROKE_WIDTH,
} from '../styles/zone-styles';

// --- Type ---
export type TLZoneRectShape = TLBaseShape<
  'zone-rect',
  {
    w: number;
    h: number;
    color: string;
    fill: string;
    dash: string;
  }
>;

// --- Migrations ---
const migrationVersions = createShapePropsMigrationIds('zone-rect', {
  AddStyles: 1,
});

const zoneRectMigrations = createShapePropsMigrationSequence({
  sequence: [
    {
      id: migrationVersions.AddStyles,
      up(props: any) {
        props.color = props.color ?? ZONE_DEFAULT_PROPS.color;
        props.fill = props.fill ?? 'none';
        props.dash = props.dash ?? ZONE_DEFAULT_PROPS.dash;
      },
    },
  ],
});

/** Corner radius for rounded rectangle shapes. */
const CORNER_RADIUS = 8;

// --- ShapeUtil ---
export class ZoneRectShapeUtil extends BaseBoxShapeUtil<any> {
  static override type = 'zone-rect' as const;
  static override migrations = zoneRectMigrations;

  static override props = {
    w: T.number,
    h: T.number,
    color: DefaultColorStyle,
    fill: DefaultFillStyle,
    dash: DefaultDashStyle,
  };

  override getDefaultProps(): TLZoneRectShape['props'] {
    return { ...ZONE_DEFAULT_PROPS };
  }

  // 当たり判定・選択領域用の正確なジオメトリを返す
  override getGeometry(shape: TLZoneRectShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: shape.props.fill !== 'none',
    });
  }

  // 実際の描画内容
  override component(shape: TLZoneRectShape) {
    // スタイルの解決
    const isDarkMode = this.editor.user.getIsDarkMode();
    const color = resolveColor(shape.props.color, isDarkMode);
    const { fill, fillOpacity } = resolveFill(shape.props.fill, color);
    const dash = resolveDash(shape.props.dash);

    return (
      <SVGContainer>
        <rect
          width={shape.props.w}
          height={shape.props.h}
          rx={CORNER_RADIUS}
          ry={CORNER_RADIUS}
          fill={fill}
          fillOpacity={fillOpacity}
          stroke={color}
          strokeWidth={ZONE_STROKE_WIDTH}
          strokeDasharray={dash}
        />
      </SVGContainer>
    );
  }

  // ホバー時などのインジケーター（枠線）の描画内容
  override indicator(shape: TLZoneRectShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={CORNER_RADIUS}
        ry={CORNER_RADIUS}
      />
    );
  }
}

// --- Tool ---
export class ZoneRectTool extends BaseBoxShapeTool {
  static override id = 'zone-rect';
  override shapeType = 'zone-rect' as any;

  override onEnter() {
    this.editor.setCursor({ type: 'cross', rotation: 0 });
    // 次に作成されるシェイプのデフォルトスタイルを設定
    this.editor.setStyleForNextShapes(DefaultColorStyle, 'red');
    this.editor.setStyleForNextShapes(DefaultFillStyle, 'semi');
  }

  override onPointerUp() {
    // 描画完了後、選択ツールに戻す
    this.editor.setCurrentTool('select');
  }
}
```
