---
name: react-konva
description: Konva.js + react-konva を使用した戦術ボード実装のベストプラクティスとパフォーマンス最適化
---

# Konva.js + react-konva スキルガイド

Footics の戦術ボード（`src/features/tactical-unified`）における Konva.js + react-konva の実装・パフォーマンス最適化ガイドラインです。

---

## 1. Hit Graph（当たり判定）とバッファキャンバスの徹底遮断 (`listening` / `perfectDrawEnabled`)

Konva はデフォルトで全ノードに対して裏面の Hit Canvas（当たり判定用キャンバス）と半透明合成用のバッファキャンバスを構築します。要素数が増えるとこれが最大のボトルネックになるため、以下の3段階の遮断基準をすべて満たしてください。

### 必須適用基準
1. **Layer 単位の `listening` 遮断**:
   - 静的な背景レイヤー（`PitchBackgroundLayer`）、作図プレビュー・選択枠専用レイヤー（`InteractionPreviewLayer`）は、常時 `<Layer listening={false}>` を指定し Hit Canvas 自体を生成させないでください。
   - アニメーション再生中および画像・動画エクスポート時（`cleanRender === true`）は、すべての Layer に `listening={false}` を渡してイベント計算を完全に停止させてください。
2. **非対話・装飾 Shape への `listening={false}` + `perfectDrawEnabled={false}` 同時指定**:
   - イベントを受け取らないすべての装飾 Shape（選手マーカーの外周リング・フェードリング・影・背番号/名前ラベル背景、ボールの模様・影、矢印の先端ヘッド、ゴースト軌道、視野角コーン、フォーカススポットライト、パルス波紋、ゾーンの補助線）には、**`listening={false}` と `perfectDrawEnabled={false}` を必ずセットで指定**してください。
3. **ツール・ドラッグ状態に応じた動的 `listening` 制御**:
   - 作図ツール選択中や他オブジェクトのドラッグ移動中など、対象オブジェクトが操作対象外となる状態では、親 `<Group>` の `listening` を `false` に切り替えてください。

```tsx
// ❌ 禁止: 装飾用の Circle / Line / Rect に listening={false} と perfectDrawEnabled={false} を付け忘れる
<Group draggable={isInteractive}>
  <Circle radius={24} fill="rgba(255, 85, 0, 0.2)" stroke="#FF5500" />
  <Circle radius={14} fill={teamColor} />
  <Text text={player.name} />
</Group>

// ✅ 必須: 親 Group で対話可否を制御し、内部の装飾 Shape には listening={false} と perfectDrawEnabled={false} を同時指定する
const isNodeInteractive = !cleanRender && isInteractive && activeTool === 'select';

<Group
  listening={isNodeInteractive}
  draggable={isNodeInteractive && !player.locked}
>
  {/* 外周エフェクト・影・装飾リングは常に Hit 判定とバッファ描画をスキップ */}
  <Circle
    radius={24}
    fill="rgba(255, 85, 0, 0.2)"
    stroke="#FF5500"
    listening={false}
    perfectDrawEnabled={false}
  />
  {/* メインの当たり判定を持つ本体のみ listening を維持し、perfectDrawEnabled は false */}
  <Circle radius={14} fill={teamColor} perfectDrawEnabled={false} />
  <Text text={player.name} listening={false} perfectDrawEnabled={false} />
</Group>
```

---

## 2. Dumb Rasterizer 原則と `React.memo` レイヤーの Store 購読貫通防止

戦術ボードの編集キャンバス（Konva）と動画・プレビュー出力（Canvas2D）で1ピクセルの描画ズレも起こさず、かつ 60〜120Hz の操作レスポンスを維持するため、以下の規約を厳守してください（詳細は `.agents/rules/tactical-domain-architecture.md` 参照）。

1. **Konva コンポーネント内での幾何学計算・ドメイン逆引きの全面禁止**:
   - Konva コンポーネント（`PitchGroundLayer`, `BillboardObjectLayer`, `ArrowObject`, `ZoneObject` 等）の内部で、ベジェ曲線・波線の頂点分割、選手半径オフセット、伸長エフェクトのトリミング、波紋リング半径、3D遠近投影を計算することを禁止します。
   - すべての幾何学・エフェクト解決は純粋関数 `compileSceneGraph(frame, session, viewport): ResolvedSceneGraphDTO` で一括計算し、Konva 側は渡された `sceneGraph` の計算済みピクセル座標列（`flatPointsPx` 等）をそのまま描画するだけの **Dumb Rasterizer（純粋出力装置）** としてください。
