# TASK-089: ピッチデザイン刷新（サイアン枠線・ベタ塗り黒背景）と syntax-studio 完全削除 (Phase 1)

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-27
- **Target Files**:
  - `src/lib/tactical/pitch-svg.ts` (MODIFY)
  - `src/lib/tactical/__tests__/pitch-svg.test.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/BackgroundImageLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/background-image-layer.test.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` (MODIFY)
  - `src/lib/tactical/export/renderers/pitch-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/pitch-markings-2d.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/pitch-markings-3d.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` (MODIFY)
  - `src/app/syntax-studio/` (DELETE)
  - `src/components/features/syntax-studio/` (DELETE)
  - `src/stores/syntax-studio-store.ts` (DELETE)
  - `SYNTAX_STUDIO_PRD.md` (DELETE)
  - `biome.json` (MODIFY)
  - `scripts/map/generate-repo-map.ts` (MODIFY)
  - `docs/app-overview.md` (MODIFY)
  - `docs/tech-stack.md` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 幾何計算と論理座標の維持: 4種のアスペクト比（16:9, 9:16, 4:5, 1:1）のピッチ寸法・真円センターサークル・余白・座標系を一切変更しないこと。
- [x] 2. ピッチライン色のサイアン化: ピッチ枠線・ライン・サークル・スポットのデフォルト色をサイアン系 `#38bdf8` に変更すること（`pitch-svg.ts`, `pitch-renderer.ts`, `pitch-markings-2d.ts`, `pitch-markings-3d.ts`）。
- [x] 3. ピッチ背景色のベタ塗り黒固定:
  - `pitch-svg.ts` の外枠背景・ピッチ背景を `#000000` に固定し、芝生ストライプパターンを廃止（ベタ塗り黒）。
  - `BackgroundImageLayer.tsx` および `PitchGroundLayer.tsx` の下地 `Rect` の `fill` を `#000000` に統一。
  - `pitch-renderer.ts` の canvas 背景・サーフェス塗りを `#000000` に統一。
- [x] 4. `syntax-studio` の完全削除:
  - `src/app/syntax-studio/`, `src/components/features/syntax-studio/`, `src/stores/syntax-studio-store.ts`, `SYNTAX_STUDIO_PRD.md` を一括削除すること。
  - `biome.json` の除外設定から削除ファイルを外し、ドキュメント・スクリプト内の参照を除去すること。
- [x] 5. 検証パス: 関連テスト（`pitch-svg.test.ts`, `background-image-layer.test.tsx`, `five-layer-architecture.test.tsx`, `tactical-frame-renderer.test.ts`）がすべて PASS し、`bun run build` が成功すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Color Specifications
```ts
// ピッチ刷新カラースペック
export const PITCH_LINE_COLOR = '#38bdf8'; // Cyan tactical line
export const PITCH_BG_COLOR = '#000000';   // Solid pitch background
```

### 3.2 Target Signatures & Gotchas
```ts
// src/lib/tactical/pitch-svg.ts
// strokeColor default: '#38bdf8' (was '#e2b48d')
// grassSvg & frame background: '#000000' (was '#020617' / '#080e1e')
// getCacheKey() の fallback strokeColor も '#38bdf8' に同期更新すること
export function generatePitchSvg(aspectRatio: AspectRatio, options?: PitchSvgOptions): string;

// src/features/tactical-unified/core/components/BackgroundImageLayer.tsx & PitchGroundLayer.tsx
// <Rect ... fill="#000000" /> (was '#020617')

// src/lib/tactical/export/renderers/pitch-renderer.ts
// ctx.fillStyle = '#000000'; ctx.strokeStyle = '#38bdf8';
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: ピッチデザイン刷新（サイアン枠線・ベタ塗り黒背景）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/pitch-svg.ts`
  - `src/lib/tactical/__tests__/pitch-svg.test.ts`
  - `src/features/tactical-unified/core/components/BackgroundImageLayer.tsx`
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/core/components/__tests__/background-image-layer.test.tsx`
  - `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`
  - `src/lib/tactical/export/renderers/pitch-renderer.ts`
  - `src/lib/tactical/export/renderers/pitch-markings-2d.ts`
  - `src/lib/tactical/export/renderers/pitch-markings-3d.ts`
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`
- **Testing Strategy**:
  - `bun run ai:check src/lib/tactical/pitch-svg.ts src/lib/tactical/__tests__/pitch-svg.test.ts`
  - `bun test src/features/tactical-unified/core/components/__tests__/background-image-layer.test.tsx`
  - `bun test src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`
  - `bun test src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`
