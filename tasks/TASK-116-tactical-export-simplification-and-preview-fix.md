# TASK-116: 戦術ボード動画出力のiPhone最適化・PC動画出力撤去・ピッチ背景描画バグ修正

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-30
- **Target Files**:
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/lib/tactical/export/share-payload.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-video-exporter.ts` (MODIFY)
  - `src/lib/tactical/export/video-export-types.ts` (MODIFY)
  - `src/lib/tactical/export/video-mediabunny-export.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-share.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/__tests__/use-export-share.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal-footer.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-video-tab.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-modal-state.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-benchmark-overlay.tsx` (DELETE)
  - `src/features/tactical-unified/panels/export/use-export-benchmark.ts` (DELETE)
  - `src/features/tactical-unified/panels/export/export-video-pipeline-section.tsx` (DELETE)
  - `src/features/tactical-unified/panels/export/export-video-player.tsx` (DELETE)
  - `src/features/tactical-unified/panels/export/ios-export-presets.ts` (MODIFY)
  - `src/features/tactical-unified/components/use-share-page-export.ts` (MODIFY)
  - `src/features/tactical-unified/components/share-page-client-view.tsx` (MODIFY)
  - `src/app/export/__tests__/export-pages.test.tsx` (MODIFY)
  - `src/features/tactical-unified/__tests__/video-export.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. **プレビューのピッチ背景描画バグ修正 & 外観データ一括伝達**:
  - `ExportPreviewPlayer` および `useExportPreviewAnimation` が `pitchAppearance?: PitchAppearanceConfig` を受け取り、大理石背景テクスチャ画像（`/assets/pitch-marble-texture.jpg`）の自律ロード・キャッシュを経て `renderTacticalFrameToCanvas` に渡すこと。
  - `TacticalExportSharePayloadSchema`（`share-payload.ts`）に `pitchAppearance?: PitchAppearanceConfigSchema.optional()` を追加し、`use-export-share.ts` で共有リンク発行時に `project.pitchAppearance` を確実に送信すること。
  - エクスポートプレビュー画面でピッチ外観変更（線の色・太さ・透明度、大理石背景・オーバーレイ色）が忠実に反映されること。
- [x] 2. **PC側動画出力・詳細設定UIの完全撤去 & 「iPhoneに送信」集約**:
  - PCブラウザでの動画エンコード処理（`exportMultiSlideVideo` 実行、完了後の `ExportVideoPlayer`、ダウンロード）、低レベル詳細設定（`ExportVideoPipelineSection`: Max Queue Size, Keyframe Interval, Latency Mode）、開発用測定機能（`useExportBenchmark`, `ExportBenchmarkOverlay`, `⚡ Quick Test` ボタン）、およびモーダル内のモーフィング調整UIを完全撤去すること。
  - PC側モーダルの動画タブ（`export-video-tab.tsx`）はリアルタイムアニメーションプレビューと「iPhoneでの動画生成」の案内に特化し、右下の主ボタン（Primary Button）を「iPhoneに送信」に1本化すること。
  - 不要となった関連ファイル（`export-benchmark-overlay.tsx`, `use-export-benchmark.ts`, `export-video-pipeline-section.tsx`, `export-video-player.tsx`）を安全に削除すること。
- [x] 3. **iPhone共有ビュー（`/export/share/[shareId]`）の60fps固定 & ファイル保存導線最適化**:
  - `ios-export-presets.ts` の不要な30fpsプリセット（`iosGeneral`）およびUI上のプリセット選択を撤去し、A14以降のハードウェアを活用した「60fps・24Mbps（高品位MP4）」に一本化すること。
  - iPhone側プレビュー（`share-page-client-view.tsx`）および動画エンコード処理（`use-share-page-export.ts`）に `shareData.pitchAppearance` を伝達し、出力動画でもピッチ背景が忠実に反映されること。
  - 動画生成完了後は写真アプリ前提ではなく、Web Share APIの共有シート呼び出しによる「ファイルに保存」を最優先とし、直接ダウンロード導線とともに劣化のない高品位MP4を確実に保存できること。