2. **`React.memo` レイヤー内部での粗い Store 購読（`s.project` 等）の禁止**:
   - Konva Layer（`PitchGroundLayer`, `BillboardObjectLayer` 等）を `React.memo` でラップしていても、**Layer の内部で `useDocumentStore((s) => s.project)` のような上位オブジェクト購読を行うと、Props が不変でも Context 更新が `memo` を貫通してレイヤー全体が再描画されます**。
   - Layer の描画入力は Props の `sceneGraph: ResolvedSceneGraphDTO` に一本化し、Layer 内部での Store 購読はイベント発火用のアクション関数（`dispatchSlide`, `selectObject` 等）または細粒度のプリミティブ状態のみに限定してください。
3. **高頻度ドラッグ（Hot State）と確定コミット（Cold State）の分離**:
   - `onDragMove` / `onPointerMove`（60〜120Hz）のたびに `documentStore` を更新してはなりません。移動中は `sessionStore`（`activeDragDelta` / `drawingPreview`）のみを更新し、`onDragEnd` / `onPointerUp` の確定瞬間にのみ1回だけ `dispatchSlide(command)` を発行してください。

```tsx
// ❌ 禁止: React.memo した Layer の内部で s.project を丸ごと購読し、activeSlide を逆引きする
export const PitchGroundLayer = memo(function PitchGroundLayer({
  sceneGraph,
  listening,
}: PitchGroundLayerProps) {
  // ❌ これを書くと他フェーズの変更でも memo を貫通して再レンダーされる
  const project = useDocumentStore((s) => s.project);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const activeSlide = selectDomainActiveSlide(project, activePhaseId, activeSlideId);

  return (
    <Layer listening={listening}>
      {sceneGraph.groundZones.map((resolvedZone) => {
        // ❌ ドメインモデルの逆引き禁止（ResolvedSceneGraphDTO のデータのみで描画すること）
        const rawZone = activeSlide?.zones.find((z) => z.id === resolvedZone.id);
        return <ZoneNode key={resolvedZone.id} zone={rawZone} />;
      })}
    </Layer>
  );
});

// ✅ 必須: 描画データは Props の sceneGraph (ResolvedSceneGraphDTO) に完全一本化し、Store 購読は細粒度セレクタとアクションのみにする
export const PitchGroundLayer = memo(function PitchGroundLayer({
  sceneGraph,
  cleanRender,
  listening = true,
}: PitchGroundLayerProps) {
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const selectObject = useSessionStore((s) => s.selectObject);
  const activeTool = useSessionStore((s) => s.activeTool);
  const isLayerInteractive = !cleanRender && listening;

  return (
    <Layer id="pitch-ground-layer" listening={isLayerInteractive}>
      {sceneGraph.groundZones.map((zoneDto) => (
        <ZoneNode
          key={zoneDto.id}
          dto={zoneDto}
          isInteractive={isLayerInteractive && activeTool === 'select'}
          onSelect={selectObject}
          onCommit={dispatchSlide}
        />
      ))}
    </Layer>
  );
});
```

---

## 3. カメラ・チルト・パン・ズームを見据えた 5層レイヤー分離 (Layer Separation)

再描画コストを抑え、カメラ操作（ピッチの縦チルト・左右回転・パン・ズーム）および再生・出力時の「純粋描画（Clean Render）」で編集UIの映り込みを防ぐため、Konva Stage 内とオーバーレイは以下の **5層構造** に分離してください。

1. **Layer 1: `PitchGroundLayer`（地面・平面投影レイヤー）**:
   - ピッチ枠（`PitchFrame`）、地面に描かれるゾーン（`Zone`）、地面上の矢印・直線・コネクタ・ゴースト軌道のライン。
2. **Layer 2: `BillboardObjectLayer`（ビルボード・立ちオブジェクトレイヤー）**:
   - 選手マーカー、ボール、テキスト。
   - **ビルボード原則**: 基準位置 `(x, y)` はカメラ投影位置へ移動し、奥行きに応じた遠近スケール（`perspectiveScale`）が掛かるが、**マーカーの円や文字ラベル自体は縦に潰れず常にカメラ正面（正円・読める文字）を向く**構造にする。描画順は `compileSceneGraph` で解決された深さ（Y座標）ソート順に従う。
3. **Layer 3: `InteractionPreviewLayer`（作図プレビュー・編集補助レイヤー）**:
   - 作図中のプレビュー図形、範囲選択ボックス、選択ハイライト、頂点ハンドル。常時 `<Layer listening={false}>` とし、アニメーション再生中および出力時（`cleanRender === true`）は非表示にして出力結果に編集UIが映り込まない構造とする。
4. **Overlay 1: `BoundaryBoxOverlay`（画面基準の境界線枠レイヤー）**:
   - `TacticalPhase` 単位の `boundaryBox`（`16:9` スクリーン `0..100` 基準）と外側マスクを描画する。ピッチを傾けても境界線枠自体は常に画面に対して水平・垂直な矩形として動作する。
