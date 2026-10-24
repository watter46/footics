# TASK-047: step5-right-panel-bench-and-match-sync

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-24
- **Target Files**:
  - `src/lib/types/tactical-unified.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-formation-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-formation-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-reset-helpers.ts` (MODIFY)
  - `src/lib/tactical/match-to-tactical-bridge.ts` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-team-toggle.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-bench-item.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. Formation タブのデフォルト展開モードが `full`（フルピッチ）であること
- [x] 2. Formation タブに対象チームセレクター（`Home | Away | Both`）が配置され、選択対象に対する色変更・フォーメーション適用・マーカー内表示（Num/Photo/Empty）変更が一元操作できること
- [x] 3. `applyFormation` で `team: 'both'` を指定した際、Home と Away の両チームに同時にフォーメーションが適用されること
- [x] 4. 旧 `FormationBatchDisplay` セクションが廃止され、3択セレクター直下で表示モードを一括変更できること
- [x] 5. `Club & Season Presets` が Squad タブ最下部へ移動し、`project.matchId` なしの通常ボード時のみ表示されること
- [x] 6. `FormationBenchItem` から「投入」「交代」ボタンが廃止され、D&D操作に一本化されていること（削除ボタンは保持）
- [x] 7. 試合詳細経由時、`matchFormations`（Home/Awayの試合フォーメーション）が保持され、「メンバー維持リセット」時にそのフォーメーションで再配置されること
- [x] 8. 試合詳細経由ボードで「New Project」を実行した際、汎用ダミーに戻らず試合詳細版ボードとして新規初期化されること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs & Interfaces
```ts
import type { FormationMode, FormationType } from '@/lib/data/formations';
import type { AspectRatio, Player, TacticalProject } from '@/lib/types/tactical-unified';

// TacticalProject に保持する試合フォーメーション
export interface TacticalProject {
  // ...
  matchId?: string;
  matchFormations?: { home: FormationType; away: FormationType };
}
```

### 3.2 Implementation Notes & Gotchas
```ts
// 1. applyFormation('both'): Home/Away 両チームに computeSlideAfterFormation を順次適用する
// 2. Both 選択時のカラー変更: Home/Away それぞれの丸ボタンを並べてワンクリックで各色選択可能にする
// 3. resetSlideKeepSquadData: project.matchFormations が存在する場合はそのフォーメーション座標を採用する
// 4. 'use client' の付与と StoreProvider 境界（Level 2 コンポーネント）の遵守
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: データ層・ストア層（フォーメーション'both'対応 ＆ 試合詳細連携・リセット基盤）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/tactical-unified.ts`
  - `src/features/tactical-unified/stores/slide-formation-slice.ts`
  - `src/features/tactical-unified/stores/slide-formation-helpers.ts`
  - `src/features/tactical-unified/stores/slide-reset-helpers.ts`
  - `src/lib/tactical/match-to-tactical-bridge.ts`
  - `src/features/tactical-unified/stores/__tests__/slide-formation-both-and-match-reset.test.ts`
- **契約 (Interface)**:
  ```ts
  applyFormation: (slideId: string, formationName: FormationType, mode: FormationMode, team: 'home' | 'away' | 'both') => void;
  resetSlideKeepSquadData: (slide: Slide, aspectRatio: AspectRatio, matchFormations?: { home: FormationType; away: FormationType }) => Slide;
  ```
- **Testing Strategy**: `slide-formation-both-and-match-reset.test.ts` で `applyFormation('both')` の両チーム配置と、`matchFormations` によるリセット位置復元を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/stores/__tests__/slide-formation-both-and-match-reset.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/stores/` PASS
- **Worker Handoff Log**:
  - `applyFormation` に `team: 'both'` を追加。`resetSlideKeepSquadData` に `matchFormations` 引数を拡張し、`injectMatchToTactical` / `resetSlideKeepSquad` に連携完了。

---

### Phase 2: UI層・Formation タブ（3択セレクター ＆ チーム色・表示モード・フォーメーション統合）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/right-panel/formation-team-toggle.tsx`
  - `src/features/tactical-unified/panels/right-panel/formation-panel.tsx`
  - `src/features/tactical-unified/panels/right-panel/__tests__/formation-panel-step5.test.tsx`
- **契約 (Interface)**:
  ```ts
  export interface FormationTeamToggleProps {
    activeTeam: 'home' | 'away' | 'both';
    onTeamChange: (team: 'home' | 'away' | 'both') => void;
    homeColor: string;
    awayColor: string;
    onColorChange: (team: 'home' | 'away', color: string) => void;
    teamPlayersCount: { home: number; away: number };
    teamVisibility: 'both' | 'home' | 'away';
    onVisibilityChange: (visibility: 'both' | 'home' | 'away') => void;
  }
  ```
- **Testing Strategy**: `formation-panel-step5.test.tsx` で `Home | Away | Both` の切替、表示モード一括変更、デフォルト `full` モードを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/right-panel/__tests__/formation-panel-step5.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/right-panel/` PASS
- **Worker Handoff Log**:
  - `FormationTeamToggle` を 3 列 (HOME/AWAY/BOTH) と表示モード (Num/Photo/Empty) に対応。`FormationPanel` で初期モード `full`、`both` 時の両チーム更新・適用を配線完了。旧 `FormationBatchDisplay` と `FormationCustomManager` を撤去。

---

### Phase 3: UI層・Squad タブ ＆ TopBar 連携（ベンチD&D一本化 ＆ プリセット移動 ＆ 試合版New Project）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/right-panel/formation-bench-item.tsx`
  - `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx`
  - `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx`
  - `src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx`
- **契約 (Interface)**:
  ```ts
  // formation-bench-item: 投入・交代ボタンを撤去し、ドラッグ用Gripと削除(Trash2)ボタンのみ配置
  // squad-sub-panel: !project.matchId の場合のみ FormationCustomManager をレンダリング
  // top-bar-more-menu: matchId がある場合は試合データ再構築で新規プロジェクト化
  ```
- **Testing Strategy**: `squad-panel-step5.test.tsx` でボタン撤去、プリセット表示条件、New Project の matchId 維持を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/` PASS
- **Worker Handoff Log**:
  - `FormationBenchItem` から「投入」「交代」UIを撤去しD&D＋Trash2に一本化。`SquadSubPanel` 最下部に `!project.matchId` 条件で `FormationCustomManager` を配置。`TopBarMoreMenu` にて `project.matchId` 存在時に試合データ取得・初期化（`injectMatchToTactical`）を行う処理を実装。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-24 20:55
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: 受入要件1〜8を完全網羅。applyFormation('both')の合成処理、matchFormationsを用いたメンバー維持リセット、試合版New Project、Formationタブの3択セレクター・表示モード一括変更、ベンチD&D一本化が、後方互換性とホスト境界を厳守して高品質に実装されています。

## 6. Rejections / Additional Tasks (不可逆修正欄)
