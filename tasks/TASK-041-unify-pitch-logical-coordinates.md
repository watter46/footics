# TASK-041: ストア座標系の一本化（二重縮小写像の撤去・余白クランプ解除・初期配置とリセットの統一）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-24
- **Target Files**:
  - `src/lib/types/tactical-unified.ts` (MODIFY)
  - `src/features/tactical-unified/stores/project-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-formation-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-player-crud-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-reset-helpers.ts` (MODIFY)
  - `src/lib/tactical/match-to-tactical-bridge.ts` (MODIFY)
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts` (MODIFY)
  - `src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `project-slice.ts`（`resetProject`, `setStageAspect`, `setAspectRatio`）、`slide-formation-slice.ts`（`fitTeamPitchPlayers`）、`slide-reset-helpers.ts`（`fitProjectPlayers`）、`match-to-tactical-bridge.ts` から `pitchToStageCoord` / `stageToPitchCoord` / `mapPlayersToPitchRect` によるステージ縮小写像が完全撤去され、すべての選手・ボール座標がピッチ枠基準の論理座標（`0〜100`、余白は `< 0` や `> 100`）で一元管理されること。これにより `16:9 ⇄ 4:5 / 9:16 / 1:1` のアスペクト比切替を何回繰り返しても選手座標が中央へ収束せず、元の位置に正確に戻ること。
- [x] 2. `slide-player-crud-slice.ts` の `updatePlayer` から `clampPercent`（`0〜100` への強制クランプ）が撤去され、ピッチ外余白領域への配置座標（例: `x: -15, y: 112`）がクランプされずそのままストアに保持されること。
- [x] 3. `createDefaultInitialPlayers`（`src/lib/types/tactical-unified.ts`）が `resetSlideKeepSquadData` と同じく Home `DEFAULT_4231_HOME` / Away `DEFAULT_442_AWAY`（縦向き比率時は `transformCoord(rawPos, '16:9', aspectRatio)` 適用）で初期配置を生成し、`resetSlideKeepSquadData` 実行時に選手の位置（余白へ移動した選手を含む）が確実に初期フォーメーション位置へ復帰すること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
import {
  type AspectRatio,
  DEFAULT_442_AWAY,
  DEFAULT_4231_HOME,
  getDefaultBoundaryBoxForAspect,
  isVerticalAspectRatio,
  type Player,
  type Slide,
  type TacticalProject,
  transformCoord,
} from '@/lib/types/tactical-unified';
import { transformSlideAspectRatio } from './slide-aspect-helpers';
```

### 3.2 Key Interfaces & Types
```ts
// ストア内の Player.x, Player.y は常にピッチ枠基準の論理座標 (ピッチ内: 0〜100, 余白: < 0 または > 100)
export function fitProjectPlayers(
  project: TacticalProject,
  _stageAspect?: number | null,
): TacticalProject {
  return project;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// 1. project-slice.ts の setAspectRatio (縮小写像を行わず transformSlideAspectRatio のみで変換)
setAspectRatio: (ratio: AspectRatio) =>
  set((s) => {
    const from = s.project.aspectRatio;
    if (from === ratio) return s;
    const transformedSlides = s.project.slides.map((slide) =>
      transformSlideAspectRatio(slide, from, ratio),
    );
    return {
      ...recordHistory(s),
      project: {
        ...s.project,
        aspectRatio: ratio,
        boundaryBox: getDefaultBoundaryBoxForAspect(ratio),
        slides: transformedSlides,
        updatedAt: new Date().toISOString(),
      },
      isDirty: true,
    };
  }),

// 2. slide-player-crud-slice.ts の updatePlayer (0〜100 クランプを撤去し [-100, 200] の安全範囲を許容)
updatePlayer: (slideId, playerId, patch) =>
  set((s) => {
    const slide = getSlide(s.project, slideId);
    const existingPlayer = slide?.players.find((p) => p.id === playerId);
    if (existingPlayer?.locked && !('locked' in patch)) return s;
    return {
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        players: sl.players.map((p) =>
          p.id === playerId ? { ...p, ...patch } : p,
        ),
      })),
      isDirty: true,
    };
  }),

