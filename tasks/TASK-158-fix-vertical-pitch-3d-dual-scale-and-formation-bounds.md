# TASK-158: Fix Vertical Pitch 3D Dual Scaling and Formation Bounds

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-05
- **Target Files**:
  - `src/lib/data/formations.ts` (MODIFY)
  - `src/lib/types/tactical/primitives.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/renderer-context.ts` (MODIFY)
  - `src/lib/data/__tests__/formations.test.ts` (MODIFY)
  - `src/lib/types/__tests__/tactical-phase-and-coords.test.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/__tests__/pitch-markings-3d.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **フォーメーション配置の中央ピッチ枠収容**: 縦向きピッチ（4:5、9:16、1:1）において、フォーメーション配置（`getFormationActualPos`）が `getScreenPitchBounds(aspectRatio)` の白線枠（4:5なら横幅 28.85%〜71.15%、縦幅 3%〜97%）内に配置され、ボード画面・2D画面で選手がピッチ外へはみ出さないこと。
- [x] 2. **3D透視投影における二重縮小の排除**: 3Dカメラ有効時（tiltやyawを操作した時）、`projectObjToScreen` において 16:9 スクリーン座標をピッチ外枠矩形（`outerPitchRect`）基準の正規化座標（0..100%）に射影してから MVP 行列へ渡し、選手が中央へ二重縮小されないこと。
- [x] 3. **2Dと3Dの選手座標完全一致**: 4:5 ピッチにおいて、正面（tilt:0, yaw:90）の2D表示と 3D透視投影の間で、選手の描画スクリーン座標がジャンプ・収縮せず完全一致すること。
- [x] 4. **アスペクト比変換の整合性**: `transformCoord` が 16:9 スクリーン単一座標系の `getScreenPitchBounds` を基準とし、比率切り替え時に各比率の中央ピッチ枠内へ正しく変換されること。
- [x] 5. **全自動テストの合格**: `bun run ai:check` により、型検査・Lint・テストがすべて PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs & Functions
```ts
import { getScreenPitchBounds, getScreenOuterPitchRect } from '@/lib/tactical/pitch-geometry';
```

### 3.2 Target Signatures & Implementation Specs
```ts
// src/lib/data/formations.ts
const bounds = getScreenPitchBounds(aspectRatio);
if (bounds.isHorizontal) {
  return {
    x: bounds.xMin + attackRatio * bounds.xSpan,
    y: bounds.yMin + (1 - widthRatio) * bounds.ySpan,
  };
}
return {
  x: bounds.xMin + widthRatio * bounds.xSpan,
  y: bounds.yMax - attackRatio * bounds.ySpan,
};
```

```ts
// src/lib/tactical/export/renderers/renderer-context.ts
// 3D 投影時 (m 有効時): 16:9 スクリーン座標 (norm100X, norm100Y) を
// outerPitchRect (中央ピッチ矩形) 基準のピッチ空間 (0..100) に射影してから project3DPoint へ渡す
const pitchNormX = ((norm100X - (outerPitchRect.x / baseWidth) * 100) / ((outerPitchRect.width / baseWidth) * 100)) * 100;
const pitchNormY = ((norm100Y - (outerPitchRect.y / baseHeight) * 100) / ((outerPitchRect.height / baseHeight) * 100)) * 100;
return project3DPoint(m, pitchNormX, pitchNormY, baseWidth, baseHeight);
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: フォーメーションピッチ枠収容と3D透視投影二重縮小の解消
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/data/formations.ts`
  - `src/lib/types/tactical/primitives.ts`
  - `src/lib/tactical/export/renderers/renderer-context.ts`
  - `src/lib/data/__tests__/formations.test.ts`
  - `src/lib/types/__tests__/tactical-phase-and-coords.test.ts`
  - `src/lib/tactical/export/renderers/__tests__/pitch-markings-3d.test.ts`
- **契約 (Interface)**:
  - `getFormationActualPos`: `getScreenPitchBounds(aspectRatio)` を用いて 16:9 スクリーン中央のピッチ枠（4:5なら X: 28.85%〜71.15%）に配置。
  - `transformCoord`: `fromBounds` / `toBounds`（`getScreenPitchBounds`）で 16:9 スクリーン座標系相互変換。
  - `createFrameRenderContext`: `projectObjToScreen` において、3D投影時に `norm100X, norm100Y` を `outerPitchRect` で正規化（0..100%）して `project3DPoint` に渡し、二重縮小を根絶。
- **Testing Strategy**:
  - `formations.test.ts`: 4:5 で 4-3-3 の LW (left=20) が 37.31%、RW (left=80) が 62.69% 付近（白線枠内）に収まることを検証。
  - `tactical-phase-and-coords.test.ts`: 16:9 ↔ 4:5 変換でピッチ枠内に正しく配置されることを検証。
  - `pitch-markings-3d.test.ts`: 正面（tilt:0, yaw:90）の 2Dスクリーン座標と 3D投影座標が同一点になり、tilt 変更時もピッチ白線幅と選手の配置幅が整合することを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check [対象ファイル]` で検証しながら実装
- **Worker Handoff Log**:
  - `getFormationActualPos` と `transformCoord` は `getScreenPitchBounds` を基準とし、4:5等の中央ピッチ枠内座標へ統一。
  - `createFrameRenderContext.projectObjToScreen` は 16:9 スクリーン座標を `outerPitchRect` 基準で正規化して MVP 行列に渡すことで 2D と 3D（正面）の完全一致および二重縮小根絶を達成。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-05 15:55
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: `getScreenPitchBounds` による単一座標系への統一と、3D透視投影における `outerPitchRect` 基準のピッチ空間再正規化により、縦ピッチにおける二重縮小が解消され 2D/3D の整合性が担保されていることを確認。受入要件を満たし問題なし。

## 6. Rejections / Additional Tasks (不可逆修正欄)
