# TASK-169: iOSエクスポートのプレビュー・1080p動画完全一致化

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-09
- **Target Files**:
  - `src/lib/tactical/export/share-payload.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-share.ts` (MODIFY)
  - `src/lib/tactical/export/video-crop-calc.ts` (MODIFY)
  - `src/lib/tactical/export/video-export-types.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-video-exporter.ts` (MODIFY)
  - `src/lib/tactical/export/video-mediabunny-export.ts` (MODIFY)
  - `src/features/tactical-unified/components/use-share-page-export.ts` (MODIFY)
  - `src/features/tactical-unified/components/shared-export-view.tsx` (MODIFY)
  - `src/features/tactical-unified/components/share-page-client-view.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **iPhone送信データの完全性**: PC側からiPhoneへ共有データを送信する際、フェーズの境界線枠（`activePhase.boundaryBox`）、フェーズのアスペクト比（`activePhase.aspectRatio`）、ディレクターカメラ（`activePhase.directorCamera`）、シネマティック背景（`project.screenBackground`）が脱落せず JSON ペイロードに正確に格納・復元されること
- [x] 2. **1080p フルHD固定出力**: 動画クロップ計算（`calculateBoundaryCrop`）における 720p へのダウンスケール判定を完全撤廃し、全アスペクト比（16:9, 9:16, 4:5, 1:1）において 1080p（FHD基準）固定（8の倍数アライン）で動画がエンコードされること
- [x] 3. **動画レンダリングエンジンへの完全貫通**: `exportMultiSlideMp4Video` および `video-mediabunny-export.ts` が `directorCamera`, `screenBackground`, `baseWidth`, `baseHeight` を漏れなく受け取り、各フレームの `renderTacticalFrameToCanvas` 呼び出しに渡して動画内でもカメラワークと背景が描画されること
- [x] 4. **iOS Safari プレビュー高さ 0px 畳み込みの解消**: `shared-export-view.tsx` および `share-page-client-view.tsx` において、`ExportPreviewPlayer` を囲むコンテナに確定した高さ（`h-[45vh] min-h-[300px] max-h-[520px]` 等）を適用し、iOS Safari でプレビューが消滅するバグを解消すること
- [x] 5. **ホスト境界と Store 非依存化**: `use-export-preview-animation.ts` において、Props で渡されたカメラ・背景・視認性設定を最優先で使用し、Store Provider が存在しない共有スタンドアロン画面でも初期チラつきや参照エラーを起こさずにプレビューを描画できること
- [x] 6. **レイアウト画面の完全非破壊**: 戦術ボード本体（Konva キャンバス、選手・ボールドラッグ、フォーメーション配置等）のファイルおよびロジックは一切変更せず、既存の「4層単一座標系」の正本ルールを保護すること

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **上流（レイアウト編集画面）の完全非破壊**: TASK-154 で確立された「4層単一座標系（第1層 16:9固定スクリーン 0..100 ➔ 第2層 サブピッチ ➔ 第3層 フェーズBoundaryBoxクロップ）」は Footics の絶対的な正本である。レイアウト編集側のコード（Konva、選手移動、ドラッグ等）は 1 行も変更してはならない。
  2. **1080p 固定（FHD Guarantee）**: 720p（1280×720）への自動縮小は行わない。すべての動画出力は 1080p（1920×1080, 1080×1920, 1080×1350, 1080×1080）を基準とし、8ピクセル・マクロブロックアラインメント（GPUハードウェアエンコーダー要件）を満たすこと。
  3. **Level 2 コンポーネントのホスト境界**: 共有画面プレビュー（`ExportPreviewPlayer`）は Web と iOS で共用される Level 2 / ドメインUIパーツである。グローバルストア（Zustand）の存在を前提とせず、Props で注入された確定データを優先して描画を完結させること。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx` — PCエクスポートモーダルプレビュー（既存の描画が破壊されないこと）
  - `src/features/tactical-unified/components/shared-export-view.tsx` — iPhone共有画面
  - `src/features/tactical-unified/components/share-page-client-view.tsx` — iPhone共有画面（クライアント版）
  - `src/features/tactical-unified/components/use-share-page-export.ts` — iPhone動画エクスポートフック

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs & Interfaces
```ts
// src/lib/tactical/export/share-payload.ts
import {
  type AspectRatio,
  type BoundaryBox,
  BoundaryBoxSchema,
  type DirectorCameraTrack,
  DirectorCameraTrackSchema,
  type PitchAppearanceConfig,
  PitchAppearanceConfigSchema,
  type PitchTransform,
  PitchTransformSchema,
  type ScreenBackgroundConfig,
  ScreenBackgroundConfigSchema,
} from '@/lib/types/tactical-unified';

// src/lib/tactical/export/video-export-types.ts
export interface VideoExportOptions {
  // ... existing fields ...
  directorCamera?: DirectorCameraTrack | null;
  directorCameraOptions?: ResolveSyntheticDirectorCameraOptions;
  screenBackground?: ScreenBackgroundConfig;
}
```

