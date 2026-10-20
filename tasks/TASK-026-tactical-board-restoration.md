# TASK-026: 戦術ボード3大機能の復旧（試合別スライド・アスペクト比追従・アニメーション再生）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-20
- **Design Artifact**: `/home/watter46/.gemini/antigravity-cli/brain/6a4c17f7-b676-487e-b524-e3f37bc06cad/tactical-board-restoration-plan.md`
- **方針**: 0からの全リファクタリング厳禁。既存資産のピンポイント配線修正のみ。
- **Target Files**:
  - `src/lib/tactical/tactical-storage.ts` (MODIFY)
  - `src/lib/tactical/__tests__/tactical-storage.test.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-auto-save.ts` (MODIFY)
  - `src/features/tactical-unified/tactical-unified-page.tsx` (MODIFY)
  - `src/lib/tactical/match-to-tactical-bridge.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-match-init.ts` (MODIFY)
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/BackgroundImageLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (MODIFY)
  - `src/features/tactical-unified/core/types.ts` (MODIFY)
  - `src/features/tactical-unified/stores/project-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-formation-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-player-crud-slice.ts` (MODIFY)
  - `src/lib/tactical/pitch-stage-mapping.ts` (NEW)
  - `src/lib/tactical/__tests__/pitch-stage-mapping.test.ts` (NEW)
  - `src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx` (NEW)
  - `src/features/tactical-unified/hooks/__tests__/use-tactical-auto-save-match.test.ts` (NEW)

## 2. Requirements & Acceptance Criteria
- [x] 1. **試合別ストレージ**: `TACTICAL_PROJECT_STORAGE_KEY` は後方互換のため維持（サンドボックス用）。`getTacticalProjectStorageKey(matchId?: string | null)` を追加し、matchId あり→`tactical_active_project:<matchId>`、なし→従来キー。`saveActiveProjectToDb` / `loadActiveProjectFromDb` / `clearActiveProjectFromDb` は任意の `matchId` 引数を受ける。
- [x] 2. `useTacticalAutoSave({ skipRestore, matchId })` が試合専用キーで保存・復元する。matchId 変化時は新キーで再復元し、該当データがなければ前試合のスライドを引き継がない。
- [x] 3. `injectMatchToTactical` による試合切替時、保存済みの同一 matchId プロジェクトがあれば意図せず上書きしない（ユーザー決定により、minute差分適用は不要・保存済みスライドの優先復元で完了）。
- [x] 4. **アスペクト比追従**: `FullTacticalCanvas` の `imageAspect = 16 / 9` ハードコード撤廃。ユーザー指示により「キャンバス(Stage)は常にコンテナ全面、ピッチのみ比率通りに中央描画」に変更。マーカーはキャンバス外へはみ出さず(dragBoundFunc/0-100 clamp)、矢印などのツールオブジェクトはキャンバス外を許容。初期配置・フォーメーション適用・比率変更時はマーカーがピッチ矩形内に収まるよう写像（`pitch-stage-mapping.ts`）。
- [x] 5. **再生配線**: `FullTacticalCanvas`（Level 3）が `nodesRegistryRef` を管理し、`isPlaying` を監視して `useTacticalAnimation` の `playAnimation` / `pauseAnimation` / `stopAnimation` を接続。`CanvasStageContainer`（core）は props で `nodesRegistryRef` を受け取るのみとし、ホスト非依存を担保。再生完了時は `stopPlayback()`。unmount 時に RAF 解放 + `setIsPlaying(false)`。
- [x] 6. **統合テスト（TDD RED→GREEN）**: 実ストア+実コンポーネントツリーで (a) aspectRatio 変更で Stage は全面維持・ピッチ矩形のみ比率追従 (b) `isPlaying=true` で `playAnimation` ループが起動しノード座標が補間、unmount で cleanup (c) 2試合の matchId で保存分離・復元 (d) マーカー drag はキャンバス内 clamp、矢印は外側許容。
- [x] 7. DB スキーマ変更なし（keyval キー変更のみ）。`biome-ignore` 追加禁止、新規依存禁止。
- [x] 8. `bun run ai:check` 全 PASS（Biome strict / TS strict / Vitest）。

