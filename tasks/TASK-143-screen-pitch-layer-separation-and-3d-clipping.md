# TASK-143: screen-pitch-layer-separation-and-3d-clipping

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-03
- **Target Files**:
  - `src/lib/tactical/export/renderers/renderer-context.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/pitch-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/pitch-markings-3d.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/pitch-renderer-cinematic.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. スクリーン層（16:9背景）とピッチ/カメラ描画層の分離: `renderScreenBackground` をキャンバス全面（`w × h`）の最背面レイヤーとして独立描画し、ピッチおよびオブジェクトの2D座標変換（`toScreenX/Y/SizeX/SizeY`）は `calculatePitchRect({ width: w, height: h }, aspectRatio)` で算出した中央ピッチ枠を基準とすることで、16:9スクリーン内に4:5等のピッチが歪まず配置され、2D時（`m === null`）と3D時（`m !== null`）でピッチサイズがジャンプしないこと
- [x] 2. 3Dカメラ拡大・傾斜時の白い直線（背面ワープ）根絶: 3D透視投影において頂点がカメラ手前平面（`clipW < 0.05`）の背後へ回り込んだ際、符号反転による画面横断ワープ線（白い直線）が発生しないよう、同次座標空間での Near-plane（`w = 0.05`）線分クリッピングおよびポリゴンクリッピングを導入すること
- [x] 3. レイアウト画面の16:9フルスクリーン化とScreen背景反映: `TacticalSplitPreviewPanel` のキャンバス枠を常に `16:9`（1920×1080、`boundaryBox: null`）で描画し、ストアの `project.screenBackground` を `useExportPreviewAnimation` 経由で `renderTacticalFrameToCanvas` へ伝播させ、Screenタブでの単色ダーク/シネマティック切替が即時反映されること（画面上部の旧 `SplitPreviewCameraBar` は廃止）
- [x] 4. レイアウト画面のSpaceキー再生同期: `TacticalSplitPreviewPanel` のローカル `isPlaying` 独自管理を廃止してストアの `isPlaying` / `togglePlayback` と同期させ、レイアウトモードで Space キーを押した際にもタイムラインと映像が確実に同期再生/停止されること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { calculatePitchRect } from '@/lib/tactical/pitch-geometry';
import { renderScreenBackground, renderPitch } from './renderers/pitch-renderer';
import type { AspectRatio, ScreenBackgroundConfig } from '@/lib/types/tactical-unified';
```

### 3.2 Key Interfaces & Types
```ts
export interface FrameRenderContext {
  ctx: AnyCanvasRenderingContext2D;
  w: number;
  h: number;
  m: Float32Array | null;
  toScreenX: (normX: number) => number;
  toScreenY: (normY: number) => number;
  toScreenSizeX: (normSize: number) => number;
  toScreenSizeY: (normSize: number) => number;
  projectObjToScreen: (norm100X: number, norm100Y: number) => { x: number; y: number };
  /** 3D線分をNear-plane (clipW >= 0.05) でクリップして画面座標ペアを返す（両方カメラ背後なら null） */
  project3DSegment?: (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) => [{ x: number; y: number }, { x: number; y: number }] | null;
  snap: (v: number) => number;
}

export interface UseExportPreviewAnimationParams {
  slides: Slide[];
  aspectRatio: AspectRatio;
  /** キャンバス自体の出力アスペクト比（省略時は aspectRatio、レイアウト画面では '16:9' 固定） */
  canvasAspectRatio?: AspectRatio;
  boundaryBox?: BoundaryBox | null;
  pitchTransform?: PitchTransform | null;
  photos?: Record<string, string>;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
  screenBackground?: ScreenBackgroundConfig;
  externalIsPlaying?: boolean;
  onToggleExternalPlay?: () => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  timeLabelRef: React.RefObject<HTMLSpanElement | null>;
  sliderRef: React.RefObject<HTMLInputElement | null>;
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
- **2D/3Dピッチ枠の統一**: `tactical-frame-renderer.ts` で `const pitchRect = calculatePitchRect({ width: w, height: h }, aspectRatio);` を算出し、`toScreenX = (normX) => pitchRect.x + (normX / 100) * pitchRect.width`、`toScreenY = (normY) => pitchRect.y + (normY / 100) * pitchRect.height`、`toScreenSizeX = (normSize) => (normSize / 100) * pitchRect.width`、`toScreenSizeY = (normSize) => (normSize / 100) * pitchRect.height` とする。これにより `w=1920, h=1080` (16:9) キャンバス上に `aspectRatio='4:5'` のピッチを描画しても中央に 4:5 で配置される。
- **白い直線の防止 (`project3DSegment`)**: `clipW = modelX * m[3] + modelY * m[7] + m[15]` において `NEAR_W = 0.05` とし、2端点 `(A, B)` のうち片方が `clipW < NEAR_W` の場合は `t = (NEAR_W - clipW_A) / (clipW_B - clipW_A)` で Clip 空間座標 `(clipX, clipY, clipW)` を線形補間してから `ndcX = clipX / clipW` で画面座標に変換する。両方 `clipW < NEAR_W` なら `null` を返して描画をスキップする。`pitch-markings-3d.ts` の `draw3DLine`, `draw3DQuad`, `draw3DArc` でこのクリッピングを使用する。
- **再生同期**: `TacticalSplitPreviewPanel` ではストアの `isPlaying` と `togglePlayback` を `useTacticalUnifiedStoreContext` から取得し、`useExportPreviewAnimation` の `externalIsPlaying: isPlaying`, `onToggleExternalPlay: togglePlayback` に渡す。

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: スクリーン層とピッチ/カメラ層の分離 & 3D Near-plane クリッピング（白い直線解消）
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/export/renderers/renderer-context.ts`, `src/lib/tactical/export/tactical-frame-renderer.ts`, `src/lib/tactical/export/renderers/pitch-renderer.ts`, `src/lib/tactical/export/renderers/pitch-markings-3d.ts`, `src/lib/tactical/export/__tests__/pitch-renderer-cinematic.test.ts`
- **契約 (Interface)**:
  ```ts
  export function renderScreenBackground(
    ctx: FrameRenderContext['ctx'],
    w: number,
    h: number,
    screenBackground?: ScreenBackgroundConfig,
  ): void;
  ```
