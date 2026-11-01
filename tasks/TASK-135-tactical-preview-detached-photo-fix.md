# TASK-135: tactical-preview-detached-photo-fix

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-01
- **Target Files**:
  - `src/lib/tactical/export/renderers/player-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` (MODIFY)
  - `src/features/tactical-unified/__tests__/video-export.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `player-renderer.ts`: `photoSource` が detached な `ImageBitmap`（`width === 0 && height === 0`）の場合は描画をスキップし、背番号表示へフォールバックすること。
- [x] 2. `player-renderer.ts`: `ctx.drawImage` 呼び出しを `try ... catch` で保護し、万が一 `InvalidStateError` 等の例外が発生しても画面やアニメーションがクラッシュせず、背番号表示へフォールバックすること。
- [x] 3. `use-export-preview-animation.ts`: スライド変更や再生・停止切り替え（`photoSignature` 更新）時に使用中の `ImageBitmap` を即座に `close()` 破棄せず、キャッシュを安全に維持・マージすること（再生開始時の detached エラーおよび Flicker 根絶）。
- [x] 4. `use-export-preview-animation.ts`: フック／コンポーネントのアンマウント時にのみ、保持していた全 `ImageBitmap` を一括して `close()` 破棄すること（RAII 副作用クリーンアップ厳守）。
- [x] 5. `tactical-split-preview-panel.tsx`: `slides: isPlaying ? slides : previewSlides` の配列切り替えを排除し、常に全スライド配列（`slides`）を一貫して渡すこと。
- [x] 6. 差分スコープテストおよび型検査（`bun run ai:check`）が exit code 0 で全件 PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { FrameRenderContext } from './renderer-context';
import type { InterpolatedPlayerState } from '@/lib/tactical/unified-interpolation';
import { preloadSlidePlayerPhotos } from '@/lib/tactical/export/share-payload';
```

### 3.2 Key Interfaces & Types
```ts
// playerPhotos マップ型
export type PlayerPhotoMap = Record<string, CanvasImageSource | null | undefined>;

// ImageBitmap 安全性チェックヘルパー
function isDrawablePhoto(source: CanvasImageSource | null | undefined): boolean {
  if (!source) return false;
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    return source.width > 0 && source.height > 0;
  }
  return true;
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
- **Zero-Flicker & RAII (CRITICAL)**:
  - `use-export-preview-animation.ts` の `useEffect` cleanup で `bm.close()` を呼ぶと、次の `preloadSlidePlayerPhotos` 完了までの間に描画されたフレームで detached エラーになる。
  - キャッシュ用の Map または Ref（`loadedBitmapsRef`）を保持し、新旧で同じ画像キーがあれば再利用、コンポーネントの unmount 時にのみ Ref 内の全ビットマップを `close()` する。
- **Store Provider 契約**:
  - `tactical-split-preview-panel.tsx` は Level 3 パネル。ストア直接アクセスは Context Selector 経由を維持。
- **2D / 3D 描画のフォールバック**:
  - `player-renderer.ts` で写真描画に失敗またはスキップされた場合、`!photoRendered` フラグにより通常の背番号描画（`showInsideNumber`）と外枠ストローク（`strokeWidth`）を有効化する。

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 選手写真レンダラーの detached 防御と背番号フォールバック
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/renderers/player-renderer.ts`
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`
- **契約 (Interface)**:
  ```ts
  export function renderPlayers(
    context: FrameRenderContext,
    players: Record<string, InterpolatedPlayerState>,
    playerPhotos?: Record<string, CanvasImageSource | null | undefined>,
  ): void;
  ```
- **Testing Strategy**:
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`:
    - detached な ImageBitmap（`width: 0, height: 0`）を渡した際、`ctx.drawImage` が呼ばれず背番号がフォールバック描画されること。
    - `ctx.drawImage` が `InvalidStateError` をスローした場合でも例外を捕捉し、背番号がフォールバック描画されて関数が正常終了すること。
- **Tasks**:
  - [x] 1. TDD RED: `tactical-frame-renderer.test.ts` に detached 画像および drawImage 例外時のフォールバックテストを追加。
  - [x] 2. TDD GREEN: `player-renderer.ts` に安全判定（`isDrawablePhoto`）と `try ... catch` を追加し、描画成功フラグ（`photoRendered`）を用いて失敗時は背番号描画・外枠ストロークを有効化。
  - [x] 3. `bun run ai:check src/lib/tactical/export/renderers/player-renderer.ts src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` で検証 PASS。
- **Worker Handoff Log**:
  - `renderPlayers` 内で `isDrawablePhoto` による detached ImageBitmap（`width === 0 || height === 0`）スキップ判定および `try ... catch`（例外時 `ctx.restore()` 呼出担保）を導入し、`photoRendered` フラグで背番号・外枠描画へ安全にフォールバック。

---

### Phase 2: プレビューアニメーションフックのビットマップライフサイクル健全化とスライド配列一貫化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`
  - `src/features/tactical-unified/__tests__/video-export.test.ts`
- **契約 (Interface)**:
  ```ts
  export function useExportPreviewAnimation(params: UseExportPreviewAnimationParams): { ... };
  ```
- **Testing Strategy**:
  - `src/features/tactical-unified/__tests__/video-export.test.ts`:
    - `useExportPreviewAnimation` でスライド変更時や再実行時にもビットマップが即座に `close()` されず、アンマウント時にのみ `close()` されること（RAII 副作用クリーンアップ厳守）。
- **Tasks**:
  - [x] 1. TDD RED: `video-export.test.ts` に `useExportPreviewAnimation` のキャッシュ維持・アンマウント時クリーンアップテストを追加。
  - [x] 2. TDD GREEN: `use-export-preview-animation.ts` のビットマップライフサイクルをアンマウント時一括解放に改修（`loadedBitmapsRef` によるキャッシュ維持）。
  - [x] 3. `tactical-split-preview-panel.tsx` の `slides` 渡しを常に全スライド配列（`slides`）に統一（`previewSlides` の不要な切り替えを排除）。
  - [x] 4. `bun run ai:check src/features/tactical-unified/panels/export/use-export-preview-animation.ts src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx src/features/tactical-unified/__tests__/video-export.test.ts` で検証 PASS。
- **Worker Handoff Log**:
  - `loadedBitmapsRef` によるキャッシュ蓄積とアンマウント時一括 `close()` (RAII) を実装。`TacticalSplitPreviewPanel` は常に全 `slides` を渡すよう一貫化。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-01 22:45
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  detached な ImageBitmap の判定・try-catch 例外捕捉による安全な背番号フォールバックと、useExportPreviewAnimation でのキャッシュ蓄積・アンマウント時一括 close (RAII) が高精度に実装され、受入要件および4大定性監査基準を全てクリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