## 3. Context Snippets
```ts
// src/lib/tactical/tactical-storage.ts
export const TACTICAL_PROJECT_STORAGE_KEY = 'tactical_active_project';
export function getTacticalProjectStorageKey(matchId?: string | null): string {
  return matchId ? `${TACTICAL_PROJECT_STORAGE_KEY}:${matchId}` : TACTICAL_PROJECT_STORAGE_KEY;
}
// src/lib/tactical/pitch-stage-mapping.ts
export function getPitchRectNormalized(stageAspect: number | null | undefined, aspectRatio: AspectRatio): NormalizedRect;
export function mapPlayersToPitchRect<T extends { x: number; y: number }>(players: T[], rect: NormalizedRect): T[];
```

## 4. Implementation Phases
### Phase 1: 試合別ストレージ（完了）
- storage の matchId スコープ化、auto-save、match-init 連携、試合分離テスト PASS。
### Phase 2: アスペクト比追従 & ピッチ内写像（完了）
- FullTacticalCanvas の 16/9 ハードコード撤廃、BackgroundImageLayer の中央ピッチ描画、マーカー clamp & 初期ピッチ内収容純関数（pitch-stage-mapping）導入。
### Phase 3: 再生配線 & ホスト境界厳守（完了）
- CanvasStageContainer からストア/フック直接 import 排除、FullTacticalCanvas で nodesRegistryRef 経由の再生制御・unmount cleanup 結線。
### Phase 4: 全体検証（完了）
- `bun run ai:check` 全 PASS（Biome 0 errors, TypeScript 0 errors, Vitest 3 files 11 tests PASS）。
- 関連単体テスト 153 tests 全件 PASS。

## 5. Reviewer Assessment
- **Reviewer Model**: `flash-high`
- **Reviewed At**: 2026-10-20
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] ① 意図と実装: 実ストア・Konva実ノード・実IndexedDBを用いた厳格な統合テストを整備。
  - [x] ② 境界と副作用: CanvasStageContainer（core）からストア依存を排除、FullTacticalCanvas（Level 3）に結線。RAF/リスナーのcleanup保証。
  - [x] ③ 設計負債 (OCP): 幾何変換を pitch-stage-mapping 純粋関数へ分離。
  - [x] ④ AIサイレント破壊防止: スコープ厳守。既存機能・コメントの破壊なし。

## 6. Rejections / Additional Tasks
- **Fix 1 (ホスト境界)**: `CanvasStageContainer.tsx` からマスターストア・アニメーションフック直接 import を完全排除し、`CanvasStageProps.nodesRegistryRef` で親注入方式へ改修完了。
- **Fix 2 (stopAnimation & cleanup)**: `FullTacticalCanvas` にて `stopAnimation` の配線および unmount 時 cleanup（RAF 停止 + `setIsPlaying(false)`）実装完了。
- **Fix 3 (キャンバス全面 & ピッチ比率維持 & 座標整合)**: ユーザー指示に沿い「キャンバスはコンテナ全面、ピッチのみ中央描画、マーカーはキャンバス外絶対不可・初期配置等はピッチ内、矢印等はキャンバス外許容」を純粋関数 `pitch-stage-mapping.ts` および `PlayerMarkerItem.dragBoundFunc` で完全解決。
- **Fix 4 (Minute仕様)**: ユーザー指示「Minuteの仕様は一度削除でいい」に基づき、保存済みスライドの意図しない上書き防止（保存済み優先復元）で仕様確定。

## 7. Worker Handoff Log
- 全フェーズ実装完了。`bun run ai:check` PASS。Reviewer LGTM 承認獲得。
