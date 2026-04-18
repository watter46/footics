---
trigger: always_on
description: tldrawを用いた開発におけるベストプラクティスと実装方針
---

---
trigger: always_on
globs: ["**/tldraw/**/*.tsx", "**/editor/**/*.tsx"]
---

# tldraw 開発ガイドライン

**Activation:** This rule is **ALWAYS ON** for all files (`"**/tldraw/**/*.tsx", "**/editor/**/*.tsx"*`).


本プロジェクト（video-canvas等）における `tldraw` (v2/v3以降) の開発・実装ガイドラインです。パフォーマンス、カスタムシェイプの実装、UI/UXのカスタマイズに関するベストプラクティスを定めます。

## 1. 状態管理と副作用 (State & Side Effects)

- **バッチ処理 (`editor.run`)**: 複数の状態更新操作（シェイプの作成、更新、削除等）を行う場合は、必ず `editor.run(() => { ... })` で処理をラップしてください。これにより不要な再レンダリングを防ぎます。
  - **履歴の制御**: 変更をUndo/Redoスタックに追加したくない場合は、オプション `{ history: 'ignore' }` を指定してください。
    ```typescript
    editor.run(() => {
      // 複数の変更処理
    }, { history: 'ignore' });
    ```
- **サイドエフェクトの管理**: 他のシェイプとの同期や、作成直前のバリデーションが必要な場合は、コンポーネント内ではなく `editor.sideEffects.registerBeforeChangeHandler` 等のフックを利用してください。
- **リアクティブUI**: カスタムUIコンポーネントがエディタの状態（選択ツール、選択中のシェイプなど）に依存する場合は、常に `tldraw` 提供の `track()` ユーティリティでコンポーネントをラップしてください。

## 2. カスタムシェイプの開発 (Custom Shape Development)

- **Utilの継承と使い分け**:
  - 矩形（バウンディングボックス）ベースの単純な形状の場合は `BaseBoxShapeUtil` を継承します。
  - 特殊なプロポーションや自由形状（ポリゴン、線など）の場合は `ShapeUtil` を直接継承します。
- **ジオメトリ (`getGeometry`) の正確性**: `getGeometry()` が返す形状は、選択領域や当たり判定に直結します。描画する形と完全に一致する正確なジオメトリを返してください。計算が重い場合は適切にキャッシュを行ってください。
- **型とバリデーション**: カスタムプロパティ（`props`）の定義には、必ず `T` (tldraw Validator) を使用し、堅牢な型検証を保証してください。
- **マイグレーション**: スキーマが変わる可能性に備え、初期実装時から `createShapePropsMigrationSequence` を使用してマイグレーション定義のひな形を用意してください。

## 3. パフォーマンス最適化 (Performance)

- **Culling (カリング) の維持**: `tldraw` の自動カリングメカニズムを阻害しないように、カスタムシェイプ内で不必要に `display` プロパティを上書きしないでください。
- **LOD (Level of Detail)**: `editor.getEfficientZoomLevel()` を活用し、ズームレベルが低い（視覚的に小さい）状態では、細かい描画（テキストの縁取りや微細なパス、影）を簡略化・省略してコンポジットの負荷を減らしてください。
- **静的コンポーネントの原則**: `component()` メソッドの内部で重い計算や過度なアニメーションを行わないでください。アニメーションが必要な場合は、リアクティブシステムとの相互作用に注意し、描画負荷を最小限に抑えます。

## 4. UIカスタマイズ (UI Customization)

- **Overridesの活用**: 新規ツールの追加や既存構成要素の変更には、`<Tldraw>` の `overrides` プロップを用いて `tools` や `actions` を上書きします。
- **デフォルトUIの非表示化**: アプリケーション特化のクリーンなUIを提供するため、不要なデフォルトコンポーネント（`HelpMenu`, `MainMenu`, `PageMenu`, `NavigationPanel`, `DebugPanel` など）は、`components` プロップで `null` を指定して非表示化します。

## 5. アセット (Assets) とシステム設定

- **アセット管理**: 外部画像やリソースをキャンバスに配置する際は、直接URLをシェイプに埋め込むのではなく、必ず `editor.createAssets()` を使用してアセットとして登録した上で利用してください。
- **UXの調整**: 初期化時 (`onMount`) に必要に応じて `editor.user.updateUserPreferences({ isSnapMode: true })` などを呼び出し、Figmaライクなスナップなど、ユーザー体験をプロジェクトの方向に合わせます。

## 6. Footics プロジェクト固有の命名と配置

- **ファイルの配置基準**: カスタムツール・シェイプに関するファイルは、`src/components/features/editor/tldraw/`（または当該機能の直下）に配置し、機能ごとに集約します。
- **命名規則**:
  - シェイプユーティリティ: `[Name]ShapeUtil` (例: `ZoneCircleShapeUtil`)
  - ツールユーティリティ: `[Name]Tool` (例: `ZoneCircleTool`)
  - スタイル・定数定義: `[name]-styles.ts`
- **スタイルの再利用**: `ZONE_STROKE_WIDTH` など、プロジェクト全体で統一すべきスタイル値は共通ファイルから import し、ハードコードを避けてください。

## 7. Component Architecture (コンポーネント構成)

- **原則:** tldraw エディタ、カスタム UI (Overlay)、およびツール設定を明確に分離する。
- **行動指針:**
    - `Canvas`: `tldraw` エディタ本体をラップし、イベントや初期化を管理する。
    - `Overlay`: エディタの上に重なる UI（ツールバー、インスペクタ）。`pointer-events: none` と `pointer-events: auto` を適切に使い分ける。
    - `Panel`: 各種設定項目（色、太さなど）。shadcn/ui のコンポーネントをベースにカスタマイズする。

## 8. State Management Integration (状態管理の統合)

- **原則:** React の `useState` と `editor` のステートを混在させず、適切に同期する。
- **行動指針:**
    - エディタのプロパティ（色やスタイル）は、`editor.user.updateUserPreferences` や `editor.setStyleForSelectedShapes` を通じて操作する。
    - UI 側で保持すべきステート（パネルの開閉、ドラッグ中フラグなど）は Zustand または `useState` で管理する。