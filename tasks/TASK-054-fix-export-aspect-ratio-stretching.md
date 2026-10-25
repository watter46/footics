# TASK-054: fix-export-aspect-ratio-stretching

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-25
- **Target Files**:
  - `src/lib/tactical/export/video-export-engine.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/konva-export-helpers.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-video-exporter.ts` (MODIFY)
  - `src/lib/tactical/__tests__/video-export-engine.test.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. アスペクト比に基づく基準解像度適用 (PNG / ZIP エクスポート):
  `konva-export-helpers.ts` の `renderSlideToPngBlob` および `exportAllSlidesZip` において、`stageWidth` / `stageHeight` 未指定時のフォールバックを、固定の `1280x720` (16:9) ではなく `PITCH_BOUNDARY_CONFIGS[options.aspectRatio]` (4:5なら 1080x1350, 9:16なら 1080x1920, 1:1なら 1080x1080, 16:9なら 1920x1080) に差し替えること。
- [x] 2. ピッチ矩形とフィット基準矩形の伝播:
  `renderSlideToPngBlob` 内で `calculatePitchRect({ width: stageWidth, height: stageHeight }, options.aspectRatio)` を算出し、`box?.fitTarget === 'canvas' ? { x: 0, y: 0, width: stageWidth, height: stageHeight } : pitchRect` を `calculateBoundaryCrop` の第5引数 (`pitchRect`) に渡し、ピッチまたはキャンバス基準でのクロップ幾何計算を正しく実行させること。
- [x] 3. 4:5 比率解像度プリセットの追加 (`video-export-engine.ts`):
  `calculateBoundaryCrop` において `isFourFive = Math.abs(stageWidth / stageHeight - 4 / 5) < 0.05` を判定し、4:5 比率の場合に 9:16 (1920高) への誤拡大を防ぎ、適切な基本寸法 (scale >= 2.5: 1440x1800, scale >= 1.5: 1080x1350, scale < 1.5: 720x900) を適用すること。
- [x] 4. 動画エクスポートの基準サイズ適正化 (`tactical-video-exporter.ts`):
  `exportMultiSlideMp4Video` および `exportMultiSlideWebmVideo` において、`options.stageWidth` / `options.stageHeight` 未指定時のデフォルトを、固定の `1280x720` ではなく `PITCH_BOUNDARY_CONFIGS[options.aspectRatio ?? '16:9']` の幅・高さに差し替えること。
- [x] 5. テスト検証と全件 PASS:
  `video-export-engine.test.ts` に 4:5 比率の計算テストを追加、`konva-export-helpers.test.ts` に 4:5 比率での PNG / ZIP エクスポートがアスペクト比通りのキャンバスサイズで描画されるテストを追加し、既存テストを含む全テストが PASS すること (`bun run ai:check`)。

## 3. Context Snippets (参照コード・型定義・import)

```ts
// src/features/tactical-unified/hooks/konva-export-helpers.ts
import { calculatePitchRect, PITCH_BOUNDARY_CONFIGS } from '@/lib/tactical/pitch-geometry';

// renderSlideToPngBlob
const config = PITCH_BOUNDARY_CONFIGS[options.aspectRatio] ?? PITCH_BOUNDARY_CONFIGS['16:9'];
const stageWidth = options.stageWidth ?? config.widthPx;
const stageHeight = options.stageHeight ?? config.heightPx;
const scale = options.scale ?? 2;
const box = options.boundaryBox !== undefined ? options.boundaryBox : options.slide.boundaryBox;
const pitchRect = calculatePitchRect({ width: stageWidth, height: stageHeight }, options.aspectRatio);
const baseRect = box?.fitTarget === 'canvas' ? { x: 0, y: 0, width: stageWidth, height: stageHeight } : pitchRect;
const crop = calculateBoundaryCrop(box, stageWidth, stageHeight, scale, baseRect);
```

```ts
// src/lib/tactical/export/video-export-engine.ts calculateBoundaryCrop
const isSquare = stageWidth === stageHeight;
const isFourFive = Math.abs(stageWidth / stageHeight - 4 / 5) < 0.05;
const isFourThree = Math.abs(stageWidth / stageHeight - 4 / 3) < 0.05;
const isVertical = stageHeight > stageWidth && !isFourFive;

// scale >= 2.5: isFourFive ? { baseWidth: 1440, baseHeight: 1800 } : ...
// scale >= 1.5: isFourFive ? { baseWidth: 1080, baseHeight: 1350 } : ...
// scale < 1.5:  isFourFive ? { baseWidth: 720,  baseHeight: 900 }  : ...
```

```ts
// src/lib/tactical/export/tactical-video-exporter.ts
import { PITCH_BOUNDARY_CONFIGS } from '@/lib/tactical/pitch-geometry';
const config = PITCH_BOUNDARY_CONFIGS[options.aspectRatio ?? '16:9'] ?? PITCH_BOUNDARY_CONFIGS['16:9'];
const stageWidth = options.stageWidth ?? config.widthPx;
const stageHeight = options.stageHeight ?? config.heightPx;
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: アスペクト比に基づく基準解像度・クロップ幾何計算の修正 & TDD テスト
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/video-export-engine.ts`
  - `src/features/tactical-unified/hooks/konva-export-helpers.ts`
  - `src/lib/tactical/export/tactical-video-exporter.ts`
  - `src/lib/tactical/__tests__/video-export-engine.test.ts`
  - `src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts`
- **Testing Strategy**:
  - `video-export-engine.test.ts`: 4:5 比率（1080x1350）時の `calculateBoundaryCrop` 出力が 9:16 に引き伸ばされず、4:5（2160x2704等）のアスペクト比を維持することを検証。
  - `konva-export-helpers.test.ts`: `aspectRatio: '4:5'` かつ stageWidth/Height 未指定時に、1080x1350 を基準としたキャンバス寸法で `renderTacticalFrameToCanvas` が呼ばれることを検証。既存テスト（1280x720指定）も引き続きパスすることを確認。
- **Tasks**:
  - [x] 1. TDD実装: テスト追加 ➔ 実装修正 ➔ `bun run ai:check src/lib/tactical/export/video-export-engine.ts src/features/tactical-unified/hooks/konva-export-helpers.ts src/lib/tactical/export/tactical-video-exporter.ts src/lib/tactical/__tests__/video-export-engine.test.ts src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts` PASS
- **Worker Handoff Log**:
  - `calculateBoundaryCrop` に 4:5 判定 (`isFourFive`) を追加し、4:5 時の 9:16 誤拡大を防止（H.264マクロブロック丸めで 900->904px, 1350->1352px 等の8px整合も確認）。
  - `renderSlideToPngBlob`, `exportAllSlidesZip`, `exportMultiSlideMp4Video`, `exportMultiSlideWebmVideo` のフォールバック解像度を `PITCH_BOUNDARY_CONFIGS` に統一し、fitTarget に応じた pitchRect 伝播を実装。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-25 17:20
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 4:5 をはじめとする全アスペクト比で画面表示とエクスポート比率が完全一致すること
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: 副作用のない純粋計算、Blobのクリーンアップ
  - [x] 3. 設計負債 & 拡張性: PITCH_BOUNDARY_CONFIGS の一元マスター活用、OCP準拠
  - [x] 4. サイレント破壊 & 既存保護: 既存のビデオエクスポートやテストを破壊していないこと
- **Summary**: PITCH_BOUNDARY_CONFIGS の一元マスター適用、fitTarget/pitchRect 伝播、4:5 比率プリセット追加により、エクスポート時のアスペクト比歪み問題を完全に解消。既存破壊もなくテストも網羅的。
