# TASK-055: Step 3: iPhone 12 PWA 動画書き出し（一覧・プレビュー・無劣化DL）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-25
- **Target Files**:
  - `src/lib/tactical/export/share-payload.ts` (MODIFY)
  - `src/lib/tactical/export/share-store.ts` (MODIFY)
  - `src/app/api/tactical-export/share/route.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-video-exporter.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/share-payload.test.ts` (MODIFY)
  - `src/app/api/tactical-export/share/__tests__/route.test.ts` (MODIFY)
  - `package.json` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-share-overlay.tsx` (DELETE)
  - `src/features/tactical-unified/panels/export/use-export-share.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal-footer.tsx` (MODIFY)
  - `src/app/manifest.ts` (NEW)
  - `src/app/layout.tsx` (MODIFY)
  - `src/app/export/page.tsx` (NEW)
  - `src/app/export/share/[shareId]/page.tsx` (MODIFY)
  - `src/app/export/__tests__/export-pages.test.tsx` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. 共有ペイロードと描画同一性の拡張: `TacticalExportSharePayloadSchema` に `aspectRatio` (`'16:9' | '4:5' | '1:1' | '9:16'`), `boundaryBox`, `pitchTransform` を追加。`tactical-frame-renderer.ts` のフォント指定を `TACTICAL_CANVAS_FONT_FAMILY` (`Geist, "Geist Sans", ...`) に統一し、`tactical-video-exporter.ts` で `document.fonts?.ready` 待機および `pitchTransform` / `mvpMatrix` の `exportTacticalVideo` への伝播を行うこと。
- [x] 2. 共有プロジェクト一覧取得・削除 API: `share-store.ts` に `listSharedExportData()`（最新順最大50件）および `deleteSharedExportData(shareId)` を実装し、`GET /api/tactical-export/share`（`id` 未指定時に一覧返却）と `DELETE /api/tactical-export/share?id=...` で利用可能にすること。
- [x] 3. QRコード関連機能・依存パッケージの完全撤去: `package.json` から `qrcode` と `@types/qrcode` を削除し、`export-share-overlay.tsx` を削除。`useExportShare` から QR 生成を廃止して `aspectRatio` / `boundaryBox` / `pitchTransform` を含めて一覧登録（トースト通知）する方式に変更すること。
- [x] 4. PWA マニフェスト設定: `src/app/manifest.ts` (`start_url: '/export'`, `display: 'standalone'`) を新規作成し、`src/app/layout.tsx` の `metadata` に `appleWebApp` 設定を追加すること。
- [x] 5. iPhone専用「一覧画面 (`/export`) ➔ 詳細プレビュー・無劣化DL画面 (`/export/share/[shareId]`)」: `/export` で送信済み一覧表示・削除・詳細遷移を実装し、`/export/share/[shareId]` に `ExportPreviewPlayer`（ループ再生プレビュー）を組み込み、`exportMultiSlideMp4Video` に `aspectRatio` / `boundaryBox` / `pitchTransform` を渡して書き出し、完了後に直接ファイルダウンロードおよび Web Share API (`navigator.share({ files })`) によるファイル保存を提供すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { MetadataRoute } from 'next';
import { ExportPreviewPlayer } from '@/features/tactical-unified/panels/export/export-preview-player';
import { buildExportMVPMatrix } from '@/features/tactical-unified/core';
import { PITCH_BOUNDARY_CONFIGS } from '@/lib/tactical/pitch-geometry';
import type { AspectRatio, BoundaryBox, PitchTransform, Slide } from '@/lib/types/tactical-unified';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/tactical/export/share-payload.ts
export const AspectRatioSchema = z.enum(['16:9', '4:5', '1:1', '9:16']);

export interface TacticalExportShareSummary {
  shareId: string;
  title: string;
  createdAt: number;
  sceneCount: number;
  aspectRatio: AspectRatio;
  orientation: AnimationOrientation;
  hasBoundaryCrop: boolean;
}

// src/lib/tactical/export/share-store.ts
export async function listSharedExportData(): Promise<TacticalExportShareSummary[]>;
export async function deleteSharedExportData(shareId: string): Promise<boolean>;
export function clearSharedExportMemoryStore(): void; // テスト用リセット関数
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. share-payload.ts: 後方互換のため aspectRatio 未指定時は orientation === 'vertical' ? '9:16' : '16:9' にフォールバックさせる。
// 2. share-store.ts: KV保存時は '__index__' キーに TacticalExportShareSummary[] を保存し、memoryStore 併用時も createdAt 降順で返す。
// 3. tactical-frame-renderer.ts: export const TACTICAL_CANVAS_FONT_FAMILY = 'Geist, "Geist Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'; を定義し、全 ctx.font 指定箇所に適用する。
// 4. /export/share/[shareId]/page.tsx: stageWidth / stageHeight を 1080x1920 固定にせず、PITCH_BOUNDARY_CONFIGS[effectiveAspectRatio] を使用し、boundaryBox と pitchTransform (および buildExportMVPMatrix で生成した mvpMatrix) を exportMultiSlideMp4Video に渡すこと。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 共有データ契約・一覧ストア・API拡張 & 描画同一性（フォント・3D傾き伝播）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/share-payload.ts`
  - `src/lib/tactical/export/share-store.ts`
  - `src/app/api/tactical-export/share/route.ts`
  - `src/lib/tactical/export/tactical-frame-renderer.ts`
  - `src/lib/tactical/export/tactical-video-exporter.ts`
  - `src/lib/tactical/export/__tests__/share-payload.test.ts`
  - `src/app/api/tactical-export/share/__tests__/route.test.ts`