### 3.2 1080p 固定基準解像度テーブル
```ts
// アスペクト比ごとの FHD 基準寸法
// 16:9 ➔ 1920 × 1080
// 9:16 ➔ 1080 × 1920
// 4:5  ➔ 1080 × 1350
// 1:1  ➔ 1080 × 1080
```

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 通信データ層（スキーマ拡張・フェーズ正本データの送信化）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/share-payload.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-share.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/share-payload.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/__tests__/use-export-share.test.ts` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `TacticalExportSharePayloadSchema`（`src/lib/tactical/export/share-payload.ts`）に以下を追加:
     ```ts
     directorCamera: DirectorCameraTrackSchema.nullable().optional(),
     screenBackground: ScreenBackgroundConfigSchema.nullable().optional(),
     ```
     `TacticalExportSharePayload` 型にも `directorCamera?: DirectorCameraTrack | null` と `screenBackground?: ScreenBackgroundConfig` を反映。
  2. `useExportShare`（`src/features/tactical-unified/panels/export/use-export-share.ts`）:
     - `selectActivePhase(state)` を取得。
     - ペイロード構築ロジックを以下のように修正（フェーズ正本の完全適用）:
     ```ts
     const activePhase = selectActivePhase(state);
     const activeSlide = selectActiveSlide(state);
     const currentSlides = selectActivePhaseSlides(state);
     const photos = await packPlayerPhotos(currentSlides);

     const effectiveAspectRatio = activePhase?.aspectRatio ?? project.aspectRatio ?? '16:9';
     const payload = {
       version: 1,
       createdAt: Date.now(),
       title: project.title || 'Untitled',
       orientation: effectiveAspectRatio === '9:16' ? 'vertical' : 'horizontal',
       aspectRatio: effectiveAspectRatio,
       boundaryBox: activePhase?.boundaryBox ?? null,
       pitchTransform: activeSlide?.pitchTransform ?? null,
       directorCamera: activePhase?.directorCamera ?? null,
       screenBackground: project.screenBackground ?? null,
       pitchAppearance: project.pitchAppearance,
       teamVisibility: 'both',
       exportFps: 60,
       scenes: currentSlides,
       photos,
     };
     ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/tactical/export/__tests__/share-payload.test.ts`:
    - 入力: `directorCamera: { enabled: true, globalKeyframes: [{ id: 'k1', timeMs: 0, tilt: 25, yaw: 10 }], actionCues: [] }`, `screenBackground: { type: 'cinematic' }`, `aspectRatio: '4:5'`, `boundaryBox: { enabled: true, x: 5, y: 5, width: 90, height: 90 }`
    - 期待値: パース後のオブジェクトで `directorCamera.globalKeyframes[0].tilt === 25`, `screenBackground.type === 'cinematic'`, `aspectRatio === '4:5'` が保持されていること。
  - `src/features/tactical-unified/panels/export/__tests__/use-export-share.test.ts`:
    - `activePhase.boundaryBox` と `activePhase.directorCamera` が mock fetch の body JSON に含まれていることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check src/lib/tactical/export/__tests__/share-payload.test.ts src/features/tactical-unified/panels/export/__tests__/use-export-share.test.ts` で RED を確認 ➔ 実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `TacticalExportSharePayloadSchema` に `directorCamera`, `screenBackground` を追加。`useExportShare` で `selectActivePhase` より `boundaryBox`, `directorCamera`, `aspectRatio` を抽出し送信ペイロードへ反映。