---

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs & Type Signatures
```ts
// Phase 1: 描画パイプライン & 共有ペイロード
import type { PitchAppearanceConfig } from '@/lib/types/tactical-unified';

// share-payload.ts
export const TacticalExportSharePayloadSchema = z.object({
  version: z.number().default(1),
  createdAt: z.number(),
  title: z.string().optional(),
  scenes: z.array(z.custom<TacticalSceneLike>((val) => typeof val === 'object' && val !== null)),
  orientation: z.enum(['vertical', 'horizontal']),
  teamVisibility: z.enum(['both', 'home', 'away']).optional().default('both'),
  photos: z.record(z.string(), z.string()).optional().default({}),
  exportFps: z.union([z.literal(30), z.literal(60)]).optional().default(60),
  aspectRatio: AspectRatioSchema.optional(),
  boundaryBox: BoundaryBoxSchema.nullable().optional(),
  pitchTransform: PitchTransformSchema.nullable().optional(),
  pitchAppearance: PitchAppearanceConfigSchema.optional(),
});

// use-export-preview-animation.ts
export interface UseExportPreviewAnimationParams {
  slides: Slide[];
  aspectRatio: AspectRatio;
  boundaryBox?: BoundaryBox | null;
  pitchTransform?: PitchTransform | null;
  photos?: Record<string, string>;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  timeLabelRef: React.RefObject<HTMLSpanElement | null>;
  sliderRef: React.RefObject<HTMLInputElement | null>;
}

// Phase 3: ios-export-presets.ts
export const IOS_ENCODER_PRESET = {
  label: 'iPhone (A14 Bionic) — 60fps High Quality',
  codec: 'avc1.64002a',
  maxQueueSize: 30,
  bitrateMbps: 24,
  fps: 60,
  latencyMode: 'quality' as const,
  keyFrameIntervalSec: 2,
} as const;
```

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 描画パイプラインのピッチ外観連動 & テクスチャ自律解決
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/share-payload.ts`
  - `src/lib/tactical/export/tactical-video-exporter.ts`
  - `src/lib/tactical/export/video-export-types.ts`
  - `src/lib/tactical/export/video-mediabunny-export.ts`
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx`
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`
  - `src/features/tactical-unified/panels/export/use-export-share.ts`
  - `src/features/tactical-unified/panels/export/__tests__/use-export-share.test.ts`
  - `src/features/tactical-unified/__tests__/video-export.test.ts`
- **契約 (Interface)**:
  - `TacticalExportSharePayloadSchema` に `pitchAppearance: PitchAppearanceConfigSchema.optional()` を追加。
  - `VideoExportOptions` および `MultiSlideVideoExportOptions` に `pitchAppearance?: PitchAppearanceConfig` を追加し、`video-mediabunny-export.ts` の `renderTacticalFrameToCanvas` に渡す。
  - `use-export-preview-animation.ts` に `pitchAppearance` を受け取らせ、`pitchAppearance?.pitchBackgroundType === 'marble'` の場合は `/assets/pitch-marble-texture.jpg` を読み込んでキャッシュし、`renderTacticalFrameToCanvas` に `pitchAppearance` と `marbleTexture` を渡す。
  - `ExportPreviewPlayer` の props に `pitchAppearance?: PitchAppearanceConfig` を追加し、`useExportPreviewAnimation` に渡す。
  - `use-export-share.ts` で共有リンク生成時に `project.pitchAppearance` を payload に含める。
- **Testing Strategy**:
  - `use-export-share.test.ts`: payload に `pitchAppearance` が含まれて送信されることを検証。
  - `video-export.test.ts`: `ExportPreviewPlayer` に `pitchAppearance` を渡してエラーなくレンダリングされること、および動画エクスポーターに `pitchAppearance` が渡ることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/export/__tests__/use-export-share.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/export/share-payload.ts src/lib/tactical/export/tactical-video-exporter.ts src/lib/tactical/export/video-export-types.ts src/lib/tactical/export/video-mediabunny-export.ts src/features/tactical-unified/panels/export/export-preview-player.tsx src/features/tactical-unified/panels/export/use-export-preview-animation.ts src/features/tactical-unified/panels/export/use-export-share.ts src/features/tactical-unified/panels/export/__tests__/use-export-share.test.ts src/features/tactical-unified/__tests__/video-export.test.ts` PASS
- **Worker Handoff Log**:
  - `TacticalExportSharePayload` および `VideoExportOptions` に `pitchAppearance?: PitchAppearanceConfig` を拡張し、プレビュー・動画・共有API全体で外観設定（大理石テクスチャ自律ロード含む）が連動。

---