- **契約 (Interface)**:
  ```ts
  export async function listSharedExportData(): Promise<TacticalExportShareSummary[]>;
  export async function deleteSharedExportData(shareId: string): Promise<boolean>;
  export const TACTICAL_CANVAS_FONT_FAMILY: string;
  ```
- **Testing Strategy**:
  - `share-payload.test.ts`: `aspectRatio: '4:5'`, `boundaryBox`, `pitchTransform` を含むペイロードが検証を通過することをテスト。
  - `route.test.ts`: `POST` 後に `GET /api/tactical-export/share`（クエリなし）で一覧取得できること、`DELETE /api/tactical-export/share?id=...` で削除後に 404 になることをテスト。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/export/__tests__/share-payload.test.ts src/app/api/tactical-export/share/__tests__/route.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/export/share-payload.ts src/lib/tactical/export/share-store.ts src/app/api/tactical-export/share/route.ts src/lib/tactical/export/tactical-frame-renderer.ts src/lib/tactical/export/tactical-video-exporter.ts src/lib/tactical/export/__tests__/share-payload.test.ts src/app/api/tactical-export/share/__tests__/route.test.ts` PASS
- **Worker Handoff Log**:
  - Export: `AspectRatioSchema`, `TacticalExportShareSummary`, `listSharedExportData`, `deleteSharedExportData`, `clearSharedExportMemoryStore`, `TACTICAL_CANVAS_FONT_FAMILY`
  - Gotcha: `TacticalExportSharePayloadSchema` は `.transform` により `aspectRatio` 未指定時に `orientation` から自動補完。動画出力前に `document.fonts.ready` を待機。

### Phase 2: QRコード関連機能・依存パッケージの撤去 & PC側「iPhoneへ送信」への刷新
- **Worker Model**: `flash`
- **対象ファイル**:
  - `package.json`
  - `src/features/tactical-unified/panels/export/export-share-overlay.tsx` (DELETE)
  - `src/features/tactical-unified/panels/export/use-export-share.ts`
  - `src/features/tactical-unified/panels/export/export-modal.tsx`
  - `src/features/tactical-unified/panels/export/export-modal-footer.tsx`
- **契約 (Interface)**:
  ```ts
  export function useExportShare({ onError }: ShareOptions): {
    isCreatingShareLink: boolean;
    shareUrl: string | null;
    createShareLink: () => Promise<void>;
    clearShareLink: () => void;
  };
  ```
- **Testing Strategy**:
  - `useExportShare` が `qrcode` をインポートせず、`project.aspectRatio` とアクティブスライドの `boundaryBox` / `pitchTransform` を含めて `/api/tactical-export/share` に POST し、`toast.success` を呼ぶことを確認。
- **Tasks**:
  - [x] 1. 実装・不要ファイル削除・検証: `export-share-overlay.tsx` 削除、`package.json` から `qrcode` / `@types/qrcode` 削除、`use-export-share.ts` / `export-modal.tsx` / `export-modal-footer.tsx` 更新 ➔ `bun run ai:check src/features/tactical-unified/panels/export/use-export-share.ts src/features/tactical-unified/panels/export/export-modal.tsx src/features/tactical-unified/panels/export/export-modal-footer.tsx` PASS
- **Worker Handoff Log**:
  - Export: `useExportShare` (シグネチャから `qrCodeDataUrl` を廃止し `toast.success` 通知に変更)
  - Gotcha: `export-share-overlay.tsx` 削除完了。`package.json` から `qrcode` / `@types/qrcode` 削除完了。アクティブスライドの `boundaryBox` / `pitchTransform` および `aspectRatio` を共有ペイロードに追加。

### Phase 3: PWA マニフェスト設定 & iPhone専用「一覧画面 (`/export`) ➔ 詳細プレビュー・DL画面」の実装
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/app/manifest.ts` (NEW)
  - `src/app/layout.tsx`
  - `src/app/export/page.tsx` (NEW)
  - `src/app/export/share/[shareId]/page.tsx`
  - `src/app/export/__tests__/export-pages.test.tsx` (NEW)