---

### Phase 2: 1080p固定クロップ計算 ＆ 動画エンコーダーへのカメラ・背景貫通
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/video-crop-calc.ts` (MODIFY)
  - `src/lib/tactical/export/video-export-types.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-video-exporter.ts` (MODIFY)
  - `src/lib/tactical/export/video-mediabunny-export.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/video-crop-calc.test.ts` (NEW)
- **契約 (Exact Contract & Formula)**:
  1. `video-crop-calc.ts`（`calculateBoundaryCrop`）:
     - 720p へのダウンスケール判定（`scale < 1.5` で 720p にする分岐）を撤廃。
     - `scale >= 2.5`（2K / 1440p）の分岐は維持しつつ、デフォルト・通常時（`scale < 2.5`）は **すべて 1080p（FHD基準）** に固定:
       - `isFourFive`（4:5）: `baseWidth = 1080, baseHeight = 1350`
       - `isVertical`（9:16）: `baseWidth = 1080, baseHeight = 1920`
       - `isSquare`（1:1）: `baseWidth = 1080, baseHeight = 1080`
       - `isFourThree`（4:3）: `baseWidth = 1440, baseHeight = 1080`
       - その他（16:9）: `baseWidth = 1920, baseHeight = 1080`
     - クロップ後寸法の 8ピクセル・マクロブロックアラインメント:
       `exportWidth = Math.max(64, Math.round(exportWidth / 8) * 8);`
       `exportHeight = Math.max(64, Math.round(exportHeight / 8) * 8);`
  2. `video-export-types.ts`:
     - `VideoExportOptions` に以下を追加:
       ```ts
       directorCamera?: DirectorCameraTrack | null;
       directorCameraOptions?: ResolveSyntheticDirectorCameraOptions;
       screenBackground?: ScreenBackgroundConfig;
       ```
  3. `tactical-video-exporter.ts`:
     - `MultiSlideVideoExportOptions` に `directorCamera?: DirectorCameraTrack | null`, `screenBackground?: ScreenBackgroundConfig` を追加。
     - `exportTacticalVideo` 呼び出し時に `directorCamera: options.directorCamera`, `screenBackground: options.screenBackground` を転送。
  4. `video-mediabunny-export.ts`:
     - `renderTacticalFrameToCanvas` 呼び出し箇所（L166付近）に以下を渡す:
       ```ts
       renderTacticalFrameToCanvas(ctx, {
         slides,
         timeMs,
         width: exportWidth,
         height: exportHeight,
         baseWidth: options.stageWidth,
         baseHeight: options.stageHeight,
         aspectRatio,
         boundaryBox,
         transparent,
         mvpMatrix,
         playerPhotos: options.playerPhotos,
         pitchAppearance: options.pitchAppearance,
         marbleTexture: options.marbleTexture,
         screenBackground: options.screenBackground,
         directorCamera: options.directorCamera,
         directorCameraOptions: options.directorCameraOptions,
         precomputedFrame: interpolated,
         teamVisibility: options.teamVisibility,
       });
       ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/tactical/export/__tests__/video-crop-calc.test.ts` (NEW):
    - `calculateBoundaryCrop(null, 1920, 1080, 1)`: `exportWidth === 1920, exportHeight === 1080, isCropped === false`（scale:1 でも 720p にならない）
    - `calculateBoundaryCrop(null, 1080, 1350, 1)`: `exportWidth === 1080, exportHeight === 1352` (または 1350)
    - `calculateBoundaryCrop(null, 1080, 1920, 1)`: `exportWidth === 1080, exportHeight === 1920`
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check src/lib/tactical/export/__tests__/video-crop-calc.test.ts` RED ➔ 実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `calculateBoundaryCrop`: scale < 2.5 の 720p 縮小を撤廃し全比率 1080p FHD（8の倍数アライン）固定。
  - `VideoExportOptions` / `MultiSlideVideoExportOptions`: `directorCamera`, `directorCameraOptions`, `screenBackground` を追加し Mediabunny レンダリングに貫通。