### Phase 2: PC側モーダルの動画生成・詳細設定撤去 & 「iPhoneに送信」一本化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/export/export-video-tab.tsx`
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx`
  - `src/features/tactical-unified/panels/export/export-modal-footer.tsx`
  - `src/features/tactical-unified/panels/export/export-modal.tsx`
  - `src/features/tactical-unified/panels/export/use-export-modal-state.ts`
  - `src/features/tactical-unified/panels/export/export-benchmark-overlay.tsx` (DELETE)
  - `src/features/tactical-unified/panels/export/use-export-benchmark.ts` (DELETE)
  - `src/features/tactical-unified/panels/export/export-video-pipeline-section.tsx` (DELETE)
  - `src/features/tactical-unified/panels/export/export-video-player.tsx` (DELETE)
- **契約 (Interface)**:
  - `export-video-tab.tsx`: 不要なフォーマット選択ボタン（MP4/WebM）、PipelineSection、MorphingSection を全撤去。動画タブはアニメーションの仕様案内（60fps高画質・iPhone出力専用）と案内カードのみの極小UIにする。
  - `export-modal-body.tsx`: `ExportPreviewPlayer` に `state.project.pitchAppearance`（`useTacticalUnifiedStoreContext((s) => s.project.pitchAppearance)`）を渡す。動画タブ用の不要な props 渡しを整理。
  - `export-modal-footer.tsx`: `activeTab === 'video'` 時の「⚡ Quick Test」ボタンを撤去。右下主ボタンを「iPhoneに送信（`share.createShareLink`）」に設定。画像タブ・JSONタブの挙動は現状維持。
  - `export-modal.tsx`: `ExportBenchmarkOverlay` と `completedVideo` 用の `ExportVideoPlayer` を撤去。
  - `use-export-modal-state.ts`: `useExportBenchmark`、`useExportEventListener`、`exportMultiSlideVideo` によるPC動画生成関数、待機キュー・キーフレーム・遅延モード等の不要ステートを削除し軽量化。
  - 不要ファイル4件を `rm` 削除。
- **Testing Strategy**:
  - `bun run ai:check` により型エラー、未使用インポート、Lint違反がないことを機械検証。
- **Tasks**:
  - [x] 1. 実装 & 撤去: `bun run ai:check src/features/tactical-unified/panels/export/export-video-tab.tsx src/features/tactical-unified/panels/export/export-modal-body.tsx src/features/tactical-unified/panels/export/export-modal-footer.tsx src/features/tactical-unified/panels/export/export-modal.tsx src/features/tactical-unified/panels/export/use-export-modal-state.ts` PASS
- **Worker Handoff Log**:
  - 不要ファイル4件（benchmark/pipeline/video-player）を完全削除。PC側モーダルから動画エンコード処理・ベンチマーク・不要設定UIを撤去し、主ボタンおよび動画タブを「iPhoneに送信」へ一本化。ピッチ外観もプレビューへ伝達。

---

### Phase 3: iPhone共有ビューの60fps固定 & ファイル保存導線最適化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/export/ios-export-presets.ts`
  - `src/features/tactical-unified/components/use-share-page-export.ts`
  - `src/features/tactical-unified/components/share-page-client-view.tsx`
  - `src/app/export/__tests__/export-pages.test.tsx`
- **契約 (Interface)**:
  - `ios-export-presets.ts`: 30fpsの `iosGeneral` を撤去し、単一の `IOS_ENCODER_PRESET`（60fps, 24Mbps, avc1.64002a）を export。
  - `use-share-page-export.ts`: `selectedPreset` / `setSelectedPreset` 状態を撤去し、固定プリセットを使用。`exportMultiSlideMp4Video` 呼び出しに `pitchAppearance: shareData?.pitchAppearance` を渡す。
  - `share-page-client-view.tsx`:
    - プリセット選択ボタン群を撤去。
    - `ExportPreviewPlayer` に `pitchAppearance={shareData.pitchAppearance}` を渡す。
    - エクスポート完了後、「Share / Save to Files（共有シート）」を Primary Button として最優先配置。「Save MP4（直接ダウンロード）」も明瞭に配置。
    - ガイドテキストを「ファイルアプリまたはダウンロードで劣化のない60fps高画質MP4を保存できます」と簡潔・明瞭に整備。
  - `src/app/export/__tests__/export-pages.test.tsx`: プリセット選択撤去に対応したテスト調整。
- **Testing Strategy**:
  - `bun run ai:check src/features/tactical-unified/panels/export/ios-export-presets.ts src/features/tactical-unified/components/use-share-page-export.ts src/features/tactical-unified/components/share-page-client-view.tsx src/app/export/__tests__/export-pages.test.tsx` PASS
- **Tasks**:
  - [x] 1. 実装 & テスト更新: `bun run ai:check src/features/tactical-unified/panels/export/ios-export-presets.ts src/features/tactical-unified/components/use-share-page-export.ts src/features/tactical-unified/components/share-page-client-view.tsx src/app/export/__tests__/export-pages.test.tsx` PASS
- **Worker Handoff Log**:
  - 単一プリセット `IOS_ENCODER_PRESET`（60fps/24Mbps）へ一本化しプリセット選択UIを撤去。共有プレビューおよび動画出力への `pitchAppearance` 伝達、完了後の Web Share（ファイル保存）主ボタン化とガイドテキスト整備を完了。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-30 15:35
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: ピッチ外観設定（大理石テクスチャ自律ロード・キャッシュ含む）のCanvas描画パイプライン連動、PC動画生成・ベンチマークUIの完全撤去と「iPhoneに送信」主ボタン一本化、iPhone側60fps固定（`IOS_ENCODER_PRESET`）およびWeb Share API保存導線の最適化をすべて確認。ホスト境界・Store Provider原則を遵守し、全ファイル250行以下に大幅スリム化された高品質なリファクタリング。※軽微改善点: `export-modal-footer.tsx` の未使用 `FlaskConical` インポートは後続の整理時に削除推奨。

---

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