- **契約 (Interface)**:
  ```ts
  export default function manifest(): MetadataRoute.Manifest;
  export default function ExportListPage(): React.JSX.Element;
  export default function StandaloneExportSharePage(): React.JSX.Element;
  ```
- **Testing Strategy**:
  - `src/app/export/__tests__/export-pages.test.tsx`:
    1. `ExportListPage`: `/api/tactical-export/share` から取得した一覧カード（タイトル、シーン数、アスペクト比バッジ、詳細リンク `/export/share/[shareId]`）が描画され、削除ボタンで DELETE が呼ばれること。
    2. `StandaloneExportSharePage`: 取得した `shareData`（`aspectRatio: '4:5'`, `boundaryBox` 付き）でプレビューが表示され、書き出し実行時に `exportMultiSlideMp4Video` が `aspectRatio: '4:5'` および `boundaryBox` を伴って呼ばれること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/app/export/__tests__/export-pages.test.tsx` ➔ 実装 ➔ `bun run ai:check src/app/manifest.ts src/app/layout.tsx src/app/export/page.tsx src/app/export/share/[shareId]/page.tsx src/app/export/__tests__/export-pages.test.tsx` PASS
- **Worker Handoff Log**:
  - Export: `default manifest` (`/src/app/manifest.ts`), `default ExportListPage` (`/src/app/export/page.tsx`), `default StandaloneExportSharePage` (`/src/app/export/share/[shareId]/page.tsx`)
  - Gotcha: `navigator.share` / `navigator.canShare` の TS 厳格検査（`'share' in navigator`）、`buildExportMVPMatrix` でのアスペクト比・解像度連動、コンポーネント 500 行上限を遵守。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-25 20:47
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証（Fix 1 による API・クライアント・テストモックのキー整合を確認）
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  Fix 1 の是正を確認。API (`GET /api/tactical-export/share`) における items/data 両キー返却、クライアント (`src/app/export/page.tsx`) での安全なフォールバック参照、テストモック (`export-pages.test.tsx`) の本番API整合化により、共有一覧表示の堅牢性が担保されました。4大定性監査（要件網羅性、ホスト境界・PWA設計、OCP・描画同一性、サイレント破壊防止）をすべてクリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->

### Fix 1 (2026-10-25)
- **Worker Model**: `flash`
- **Rejection Reason**: APIとクライアント間のキー不一致およびテストのハリボテ化（4大定性監査 ① 意図と実装の監査）。
  `GET /api/tactical-export/share` (一覧取得) は `{ success: true, items: [...] }` を返却するが、`src/app/export/page.tsx` では `json.data` を参照しているため、本番環境で一覧が常に空（0件）になる。また `src/app/export/__tests__/export-pages.test.tsx` のモックが実APIと異なり `{ data: mockList }` を返していたため検証をすり抜けていた。
- **Target Files**:
  - `src/app/export/page.tsx`
  - `src/app/export/__tests__/export-pages.test.tsx`
  - `src/app/api/tactical-export/share/route.ts`
- **Required Steps**:
  - [x] 1. `src/app/export/page.tsx` で `(json.items ?? json.data)` から一覧を取得するよう修正。
  - [x] 2. `src/app/api/tactical-export/share/route.ts` の GET 一覧返却時にも `{ success: true, items, data: items }` を返し、API側でも互換性と堅牢性を確保。
  - [x] 3. `src/app/export/__tests__/export-pages.test.tsx` のモックレスポンスを `{ success: true, items: mockList }` に修正し、本番APIとの整合性を担保。
  - [x] 4. `bun run ai:check src/app/export/page.tsx src/app/api/tactical-export/share/route.ts src/app/export/__tests__/export-pages.test.tsx` で PASS 確認。
