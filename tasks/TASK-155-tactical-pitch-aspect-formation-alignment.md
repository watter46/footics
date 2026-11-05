# TASK-155: 戦術ボード背景・3D投影・初期比率・フォーメーションの整合性改修

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-05
- **Target Files**:
  - `src/lib/data/formations.ts` (MODIFY)
  - `src/lib/types/tactical/factory.ts` (MODIFY)
  - `src/lib/types/tactical/project.ts` (MODIFY)
  - `src/lib/tactical/match-to-tactical-bridge.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/pitch-markings-3d.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/renderer-context.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. フォーメーション展開時、GKが自陣ゴール前（端）、FWがハーフウェーライン手前（中央寄り）に正しく並ぶこと（`getFormationActualPos` の攻撃深度反転解消）。
- [x] 2. 通常アクセス時（`/tactical`）の初期配置が Home: 4-2-3-1 (full)、Away: 4-4-2 (full) の計22選手で生成されること。
- [x] 3. 試合詳細アクセス時（`/tactical?matchId=~`）の初期配置が、試合データのフォーメーションを用いて両チーム full で適用されること。
- [x] 4. 新規プロジェクトおよび初期フェーズのデフォルトアスペクト比が `4:5` となり、初期境界線枠が全画面フィット（16:9キャンバス全体）に設定されること。
- [x] 5. 縦向きピッチ（4:5 等）において tilt または yaw を変更しても、ピッチの横幅が二重縮小されず正しくプロポーションを維持すること。
- [x] 6. エクスポートモーダルのプレビュー画面（`ExportPreviewPlayer`）に `screenBackground` が伝達され、背景設定（シネマティック / 単色ダーク）が即座に反映されること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs & Constants
```ts
import { DEFAULT_BOUNDARY_BOX_FULL } from '@/lib/types/tactical/slide';
import type { ScreenBackgroundConfig, AspectRatio, BoundaryBox } from '@/lib/types/tactical-unified';
import { getScreenPitchBounds, calculatePitchRect } from '@/lib/tactical/pitch-geometry';
```

### 3.2 Key Signatures
```ts
// getFormationActualPos: top=0(FW)〜100(GK) の深度計算を反転修正
const depthRatio = ((100 - clampedTop) / 100) * 0.5;
const attackRatio = isAway ? 1 - depthRatio : depthRatio;