---

### Phase 3: iPhone画面の表示崩れ解消（CSS確定）＆ Store非依存化 ＆ 動画呼び出し配線
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/components/use-share-page-export.ts` (MODIFY)
  - `src/features/tactical-unified/components/shared-export-view.tsx` (MODIFY)
  - `src/features/tactical-unified/components/share-page-client-view.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `use-export-preview-animation.ts`:
     - ホスト境界と Store 非依存性の担保:
       - `storeTeamVisibility` は `teamVisibility` Props が渡されていればそちらを優先。
       - `workspaceMode` はストアが存在しない環境では `'director'` ではなくデフォルトにフォールバック。
       - `directorCamera` が Props で渡されている場合、アニメーション停止中の初期描画（L226 の `useEffect`）でも `drawFrame` に `directorCamera` が反映されることを保証。
  2. `shared-export-view.tsx` & `share-page-client-view.tsx`:
     - `Card` 内の `ExportPreviewPlayer` のラッパー要素に明示的な高さを指定:
       ```tsx
       <div className="w-full h-[45vh] min-h-[300px] max-h-[520px] flex items-center justify-center">
         <ExportPreviewPlayer
           slides={slides}
           aspectRatio={aspect}
           boundaryBox={data.boundaryBox}
           pitchTransform={data.pitchTransform}
           directorCamera={data.directorCamera}
           screenBackground={data.screenBackground}
           photos={data.photos}
           pitchAppearance={data.pitchAppearance}
         />
       </div>
       ```
       これにより、iOS Safari で `containerType: 'size'` の高さが 0px に畳み込まれるバグを完全に根絶。
  3. `use-share-page-export.ts`（iPhone動画エクスポートハンドラ）:
     - `handleExportClick` において `exportMultiSlideMp4Video` を呼び出す際:
       - `scale: 2`（1080p FHD）を明示指定。
       - `directorCamera: shareData?.directorCamera ?? null` を渡す。
       - `screenBackground: shareData?.screenBackground` を渡す。
       - `boundaryBox: shareData?.boundaryBox ?? null` を渡す。
- **Testing Strategy (Concrete Test Values)**:
  - `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`:
    - Props のみ（Store Provider なし）で `useExportPreviewAnimation` を初期化した際、エラーなく初期フレームが `renderTacticalFrameToCanvas` に `directorCamera` / `screenBackground` 付きで描画されることを検証。
  - `bun run ai:check src/features/tactical-unified/components/` で型・Lint・Vitest の PASS を確認。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` ➔ 実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `ExportPreviewPlayer` のコンテナに固定高さを付与し iOS Safari の高さ 0px 畳み込みを解消。`useExportPreviewAnimation` の Store 非依存化と `useSharePageExport` の 1080p (`scale: 2`)・カメラ・背景設定の動画貫通を完了。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-09 14:15
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（レイアウト画面完全非破壊・1080p固定）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  1080p FHD固定・8pxアライメント、共有ペイロードへのフェーズ情報（境界線・カメラ・背景）完全貫通、iOS Safariのプレビュー高さ潰れ解消、Store非依存化とSharedExportViewの重複排除フック共通化をすべて確認。上流のレイアウト画面を1行も破壊せず完璧に整合。LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