5. **Overlay 2: `HtmlHudOverlay`（オブジェクトオプション・境界線オプション）**:
   - 選択オブジェクトのスクリーン投影座標を購読して浮動表示される `ObjectOptions` 等。

---

## 4. ホスト非依存の Composable Core 設計 (Headless Annotation Core)

Web アプリ（Footics 本体戦術盤）と Chrome Extension（動画スクショ クイック編集）で描画機能を共有するため、特定のホストアプリに依存しない Core レイヤーを維持してください。
- **God Component の禁止**: 1つのコンポーネントにピッチ背景・選手22人・アノテーション・ツールバー・各種モーダルを直結してはならない。
- **頭脳（ロジック）と見た目（Renderer）の分離**: 選手マーカー、ボール、矢印、ゾーン等の全オブジェクトは、共通の操作制御と見た目（Webの2D丸マーカー / Extensionの3D足元リング）を分離して構成する。
- **Store Provider パターン**: グローバルシングルトンのストアに直接依存せず、`TacticalStoreProvider` 経由で初期状態を Props 注入し、マウント時のチラつき（Flicker）を根絶すること。
- **グローバルカスタムイベントの禁止**: `window.dispatchEvent` による暗黙的な連携を禁止し、Imperative Ref（`canvasRef.current.exportPng()`）または Context メソッドで明示的にやり取りすること。

---

## 5. 4層単一座標系アーキテクチャと投影パイプライン

メインキャンバスの大きさは常に不変とし、アスペクト比切替・リサイズ・カメラ操作に対して座標ズレを生まないよう、座標変換は以下の **4層単一座標系アーキテクチャ** に集約してください（各コンポーネントでの個別計算は厳禁）。

1. **第1層: スクリーン外枠（`16:9` 固定・`X: 0〜100, Y: 0〜100` 単一論理座標）**:
   - 全画面（ボード・レイアウト・エクスポート）の基準外枠は `16:9`（1920×1080）固定とし、ストアに保存される全座標は `16:9` スクリーン全体の `0〜100` とする。
   - 選手・ボールは `[0, 100]` にクランプされ、矢印・ゾーン・テキストは `pointerToNormalizedCoord(pos, vRect, { allowOverflow: true })` により `0〜100` 外への配置も許容する。
2. **第2層: 中央配置サブピッチと3D投影（`pitch-geometry.ts` & `canvas-screen-coordinates.ts`）**:
   - `16:9` スクリーン中央にアクティブフェーズの `aspectRatio`（`'16:9' | '4:5' | '9:16' | '1:1'`）のサブピッチ（`calculatePitchRect` / `getScreenOuterPitchRect` / `getScreenPitchBounds`）を内接配置する。
   - 3D視点投影およびスクリーン変換は `canvas-screen-coordinates.ts`（`worldToScreen` / `screenToWorld`, `DEFAULT_PITCH_PERSPECTIVE = 1200`）を通し、縦向きピッチの3D二重スケーリングを防止する。
3. **第3層: フェーズ単位の境界線クロップ（`TacticalPhase.boundaryBox`）**:
   - `aspectRatio` と `boundaryBox` は `TacticalPhase` 単位で独立保持し（`selectDomainActivePhaseAspectRatio` / `selectDomainActiveBoundaryBox` で購読）、比率切替は `boundaryBox` を一切書き換えない。
   - レイアウト画面・エクスポート画面は第1層＋第2層を `16:9`（1920×1080）で正規描画した上で、`boundaryBox`（`resolveBoundaryBoxPixelRect`）の内側領域をクロップ出力する。
4. **第4層: フォーメーション配置と比率変換（`getFormationActualPos` / `transformCoord`）**:
   - Full/Half コートモードおよびピッチの向きに基づき、`getScreenPitchBounds(aspectRatio)` 基準で単一変換を行う。

---

## 6. プラグイン型ツールとオブジェクトオプションへの一本化

1. **`CanvasToolPlugin` 契約（OCP 厳守）**:
   - 描画ツールやオブジェクトの追加・変更時に、既存の `Stage` や `PreviewLayer` に `switch / if` を追加することを禁じます。各ツールは「メタデータ」「生成ロジック」「ドラッグ中プレビュー」「配置後確定描画」をカプセル化し、カタログ注入で切り替えてください。
2. **オブジェクトオプション（`ObjectOptions`）への完全一本化**:
   - オブジェクトのプロパティ（色、太さ、視野角、コネクタ、選手情報変更、サイズ等）の編集 UI は、選択時にオブジェクトの近くへ浮動表示される `ObjectOptions` に一本化します。