// 3. createDefaultInitialPlayers (src/lib/types/tactical-unified.ts)
export function createDefaultInitialPlayers(
  homeColor = '#034694',
  awayColor = '#ef4444',
  aspectRatio: AspectRatio = '4:5',
): Player[] {
  const isVertical = isVerticalAspectRatio(aspectRatio);
  const homePlayers: Player[] = DEFAULT_4231_HOME.map((p) => {
    const rawPos = { x: p.x, y: p.y };
    const pos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    const pl = createDefaultPlayer('home', pos.x, pos.y, homeColor);
    pl.shirtNo = p.shirtNo;
    pl.position = p.position;
    return pl;
  });

  const awayPlayers: Player[] = DEFAULT_442_AWAY.map((p) => {
    const rawPos = { x: p.x, y: p.y };
    const pos = isVertical
      ? transformCoord(rawPos, '16:9', aspectRatio)
      : rawPos;
    const pl = createDefaultPlayer('away', pos.x, pos.y, awayColor);
    pl.shirtNo = p.shirtNo;
    pl.position = p.position;
    return pl;
  });

  return [...homePlayers, ...awayPlayers];
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: ストア層およびブリッジからの旧ステージ縮小写像・`[0, 100]` クランプの撤去と初期配置統一
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/types/tactical-unified.ts`, `src/features/tactical-unified/stores/project-slice.ts`, `src/features/tactical-unified/stores/slide-formation-slice.ts`, `src/features/tactical-unified/stores/slide-player-crud-slice.ts`, `src/features/tactical-unified/stores/slide-reset-helpers.ts`, `src/lib/tactical/match-to-tactical-bridge.ts`, `src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts`, `src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx`
- **契約 (Interface)**:
  - `src/lib/types/tactical-unified.ts`: `createDefaultInitialPlayers` で Home に `DEFAULT_4231_HOME`、Away に `DEFAULT_442_AWAY` を使用し、`resetSlideKeepSquadData` と初期座標を完全一致させる。
  - `src/features/tactical-unified/stores/slide-reset-helpers.ts`: `fitProjectPlayers` で `mapPlayersToPitchRect` を呼ばず `project` をそのまま返すようにする。
  - `src/features/tactical-unified/stores/project-slice.ts`: `setAspectRatio` から `getPitchRectNormalized` / `stageToPitchCoord` / `pitchToStageCoord` の二重写像を削除し、`transformSlideAspectRatio(slide, from, ratio)` の結果をそのまま使用する。`setStageAspect` も `stageAspect` の更新と `pitchFitPending: false` のみを行う。
  - `src/features/tactical-unified/stores/slide-formation-slice.ts`: `fitTeamPitchPlayers` での `pitchToStageCoord` 縮小写像を撤去し、フォーメーション座標（0〜100）をそのまま保持する。
  - `src/lib/tactical/match-to-tactical-bridge.ts`: `applyMatchToTacticalStore` での `mapPlayersToPitchRect` 縮小写像を撤去し、`allPlayers` をそのまま設定する。
  - `src/features/tactical-unified/stores/slide-player-crud-slice.ts`: `updatePlayer` から `clampPercent` を削除し、余白座標（`< 0` や `> 100`）をクランプせず保持する。
- **Testing Strategy**: `src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts` および `src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx` で、(1) `16:9 ➔ 4:5 ➔ 16:9 ➔ 9:16 ➔ 4:5` を10回繰り返しても選手座標が中央へ収束せず元の値と一致すること、(2) `updatePlayer` に `x: -15, y: 112` を渡した際にクランプされず保持されること、(3) 初期配置と `resetSlideKeepSquad` 後の選手座標が一致することを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/types/tactical-unified.ts src/features/tactical-unified/stores/project-slice.ts src/features/tactical-unified/stores/slide-formation-slice.ts src/features/tactical-unified/stores/slide-player-crud-slice.ts src/features/tactical-unified/stores/slide-reset-helpers.ts src/lib/tactical/match-to-tactical-bridge.ts src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx` PASS
- **Worker Handoff Log**:
  - ストア内の選手座標はピッチ基準論理座標（0-100、余白許容）に統一完了。`fitProjectPlayers` は恒等関数化し、`setAspectRatio`・`updatePlayer`・`match-to-tactical-bridge` の縮小写像およびクランプを全撤去。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-24 08:04
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  ストアおよびブリッジ層から `pitchToStageCoord` / `stageToPitchCoord` / `mapPlayersToPitchRect` によるステージ縮小写像と `clampPercent` による `0〜100` クランプが完全撤去され、単一の論理座標系（ピッチ基準・余白許容）へ統合されていることを確認。アスペクト比反復切替の無劣化性・余白座標保持・初期配置とリセットの一致を検証する単体・統合テストも網羅されておりLGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