// ExportPreviewPlayerProps: screenBackground prop 追加
export interface ExportPreviewPlayerProps {
  // ...既存 props
  screenBackground?: ScreenBackgroundConfig;
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: フォーメーション配置方向修正と初期比率・フル配置の整合
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/data/formations.ts`
  - `src/lib/types/tactical/factory.ts`
  - `src/lib/types/tactical/project.ts`
  - `src/lib/tactical/match-to-tactical-bridge.ts`
- **契約 (Interface)**:
  - `getFormationActualPos`: テンプレートの `top` 値から自陣ゴール基準の深度 `((100 - top) / 100) * 0.5` を正しく算出し、GKがゴール前、FWが中央手前になるように修正。
  - `createDefaultProject` / `createDefaultPhase` / `createDefaultSlide`: デフォルト比率を `'4:5'`、境界線枠を全画面（`{ ...DEFAULT_BOUNDARY_BOX_FULL, fitTarget: 'canvas' }`）に設定。
  - 通常アクセスの初期選手配列（`createDefaultInitialPlayers`）を Home: 4-2-3-1 (full)、Away: 4-4-2 (full) の計22選手構成で生成。
  - `buildMatchTacticalPlayers`: 試合データのフォーメーションを用いて両チーム `mode: 'full'` でピッチ上22選手を生成。
- **Testing Strategy**:
  - `src/lib/data/__tests__/formations.test.ts` (GKのxが自陣ゴール側、FWのxがセンターライン側であることを検証)
  - `src/lib/types/__tests__/tactical-factory.test.ts` (初期アスペクト比4:5、境界線全画面、22選手生成を検証)
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check [対象ファイル]` で既存テスト合格を確認しながら反転計算と初期値を修正
- **Worker Handoff Log**:
  - `getFormationActualPos`: `depthRatio = ((100 - clampedTop) / 100) * 0.5` によりGK（自陣ゴール前）とFW（ハーフ手前）の攻撃深度反転を解消。
  - `createDefaultProject` / `createDefaultPhase` / `createDefaultSlide`: デフォルト比率 `4:5` と全画面フィット境界枠（`DEFAULT_INITIAL_BOUNDARY_BOX`）を反映。

---

### Phase 2: 3D透視投影における縦ピッチ横幅二重縮小の解消
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/renderers/pitch-markings-3d.ts`
  - `src/lib/tactical/export/renderers/renderer-context.ts`
  - `src/features/tactical-unified/core/utils/canvas-pitch-transform-helper.ts`
- **契約 (Interface)**:
  - `pitch-markings-3d.ts`: 3D線・円弧描画時の正規化座標変換（`toNormX` / `toNormY`）において、MVP行列内の `scaleX = pitchWidth / stageHeight` と外枠矩形縮小の二重掛けを排除。
  - 正面(0, 90)と tilt/yaw 変更時でピッチ外枠サイズが一致するよう正規化入力空間を統一。
- **Testing Strategy**:
  - `src/lib/tactical/export/renderers/__tests__/pitch-markings-3d.test.ts` または `src/features/tactical-unified/core/utils/__tests__/pitch-tilt-export.test.ts` で、4:5 ピッチの tilt/yaw 適用前後で外枠端点の横幅が縮小・破綻しないことを検証。
- **Tasks**:
  - [x] 1. TDD実装: 縦ピッチの 3D 投影座標計算を修正し `bun run ai:check [対象ファイル]` PASS
- **Worker Handoff Log**:
  - `pitch-markings-3d.ts`: `toNormX` / `toNormY` をピッチSVG基準の正規化座標 `(svg / configPx) * 100` に統一し、MVP行列内のスケーリングとの二重掛けを排除。
  - `renderer-context.ts`: `project3DSegment` の `!m` フォールバックで `outerPitchRect` を参照し正面・2D整合性を担保。

---

### Phase 3: エクスポートプレビューへの外周背景プロパティ伝達
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx`
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx`
- **契約 (Interface)**:
  - `ExportPreviewPlayerProps` に `screenBackground?: ScreenBackgroundConfig` を追加し、`useExportPreviewAnimation` に転送。
  - `ExportModalBody` から `project.screenBackground` を `ExportPreviewPlayer` に注入。
- **Testing Strategy**:
  - `src/features/tactical-unified/panels/export/__tests__/export-modal-body.test.tsx` 等で `screenBackground` が正しくプレビュープレイヤーに渡されていることを検証。
- **Tasks**:
  - [x] 1. `ExportPreviewPlayer` と `ExportModalBody` を接続し `bun run ai:check [対象ファイル]` PASS
- **Worker Handoff Log**:
  - `ExportPreviewPlayerProps` に `screenBackground?: ScreenBackgroundConfig` を追加し `useExportPreviewAnimation` へ転送。
  - `ExportModalBody` から `project.screenBackground` を `ExportPreviewPlayer` に注入。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-05 13:55
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 6大受入要件の完全網羅、ダミー実装の排除、テスト検証
  - [x] 2. ホスト境界 & Store Provider: Level 2/3 のホスト非依存、Store Provider経由取得、props確定注入
  - [x] 3. 設計負債 & 拡張性: 座標計算の二重スケーリング根絶、SLAP/Shell Purity遵守
  - [x] 4. サイレント破壊 & 既存保護: 16:9 ピッチの既存描画や他フォーメーションの非破壊確認
- **Summary**: フォーメーションのゴール/ハーフ攻撃深度反転解消、初期比率4:5と22選手配置、3D透視投影における横幅二重縮小の根絶、およびプレビューへのscreenBackground伝達が6大設計原則に完全準拠して実装されていることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
