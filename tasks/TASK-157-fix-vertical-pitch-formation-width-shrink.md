# TASK-157: 縦向きピッチにおけるフォーメーション横幅縮小バグの修正

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-05
- **Target Files**:
  - `src/lib/data/formations.ts` (MODIFY)
  - `src/lib/types/tactical/primitives.ts` (MODIFY)
  - `src/lib/data/__tests__/formations.test.ts` (MODIFY)
  - `src/lib/types/__tests__/tactical-phase-and-coords.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 縦向きピッチ（4:5, 9:16, 1:1）においてフォーメーション展開時（`getFormationActualPos`）、左右選手（例: 4-3-3 の LW/RW）の X 座標がピッチ実領域（x: 3%〜97%）全体に自然に展開され、中央42%（28.85%〜71.15%）に縮小されないこと。
- [x] 2. 16:9（水平）と縦向き比率（4:5, 9:16, 1:1）間のアスペクト比変換（`transformCoord`）において、選手やオブジェクトの戦術的位置（攻撃深度および左右幅）がピッチ正規化座標系（x: 3..97, y: 3..97）基準で等価に変換され、横幅が縮小されないこと。
- [x] 3. 垂直比率同士（4:5 ↔ 9:16 ↔ 1:1）の切り替え時、ピッチ正規化座標（0..100）が歪むことなく完全に維持されること。
- [x] 4. 16:9 横向きピッチにおける既存のフォーメーション配置（GK自陣ゴール側、FW敵陣側、左右幅）が一切回帰（リグレッション）しないこと。
- [x] 5. `formations.test.ts` および `tactical-phase-and-coords.test.ts` の全テストが PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs & Functions
```ts
import { calculateNormalizedPitchBounds } from '@/lib/tactical/pitch-geometry';
import { isHorizontalAspectRatio } from '@/lib/types/tactical/primitives';
```

### 3.2 Target Signatures & Implementation Specs
```ts
// src/lib/data/formations.ts
// getScreenPitchBounds(aspectRatio) の代わりに calculateNormalizedPitchBounds() を使用
const bounds = calculateNormalizedPitchBounds();
const isHorizontal = isHorizontalAspectRatio(aspectRatio);

if (isHorizontal) {
  return {
    x: bounds.xMin + attackRatio * bounds.pitchWidth,
    y: bounds.yMin + (1 - widthRatio) * bounds.pitchHeight,
  };
}

return {
  x: bounds.xMin + widthRatio * bounds.pitchWidth,
  y: bounds.yMax - attackRatio * bounds.pitchHeight,
};
```

```ts
// src/lib/types/tactical/primitives.ts
// transformCoord: 同一オリエンテーション（垂直同士または水平同士）はそのまま維持
// 水平↔垂直間は calculateNormalizedPitchBounds() を基準に attackNorm と widthNorm を相互変換
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: ピッチ正規化座標系に基づくフォーメーション配置と座標変換の是正
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/data/formations.ts`
  - `src/lib/types/tactical/primitives.ts`
  - `src/lib/data/__tests__/formations.test.ts`
  - `src/lib/types/__tests__/tactical-phase-and-coords.test.ts`
- **契約 (Interface)**:
  - `getFormationActualPos`: `calculateNormalizedPitchBounds()` を用いて、垂直比率（4:5等）で `x: bounds.xMin + widthRatio * bounds.pitchWidth`（3 + widthRatio * 94）、`y: bounds.yMax - attackRatio * bounds.pitchHeight`（97 - attackRatio * 94）を算出。
  - `transformCoord`: 水平↔垂直変換時に `calculateNormalizedPitchBounds()` の余白枠を基準とし、横幅・攻撃深度を正規化して相互マッピング。垂直同士（4:5 ↔ 9:16 等）は座標を不変維持。
- **Testing Strategy**:
  - `formations.test.ts`: 4:5 で 4-3-3 の LW (left=15) と RW (left=85) の X 座標が 17.1% 付近および 82.9% 付近となり、展開幅が 60% 以上になることを検証。
  - `tactical-phase-and-coords.test.ts`: 16:9 と 4:5 の往復変換、および 4:5 での左右選手配置（left=10, 90）が中央帯に圧縮されずピッチ端付近（x ≈ 12.4, 87.6）に配置されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check [対象ファイル]` で検証しながら実装
- **Worker Handoff Log**:
  - `getFormationActualPos` と `transformCoord` で `calculateNormalizedPitchBounds()` を用いるよう改修し、縦向きピッチで左右幅が中央42%に縮小されるバグを是正。
  - `transformCoord` では同一オリエンテーション（4:5 ↔ 9:16 ↔ 1:1 等）の座標を不変維持し、16:9 ↔ 縦向き比率間の幅・攻撃深度をピッチ枠基準（3..97）で等価変換。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-05 15:11
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  ピッチ正規化座標系（calculateNormalizedPitchBounds）への一本化により、縦向きフォーメーションの横幅縮小およびアスペクト比変換時の圧縮バグが完全に解消されたことを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
