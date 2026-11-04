# TASK-149: boundary-box-layout-and-export-fullscreen

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-04
- **Target Files**:
  - `src/lib/types/tactical/slide.ts` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **デフォルト境界線の「全画面（16:9）」統一**:
  - ボード画面・レイアウト画面共通でデフォルト境界線を `x: 0, y: 0, width: 100, height: 100, 16:9` に統一。
  - `DEFAULT_BOUNDARY_BOX` を `DEFAULT_BOUNDARY_BOX_16_9` と等価な全画面設定にする。
- [x] 2. **境界線値の永続保持（OFF時も破棄しない）**:
  - 境界線をOFFに切り替えても、スライド内部で保持している (x, y, width, height) の座標・サイズ情報は保持され続ける。
  - 再度ONにした際、および再生時に保持された境界線値が継続利用される。
- [x] 3. **再生時の境界線外シネマティックマスク表示 ＆ 常時16:9維持**:
  - レイアウト画面（`tactical-split-preview-panel`）では再生時にキャンバスサイズが急変形せず、常時16:9（`aspect-video`）の一定サイズを維持。
  - 「切り抜きプレビュー／編集モード」の切り替えボタンを完全撤廃。
  - 静止時は境界線枠・オーバーレイを表示し、再生時は境界線外側を上品な半透明ダークグレー（シネマティックマスク）で覆う。境界線がOFFの場合でも保持されている枠情報（初期全画面以外）を反映する。
- [x] 4. **エクスポート画面（Export Modal）の完全全画面化**:
  - `export-modal.tsx` の `w-[96vw] h-[92vh]` 等の制限を撤廃し、ブラウザ端まで広がる `w-screen h-screen max-w-none max-h-none rounded-none` の完全全画面表示にする。
  - プレビュー領域を最大化し、境界線の切り抜き・マスク状態が正確に確認できるようにする。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs & Types
```ts
// src/lib/types/tactical/slide.ts
export const DEFAULT_BOUNDARY_BOX_16_9: BoundaryBox = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  enabled: true,
  visible: false,
  fitTarget: 'pitch',
};
export const DEFAULT_BOUNDARY_BOX = DEFAULT_BOUNDARY_BOX_16_9;
```

### 3.2 Key Contracts & Constants
```ts
// シネマティックマスク描画スタイル
// 境界線の外側領域（上・下・左・右）を覆う半透明ダークグレー
const CINEMATIC_MASK_FILL = 'rgba(5, 7, 12, 0.72)';
```

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: デフォルト境界線の16:9統一と永続保持 (Level 1)
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/types/tactical/slide.ts`, `tests/lib/types/tactical/slide.test.ts`
- **契約 (Interface)**:
  - `DEFAULT_BOUNDARY_BOX` を `DEFAULT_BOUNDARY_BOX_16_9` に統一。
  - スライドの初期境界線が 16:9 全画面（x:0, y:0, w:100, h:100）であることを保証。
- **Testing Strategy**:
  - `slide.test.ts` にて `DEFAULT_BOUNDARY_BOX` のプロパティ（x:0, y:0, width:100, height:100）を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red tests/lib/types/tactical/slide.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/types/tactical/slide.ts` PASS
- **Worker Handoff Log**:
  - `DEFAULT_BOUNDARY_BOX` を `DEFAULT_BOUNDARY_BOX_16_9` に統一。スライド初期境界線が16:9全画面（x:0, y:0, w:100, h:100, enabled:true, visible:false, fitTarget:'pitch'）に固定。

---

### Phase 2: レイアウト画面の常時16:9固定と切り替えボタン廃止 (Level 3)
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`
- **契約 (Interface)**:
  - `isCroppedPreview` state および「切り抜きプレビュー／編集モード」ボタンを削除。
  - コンテナサイズを再生有無に関わらず `aspect-video w-full max-h-full` で固定。
  - 再生時（`isPlaying`）は編集用のドラッグ枠を隠し、境界線外側のシネマティックマスクのみを表示。
- **Testing Strategy**:
  - `tactical-split-preview-panel.test.tsx` で切り替えボタンが存在しないこと、再生時もコンテナの aspect-video クラスが維持されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` ➔ 実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `isCroppedPreview` 及び切替ボタンを完全撤廃し、コンテナを常時 `aspect-video` に固定。再生時は編集枠を隠し、初期全画面以外の境界線枠情報に基づき外側シネマティックマスク（`rgba(5, 7, 12, 0.72)`）のみを表示。

---

### Phase 3: 再生時アニメーションの境界線外シネマティックマスク表示 (Level 2)
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx`
- **契約 (Interface)**:
  - プレビュー再生時のキャンバス描画において、クロップして拡大するのではなく、16:9全体を描画した上で境界線の外側（4領域）に半透明ダークグレー（`rgba(5, 7, 12, 0.72)`）のマスク矩形を描画（またはオーバーレイ連携）。
  - 境界線がOFFの場合でも、設定された境界線が全画面でなければマスクを適用。
- **Testing Strategy**:
  - `use-export-preview-animation.test.ts` 等で、境界線外マスク描画またはスタイル計算が正しく行われることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` ➔ 実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - 再生時は `previewWidth`/`previewHeight` を16:9ベース解像度（1920x1080）に維持してクロップを抑制し、`CINEMATIC_MASK_FILL`（`rgba(5, 7, 12, 0.72)`）による外側4領域マスク描画を適用。境界線OFF時も初期全画面以外ならマスク描画を継続。

---

### Phase 4: エクスポートモーダルの完全全画面化 (Level 3)
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/export/export-modal.tsx`
- **契約 (Interface)**:
  - `Dialog` のクラス名を `w-screen max-w-none h-screen max-h-none p-0 m-0 rounded-none border-none overflow-hidden flex flex-col space-y-0 select-none` に更新。
  - ブラウザ端までフルスクリーン化し、プレビュープレイヤーが最大領域を占有できるようにする。
- **Testing Strategy**:
  - `export-modal.test.tsx` でダイアログに `w-screen` `h-screen` `rounded-none` が適用されていることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/export/__tests__/export-modal.test.tsx` ➔ 実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `Dialog` のクラス名を `w-screen max-w-none h-screen max-h-none p-0 m-0 rounded-none border-none overflow-hidden flex flex-col space-y-0 select-none` に更新し、ブラウザ端まで広がる完全全画面表示に統一。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-11-04 19:58
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: デフォルト16:9統一・永続保持・常時16:9維持・マスク表示・完全全画面化が過不足なく実装されているか
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Store Provider経由の取得が守られ、Flickerやタイマーリークがないか
  - [x] 3. 設計負債 & 拡張性: SLAP/Shell Purity遵守、ボタン削除に伴う不要コードの完全除去
  - [x] 4. サイレント破壊 & 既存保護: 他のエクスポート形式（MP4/WebM）への悪影響がないか
- **Summary**:
  4大定性監査クリア。デフォルト境界線の16:9全画面統一、常時16:9比率維持とシネマティックマスク描画、エクスポートモーダルの完全全画面化がクリーンに実装されていることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
