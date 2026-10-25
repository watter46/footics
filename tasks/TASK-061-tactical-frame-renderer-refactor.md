# TASK-061: tactical-frame-renderer-refactor

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/lib/tactical/export/renderers/renderer-context.ts` (NEW)
  - `src/lib/tactical/export/renderers/pitch-renderer.ts` (NEW)
  - `src/lib/tactical/export/renderers/zone-renderer.ts` (NEW)
  - `src/lib/tactical/export/renderers/arrow-renderer.ts` (NEW)
  - `src/lib/tactical/export/renderers/player-renderer.ts` (NEW)
  - `src/lib/tactical/export/renderers/ball-renderer.ts` (NEW)
  - `src/lib/tactical/export/renderers/text-renderer.ts` (NEW)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 外部公開シグネチャ（`renderTacticalFrameToCanvas`, `RenderTacticalFrameOptions`, `AnyCanvasRenderingContext2D`, `TACTICAL_CANVAS_FONT_FAMILY`, `SOCCER_BALL_*`, `isPauseFrame`, `getOpticalCenterX`）を100%維持すること。
- [x] 2. 描画要素（ピッチ、ゾーン、矢印・連携線、選手、ボール、テキスト）の描画ロジックが `renderers/` 配下の個別ファイルに分割され、単一責任（SRP）が満たされていること。
- [x] 3. `tactical-frame-renderer.ts` が約300行以下のファサード（座標変換・レイヤー順序管理）に縮小されていること。
- [x] 4. `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` (26テスト) を含む既存テストが 100% 通過し、ビジュアル回帰・副作用がないこと。
- [x] 5. Level 2以下のホスト非依存規約を厳守し、ブラウザ/OffscreenCanvasの双方で動作すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { AspectRatio, BoundaryBox, Slide, Player, Arrow, Zone, TacticalText, Ball } from '@/lib/tactical/types';
import type { AnyCanvasRenderingContext2D, FrameRenderContext } from './renderers/renderer-context';
import { renderPitchMarkings } from './renderers/pitch-renderer';
import { renderZones } from './renderers/zone-renderer';
import { renderConnectLines, renderArrows } from './renderers/arrow-renderer';
import { renderPlayers } from './renderers/player-renderer';
import { renderBall, SOCCER_BALL_PATCH_PATHS, SOCCER_BALL_SEAM_LINES } from './renderers/ball-renderer';
import { renderTexts } from './renderers/text-renderer';
```

### 3.2 Key Interfaces & Types
```ts
export interface FrameRenderContext {
  ctx: AnyCanvasRenderingContext2D;
  w: number;
  h: number;
  m?: Float32Array | null;
  toScreenX: (normX: number) => number;
  toScreenY: (normY: number) => number;
  toScreenSizeX: (sizeNorm: number) => number;
  toScreenSizeY: (sizeNorm: number) => number;
  projectObjToScreen: (normX: number, normY: number) => { x: number; y: number };
  snap: (n: number) => number;
}
```

### 3.3 Implementation Notes & Gotchas
```ts
// 1. 各要素レンダラーは FrameRenderContext を受け取り、内部描画のみを行う純粋関数とする。
// 2. 共通フォント TACTICAL_CANVAS_FONT_FAMILY や光学中央 getOpticalCenterX は renderer-context または専用ユーティリティで共有する。
// 3. キャッシュパス（Path2D）の初期化はモジュールスコープで行い、SSR/OffscreenCanvas で Path2D が未定義の場合はフォールバックする既存処理を維持する。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 要素別レンダラー群の抽出
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/export/renderers/*.ts` (NEW)
- **契約 (Interface)**:
  ```ts
  export function renderPitch(ctx: FrameRenderContext, aspectRatio: AspectRatio, transparent: boolean): void;
  export function renderZones(ctx: FrameRenderContext, zones: Record<string, Zone>): void;
  export function renderConnectLines(ctx: FrameRenderContext, players: Record<string, Player>): void;
  export function renderArrows(ctx: FrameRenderContext, arrows: Record<string, Arrow>): void;
  export function renderPlayers(ctx: FrameRenderContext, players: Record<string, Player>, playerPhotos?: Record<string, CanvasImageSource | null | undefined>): void;
  export function renderBall(ctx: FrameRenderContext, ball: Ball): void;
  export function renderTexts(ctx: FrameRenderContext, texts: Record<string, TacticalText>): void;
  ```
- **Testing Strategy**: `bun run ai:check src/lib/tactical/export/renderers/`
- **Tasks**:
  - [x] 1. `renderer-context.ts` に共通コンテキスト型と描画ユーティリティを定義
  - [x] 2. `pitch-renderer.ts`, `zone-renderer.ts`, `arrow-renderer.ts`, `player-renderer.ts`, `ball-renderer.ts`, `text-renderer.ts` にロジックを抽出
  - [x] 3. `bun run ai:check src/lib/tactical/export/renderers/` PASS
- **Worker Handoff Log**:
  - `renderer-context.ts`: `FrameRenderContext`, `AnyCanvasRenderingContext2D`, `TACTICAL_CANVAS_FONT_FAMILY`, `getOpticalCenterX` を集約定義。
  - 各要素レンダラー（`pitch`, `zone`, `arrow`, `player`, `ball`, `text`）を純粋描画関数として抽出完了。

---

### Phase 2: ファサード統合と回帰検証
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/export/tactical-frame-renderer.ts`
- **契約 (Interface)**:
  ```ts
  export function renderTacticalFrameToCanvas(ctx: AnyCanvasRenderingContext2D, options: RenderTacticalFrameOptions): void;
  ```
- **Testing Strategy**: `rtk vitest run src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`
- **Tasks**:
  - [x] 1. `tactical-frame-renderer.ts` を各レンダラーの呼出ファサードとして再構成し不要コードを除去
  - [x] 2. 外部エクスポート互換性を確認（re-export 含む）
  - [x] 3. `bun run ai:check src/lib/tactical/export/tactical-frame-renderer.ts` PASS
- **Worker Handoff Log**:
  - `tactical-frame-renderer.ts` を1366行から215行の軽量ファサードに再構成。既存の外部公開シグネチャ・型定義を完全維持し、全26テストがPASS。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26 04:35
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 公開シグネチャ維持、描画結果の等価性、全26テストPASS
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Canvas/OffscreenCanvas互換
  - [x] 3. 設計負債 & 拡張性: SRPによる要素別モジュール分割、OCP（新規要素追加時の局所性）
  - [x] 4. サイレント破壊 & 既存保護: 既存インポート側の無停止互換性維持
- **Summary**: 1,366行の巨大レンダラーを229行の純粋ファサードと各要素別（ピッチ、ゾーン、矢印、選手、ボール、テキスト）の単一責任モジュールへ綺麗に分離。外部公開シグネチャの完全維持、RAII型Canvas状態管理（ctx.save/restore）、OffscreenCanvas互換性が完璧に担保されていることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