- **Tasks**:
  - [x] 1. `pitch-svg.ts` のデフォルト色を `#38bdf8`、背景を `#000000`（芝生ストライプなしのベタ塗り黒）に変更し、`getCacheKey` を同期
  - [x] 2. `BackgroundImageLayer.tsx` と `PitchGroundLayer.tsx` の背景 `Rect` を `fill="#000000"` に変更
  - [x] 3. `pitch-renderer.ts`, `pitch-markings-2d.ts`, `pitch-markings-3d.ts` のエクスポートレンダラーの色を `#38bdf8` / `#000000` に同期
  - [x] 4. 既存テストのアサーション値（色コード）を更新し、全テスト PASS を確認
- **Worker Handoff Log**:
  - ピッチラインデフォルト色 `#38bdf8`・背景 `#000000`（ストライプ廃止）に全層同期。2D/3Dエクスポートスポット色も同値で統一。

---

### Phase 2: syntax-studio の完全削除と参照クリーンアップ
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/app/syntax-studio/` (DELETE)
  - `src/components/features/syntax-studio/` (DELETE)
  - `src/stores/syntax-studio-store.ts` (DELETE)
  - `SYNTAX_STUDIO_PRD.md` (DELETE)
  - `biome.json` (MODIFY)
  - `scripts/map/generate-repo-map.ts` (MODIFY)
  - `docs/app-overview.md` (MODIFY)
  - `docs/tech-stack.md` (MODIFY)
- **Testing Strategy**:
  - `bun run build` がエラーなく成功すること
  - `bun run check` または `bun run ai:check` で壊れた参照や型エラーが存在しないこと
- **Tasks**:
  - [x] 1. `src/app/syntax-studio/`, `src/components/features/syntax-studio/`, `src/stores/syntax-studio-store.ts`, `SYNTAX_STUDIO_PRD.md` を削除
  - [x] 2. `biome.json` から `sample-syntax-data.ts` のエントリを削除
  - [x] 3. `scripts/map/generate-repo-map.ts`, `docs/app-overview.md`, `docs/tech-stack.md` の syntax-studio 言及を削除・クリーンアップ
  - [x] 4. `bun run build` を実行してビルドが正常完了することを確認
- **Worker Handoff Log**:
  - `syntax-studio` 関連ファイル・ドキュメント・設定の完全撤去完了。`ai:check` 検証 PASS、syntax-studio 起因の参照切れ・型エラーなし。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-27 17:15
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: サイアン(#38bdf8)・ベタ塗り黒(#000000)への移行完了、不要コード完全削除
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: レイヤー背景描画の整合性、チラつきなき画像キャッシュ動作
  - [x] 3. 設計負債 & 拡張性: 残骸コード・設定・ドキュメントの完全除去
  - [x] 4. サイレント破壊 & 既存保護: 4種アスペクト比のピッチ幾何座標・エクスポート描画の互換性維持
- **Summary**:
  ピッチライン（#38bdf8）およびベタ塗り黒（#000000）への刷新が画面・エクスポート両系で完全一致。syntax-studio の完全撤去・設定ドキュメント整合性・幾何座標の不変性を確認し承認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
- 特になし
