# TASK-150: boundary-presets-and-export-preview-crop

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-04
- **Target Files**:
  - `src/features/tactical-unified/panels/right-panel/screen-boundary-section.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/__tests__/screen-background-panel.test.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **境界線プリセットの 4 種限定**:
  - レイアウト画面（Screenタブ内）の境界線プリセットを「16:9」「9:16」「4:5」「1:1」の 4 種のみにする。
  - 不要となった「全画面16:9」「ピッチフィット横」「ピッチフィット縦」を完全撤廃。
  - 各プリセット選択時、対応する境界線比率（`createXBoundaryBox`）がアクティブスライドに正しく反映されること。
- [x] 2. **エクスポート画面での Space キー再生/停止制御**:
  - エクスポートプレビュー画面でスペースキー（`Space`）を押下した際、アニメーションの再生/停止（Play/Pause）がトグルされること。
  - `input` や `textarea` など文字入力要素にフォーカスがある場合はスペース入力を阻害せず、通常時はスクロール等のデフォルト挙動を抑制（`e.preventDefault()`）すること。
- [x] 3. **エクスポート画面での境界線クロップ再生の維持（ボトルネック解消）**:
  - エクスポート画面の `useExportPreviewAnimation` において、境界線が有効な場合は静止時だけでなく再生中も境界線領域でクロップされた状態（`previewWidth`, `previewHeight`, `previewAspectStyle`, `renderTacticalFrameToCanvas`）を維持すること。
  - 再生時に全画面へ戻ったり外側黒マスク描画に切り替わる現象を撤廃し、書き出される最終動画・画像と 1:1 で一致するプレビューを実現すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 境界線プリセット定義
```ts
// src/features/tactical-unified/panels/right-panel/screen-boundary-section.tsx
const PRESET_DEFINITIONS: BoundaryPreset[] = [
  { id: 'ratio_16_9', label: '16:9', badge: '横長', desc: '標準横画像' },
  { id: 'ratio_9_16', label: '9:16', badge: '縦長', desc: 'スマホ全画面' },
  { id: 'ratio_4_5', label: '4:5', badge: '縦長', desc: 'TL最大高さ' },
  { id: 'ratio_1_1', label: '1:1', badge: '正方形', desc: 'スクエア' },
];
```

### 3.2 クロップ判定契約
```ts
// src/features/tactical-unified/panels/export/use-export-preview-animation.ts
// 静止時・再生時に関わらず、境界線が有効であれば常時クロップを適用
const shouldCropPreview = Boolean(boundaryBox?.enabled && isBoundaryActive);
```

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: [Level 2] 境界線プリセットを 4 種（16:9, 9:16, 4:5, 1:1）に限定
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/right-panel/screen-boundary-section.tsx`
  - `src/features/tactical-unified/panels/right-panel/__tests__/screen-background-panel.test.tsx`
- **契約 (Interface)**:
  - `PRESET_DEFINITIONS` を `ratio_16_9`, `ratio_9_16`, `ratio_4_5`, `ratio_1_1` の 4 つに更新。
  - `full_16_9`, `pitch_fit_h`, `pitch_fit_v` の定義および switch branch、不要な import（`computePitchFitBoundaryBox`）を削除。
  - `activePresetId` の判定を 4 種の比率のみに簡潔化。
- **Testing Strategy**:
  - `screen-background-panel.test.tsx`: 表示されるプリセットボタンが 4 つ（16:9, 9:16, 4:5, 1:1）のみであること、それぞれをクリックした際に正しい `boundaryBox` で更新されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/right-panel/__tests__/screen-background-panel.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/right-panel/screen-boundary-section.tsx` PASS
- **Worker Handoff Log**:
  - `PRESET_DEFINITIONS` を 4 種（`ratio_16_9`, `ratio_9_16`, `ratio_4_5`, `ratio_1_1`）に限定し、不要な全画面/ピッチフィット処理・インポートを完全撤廃。


---

### Phase 2: [Level 2] エクスポート画面プレビューの境界線クロップ再生維持 ＆ Spaceキー再生制御
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx`
  - `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`
- **契約 (Interface)**:
  - `use-export-preview-animation.ts`:
    - `shouldCropPreview` を `Boolean(boundaryBox?.enabled && isBoundaryActive)` に変更し、再生中（`effectiveIsPlaying = true`）もクロップを維持。
    - キャンバス自体が境界線解像度にクロップされているため、`drawFrame` 内の `effectiveIsPlaying && isBoundaryActive` による外側シネマティックマスク描画を撤廃。
  - `export-preview-player.tsx`:
    - `useEffect` で `keydown` イベントリスナーを登録。`e.code === 'Space'` を検知して `togglePlay()` を実行。
    - `target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement` の場合はスキップ。`e.preventDefault()` でスクロール抑制。クリーンアップ（RAII）を徹底。
- **Testing Strategy**:
  - `use-export-preview-animation.test.ts`: 再生中（`isPlaying = true`）でも `shouldCropPreview` が true を維持し、`previewWidth`/`previewHeight` が境界線比率のまま維持されることを検証。
  - `export-preview-player.test.tsx`: Space キー押下で再生・停止が切り替わること、テキスト入力時は発火しないことを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` ➔ 実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `shouldCropPreview` を `Boolean(boundaryBox?.enabled && isBoundaryActive)` に変更し再生中もクロップを維持、シネマティックマスク描画を撤廃。`export-preview-player.tsx` に Space キー押下トグル（RAII解除および input/textarea 除外）を実装。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-04 21:17
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 4種プリセット、Spaceキー再生、再生中クロップ維持の網羅とテスト
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: SpaceキーリスナーのRAIIクリーンアップ、不要なチラつき排除
  - [x] 3. 設計負債 & 拡張性: SLAP遵守、エクスポート画面とレイアウト画面の関心事の分離
  - [x] 4. サイレント破壊 & 既存保護: 他の動画・画像エクスポート出力への副作用がないこと
- **Summary**: 境界線プリセットの4種限定、エクスポート画面でのSpaceキー再生制御（入力要素除外とRAII解除）、および再生中クロップ維持が正確に実装され、4大定性監査をすべてクリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