- **Testing Strategy**: `src/lib/tactical/export/__tests__/pitch-renderer-cinematic.test.ts` にて、(1) 1920×1080 キャンバスに `aspectRatio: '4:5'` を渡した際にスクリーン背景が 1920×1080 全面に塗られ、ピッチは中央の 4:5 領域（x=528, width=864）に描画されること、(2) 高倍率ズーム（`zoom: 2.5`）＋深いチルト（`tilt: 58, yaw: 45`）でカメラ背後に頂点が回り込んでも画面外への反転ワープ線（白い直線）が発生しないことを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/export/__tests__/pitch-renderer-cinematic.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/export/tactical-frame-renderer.ts src/lib/tactical/export/renderers/pitch-renderer.ts src/lib/tactical/export/renderers/pitch-markings-3d.ts src/lib/tactical/export/__tests__/pitch-renderer-cinematic.test.ts` PASS
- **Worker Handoff Log**:
  - export: `renderScreenBackground` (pitch-renderer), `NEAR_PLANE_W`, `project3DPoint`, `project3DLineSegment` (renderer-context)。2D座標系は calculatePitchRect 基準に統一、3D線分は Near-plane (w=0.05) でクリップ。

---

### Phase 2: レイアウト画面の16:9フルスクリーン化・Screen背景接続・Spaceキー再生同期
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`, `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`, `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`
- **契約 (Interface)**:
  ```ts
  export function TacticalSplitPreviewPanel(): React.ReactElement;
  ```
- **Testing Strategy**: `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` にて、(1) プロジェクトの `aspectRatio` が `'4:5'` でもレイアウト画面の canvas サイズが 1920×1080（`16:9`）であること、(2) `project.screenBackground`（`'dark'` / `'cinematic'`）の変更がフレーム描画に反映されること、(3) ストアの `isPlaying` が `true` になった際（Spaceキー押下時）にアニメーションループが再生開始されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/export/use-export-preview-animation.ts src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` PASS
- **Worker Handoff Log**:
  - `TacticalSplitPreviewPanel`: `SplitPreviewCameraBar` 廃止、16:9 (1920x1080) フルスクリーン固定、Store の `isPlaying`/`togglePlayback`/`screenBackground` と同期。テクスチャ読込は `load-marble-texture.ts` に分離。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-03
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  - 16:9 背景全面描画と中央ピッチ矩形基準の 2D/3D 統一によりジャンプを防止。
  - 同次座標 Near-plane クリッピングにより 3D 反転ワープ線を完全根絶。
  - レイアウト画面の 16:9 フルスクリーン化および Store の `isPlaying` / `screenBackground` 伝播を確認。全テスト PASS。

## 6. Rejections / Additional Tasks (不可逆修正欄)
