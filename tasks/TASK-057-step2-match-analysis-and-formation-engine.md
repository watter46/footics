# TASK-057: Step 2: 試合データ分析 ＆ フォーメーション自動配置・陣地反転の精度向上

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/types/index.ts` (MODIFY)
  - `src/lib/tactical/player-formatting.ts` (MODIFY)
  - `src/lib/tactical/formations.ts` (MODIFY)
  - `src/lib/data/formation-utils.ts` (MODIFY)
  - `src/lib/db/queries.ts` (MODIFY)
  - `src/lib/tactical/__tests__/formations.test.ts` (MODIFY)
  - `src/lib/data/__tests__/formation-utils.test.ts` (NEW)
  - `src/lib/tactical/squad-to-tactical-bridge.ts` (MODIFY)
  - `src/lib/tactical/match-to-tactical-bridge.ts` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-panel.tsx` (MODIFY)
  - `src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts` (MODIFY)
  - `src/lib/tactical/__tests__/match-to-tactical-bridge.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/__tests__/formation-panel-step5.test.tsx` (MODIFY)
  - `src/lib/types/tactical-unified.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-flip-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-formation-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-reset-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/stores/__tests__/slide-flip-helpers.test.ts` (MODIFY)
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts` (MODIFY)
  - `src/features/tactical-unified/__tests__/tracking-arrow-and-ball-trajectory.test.ts` (MODIFY)
  - `src/features/tactical-unified/stores/__tests__/slide-formation-both-and-match-reset.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [ ] 1. 試合データ（WhoScored クラブ戦）のスタメン・控え・交代退場選手の抽出精度向上: `formation.formationSlots`（`1〜11`＝ピッチ上、`0`＝未出場控え）に基づき、`getTeamFormationAtMinute` でピッチ上の選手（最大11人）とベンチ選手（未出場控えを先頭、交代退場済み選手を後ろ）を正確に分離し、ピッチ上選手には `formation.formationPositions` の縦横座標（`vertical`, `horizontal`）を紐づけること（元の試合データは変更しない）。
- [ ] 2. ポジション＆スロット適性マッチングによる自動配置と選手マスター保護: `DML, DMR, FWL, FWR` を含む全ポジションと WhoScored フォーメーション名（`41212`, `31312`, `343d`, `4240` 等）を正規化し、`matchPlayersToFormationPositions` によりフォーメーション枠（`FORMATION_POSITIONS`）の縦ライン・左右レーンへ選手を最適割り当てすること。途中出場等で元の `position` が `'Sub'` の選手は戦術ボード上で割り当て枠のポジションを補完し、また `savePlayerMaster` 同期時は既存の本職ポジションを `'Sub'` で上書きしないこと。
- [ ] 3. 右パネル `FormationPanel` の試合フォーメーション選択連動とポジション保持再配置: 試合データ連携時（`project.matchFormations` 存在時）に `FormationPanel` の選択中フォーメーションが `activeTeam`（`home` / `away` / `both`）のフォーメーションに連動すること。また戦術ボード上でフォーメーションを変更した際、既存選手の `position`（`'Sub'` 以外）を上書き破壊せず保持したまま新フォーメーション枠へ適性配置すること。
- [ ] 4. 陣地反転（Swap Sides）の180度点対称回転・ベンチ除外・反転状態（`isSidesSwapped`）保持: `SlideSchema` に `isSidesSwapped?: boolean` を追加し、`flipSlideObjects` ではベンチ選手（`area === 'bench'`）を反転対象外とし、ピッチ上の選手・ボール・矢印・ゾーン・テキストをピッチ中心 `(50, 50)` で180度点対称回転（`x' = 100 - x, y' = 100 - y`）させること。さらに `isSidesSwapped === true` のスライドでフォーメーション適用や「メンバー維持リセット」を行った際も反転後の陣地（Home＝右/上陣地、Away＝左/下陣地）を維持すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { FormationPosition, FormationMode, FormationType } from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import { matchPlayersToFormationPositions, normalizePosition, getPositionGroup, getSideScore } from '@/lib/tactical/player-formatting';
import { getTeamFormationAtMinute, type TeamFormationResult } from '@/lib/data/formation-utils';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/data/formation-utils.ts
export interface SlotPositionInfo {
  slot: number;
  vertical: number;
  horizontal: number;
}
export interface TeamFormationResult {
  teamId: number;
  teamName: string;
  field: 'home' | 'away';
  formation: Formation | null;
  formationName: string | null;
  playerIds: number[]; // ピッチ上の選手IDのみ (slot 1..11)
  players: Player[];   // ピッチ上の選手のみ
  benchPlayerIds: number[]; // 未出場控え(slot===0) + 交代退場済み選手ID
  benchPlayers: Player[];   // 未出場控え(先頭) + 交代退場済み選手(後ろ)
  slotPositions: Record<number, SlotPositionInfo>; // key: playerId
  captainPlayerId: number | null;
}

// src/lib/tactical/player-formatting.ts
export interface PositionMatchablePlayer {
  position?: string;
  slotVertical?: number;
  slotHorizontal?: number;
}
export function matchPlayersToFormationPositions<T extends PositionMatchablePlayer>(
  players: T[],
  templatePositions: FormationPosition[],
): Array<{ player: T; templatePos: FormationPosition }>;
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. WhoScored の formationPositions の horizontal (0..10) は 1 が右サイド(DR/MR/AMR)、5 が中央、9 が左サイド(DL/ML/AML)。そのため左から右への横スコア(0..100)に変換する際は `leftScore = (10 - slotHorizontal) * 10` とする。slotHorizontal が未指定の場合は getSideScore(p.position) (1:Left -> 15, 2:Center -> 50, 3:Right -> 85) を用いる。
// 2. 縦深さスコア(小さいほどGK側、大きいほどFW側): slotVertical (0..10) があればそれを優先し、なければ position から GK:0, DC/CB/SW:2.5, DL/DR/LB/RB/DF:2.8, DML/DMR/LWB/RWB:3.5, DMC/DM:4.5, MC/CM/MID/MF:5.5, ML/MR/LM/RM:6.0, AMC/AM:7.0, AML/AMR/LW/RW/FWL/FWR:7.5, SS:8.2, FW/ST/CF:9.0, Sub/Other:5.5 を返す。
// 3. matchPlayersToFormationPositions のアルゴリズム:
//    (a) templatePositions を守備側(top降順)にソートし、近接する top (差が 8 以下) を同一ラインとしてグループ化し、各ライン内を left 昇順(左→右)に並べることで「正規化された11枠の順序」を作る。
//    (b) players も縦深さスコア昇順でソートして各ラインの枠数ずつに切り分け、各ライン内で横スコア(leftScore)昇順にソートして 1対1 でペアリングする。
// 4. savePlayerMaster (src/lib/db/queries.ts): const resolvedPosition = (player.position && player.position !== 'Sub') ? player.position : (existing?.position && existing.position !== 'Sub' ? existing.position : (player.position ?? existing?.position ?? 'Other')); として既存の有効ポジションを 'Sub' で上書きしない。
// 5. flipSlideObjects (src/features/tactical-unified/stores/slide-flip-helpers.ts): p.area === 'bench' の選手はそのまま返し、p.area !== 'bench' の選手・ボール・矢印・ゾーン・テキストは isVertical に関わらず常に x' = 100 - x, y' = 100 - y (矩形ゾーンは x' = 100 - (x + width), y' = 100 - (y + height)) で点対称反転し、slide.isSidesSwapped = !slide.isSidesSwapped を設定する。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 試合データ抽出ロジック刷新・ポジション適性マッチャー・選手マスター `'Sub'` 上書き保護
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/types/index.ts`
  - `src/lib/tactical/player-formatting.ts`
  - `src/lib/tactical/formations.ts`
  - `src/lib/data/formation-utils.ts`
  - `src/lib/db/queries.ts`
  - `src/lib/tactical/__tests__/formations.test.ts`
  - `src/lib/data/__tests__/formation-utils.test.ts` (NEW)
- **契約 (Interface)**:
  ```ts
  export function matchPlayersToFormationPositions<T extends PositionMatchablePlayer>(players: T[], templatePositions: FormationPosition[]): Array<{ player: T; templatePos: FormationPosition }>;
  export function getTeamFormationAtMinute(team: Team | undefined | null, minute: number): TeamFormationResult;
  ```
- **Testing Strategy**:
  - `formations.test.ts`: `parseWhoScoredFormationName` が `'41212' -> '4-3-1-2'`, `'31312' -> '3-4-1-2'`, `'343d' -> '3-4-3'`, `'4240' -> '4-2-4'` を正しく変換し、`normalizePosition` / `getPositionGroup` / `getSideScore` が `DML, DMR, FWL, FWR` を正しく分類することを検証。
  - `formation-utils.test.ts`: WhoScored の 20人入り `playerIds` と `formationSlots` (`[1..11, 0..0]`) からピッチ11人と控えが正確に分離されること、交代後の時間帯で退場した先発選手が `benchPlayers` の末尾に含まれること、`matchPlayersToFormationPositions` で RB(`DR`, horiz:1) が RB枠(left:90)、LB(`DL`, horiz:9) が LB枠(left:10)、DM(`DMC`) が DM枠、CF(`FW`) が ST枠へ正確に割り当てられること、`savePlayerMaster` で既存の `'DC'` が `'Sub'` で上書きされないことを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/__tests__/formations.test.ts src/lib/data/__tests__/formation-utils.test.ts` ➔ 実装 ➔ `bun run ai:check src/types/index.ts src/lib/tactical/player-formatting.ts src/lib/tactical/formations.ts src/lib/data/formation-utils.ts src/lib/db/queries.ts src/lib/tactical/__tests__/formations.test.ts src/lib/data/__tests__/formation-utils.test.ts` PASS
- **Worker Handoff Log**:
  - `matchPlayersToFormationPositions` (PositionMatchablePlayer 対応) と `getTeamFormationAtMinute` (TeamFormationResult への bench/slot 拡張) を export 完了。
  - `savePlayerMaster` にて既存の有効ポジションを `'Sub'` で上書きしない保護ロジックを実装。

### Phase 2: 戦術ボードへのフォーメーション＆選手ポジション紐づけ展開と右パネル選択連動
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/squad-to-tactical-bridge.ts`
  - `src/lib/tactical/match-to-tactical-bridge.ts`
  - `src/features/tactical-unified/panels/right-panel/formation-panel.tsx`
  - `src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts`
  - `src/lib/tactical/__tests__/match-to-tactical-bridge.test.ts`
  - `src/features/tactical-unified/panels/right-panel/__tests__/formation-panel-step5.test.tsx`
- **契約 (Interface)**:
  ```ts
  export interface SquadPlayerItem extends Partial<Player> {
    playerId: number;
    name: string;
    shirtNo?: number;
    position?: string;
    isFirstEleven?: boolean;
    photoBlob?: Blob;
    photoUrl?: string;
    slotVertical?: number;
    slotHorizontal?: number;
  }
  ```
- **Testing Strategy**:
  - `squad-to-tactical-bridge.test.ts`: `sampleSquad`（Gusto `DR`, Cucurella `DL`, Madueke `AMR`, Neto `AML`, Jackson `FW`）を `4-2-3-1` に変換した際、Cucurella が左SB座標（`y < 30`）、Gusto が右SB座標（`y > 70`）、Neto が左WG、Madueke が右WG、Jackson がSTに配置され、元の `position` が `'Sub'` の選手には割り当て枠のポジションが補完されることを検証。
  - `match-to-tactical-bridge.test.ts`: 20人入りの `formation.playerIds` と `formationSlots` を持つ試合データからピッチ22人・ベンチ選手が正確に展開され、途中交代退場した選手もベンチ（未出場控えの後ろ）に配置されることを検証。
  - `formation-panel-step5.test.tsx`: `project.matchFormations`（例: `{ home: '4-2-3-1', away: '3-4-2-1' }`）が設定されている際、`activeTeam` の切り替え（`HOME` / `AWAY`）に応じて該当フォーメーションボタンが選択状態（アクティブ表示）になることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts src/lib/tactical/__tests__/match-to-tactical-bridge.test.ts src/features/tactical-unified/panels/right-panel/__tests__/formation-panel-step5.test.tsx` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/squad-to-tactical-bridge.ts src/lib/tactical/match-to-tactical-bridge.ts src/features/tactical-unified/panels/right-panel/formation-panel.tsx src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts src/lib/tactical/__tests__/match-to-tactical-bridge.test.ts src/features/tactical-unified/panels/right-panel/__tests__/formation-panel-step5.test.tsx` PASS
- **Worker Handoff Log**:
  - `convertSquadToTacticalPlayers` に `matchPlayersToFormationPositions` を統合し、`'Sub'` 選手へのポジション自動補完を適用。
  - `buildMatchTacticalPlayers` に `slotPositions` と `benchPlayers` を配線し、`FormationPanel` で `project.matchFormations` 連動を実装。

### Phase 3: 陣地反転（180度点対称 Swap・ベンチ除外・`isSidesSwapped` 保持）とフォーメーション再配置整合性
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/tactical-unified.ts`
  - `src/features/tactical-unified/stores/slide-flip-helpers.ts`
  - `src/features/tactical-unified/stores/slide-formation-helpers.ts`
  - `src/features/tactical-unified/stores/slide-reset-helpers.ts`
  - `src/features/tactical-unified/stores/__tests__/slide-flip-helpers.test.ts`
  - `src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts`
  - `src/features/tactical-unified/__tests__/tracking-arrow-and-ball-trajectory.test.ts`
  - `src/features/tactical-unified/stores/__tests__/slide-formation-both-and-match-reset.test.ts`
- **契約 (Interface)**:
  ```ts
  // SlideSchema に isSidesSwapped: z.boolean().optional() を追加
  export function buildTeamFormationPlayers(team: 'home' | 'away', formationName: FormationType, mode: FormationMode, existingPool: Player[], primaryColor: string, aspectRatio?: AspectRatio, isSidesSwapped?: boolean): { pitchPlayers: Player[]; benchPlayers: Player[] };
  ```
- **Testing Strategy**:
  - `slide-flip-helpers.test.ts` & `tactical-unified-store.test.ts` & `tracking-arrow-and-ball-trajectory.test.ts`: `swapTeamSides` / `flipSlideObjects` 実行時にピッチ上の選手・ボール・軌道制御点・矢印・ゾーン・テキストが横画面・縦画面とも中心 `(50, 50)` で180度点対称回転（`x' = 100 - x, y' = 100 - y`）し、ベンチ選手（`area === 'bench'`）の座標は変化せず、`slide.isSidesSwapped` がトグルされることを検証。
  - `slide-formation-both-and-match-reset.test.ts`: `swapTeamSides` 実行後（`isSidesSwapped === true`）に `applyFormation` または `resetSlideKeepSquad` を実行した際、Home 選手が右/上陣地（GK `x: 93`）、Away 選手が左/下陣地（GK `x: 7`）の反転陣地を維持して配置されること、およびフォーメーション変更時に既存選手の元の `position` が上書き破壊されないことを検証。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/stores/__tests__/slide-flip-helpers.test.ts src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts src/features/tactical-unified/__tests__/tracking-arrow-and-ball-trajectory.test.ts src/features/tactical-unified/stores/__tests__/slide-formation-both-and-match-reset.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/types/tactical-unified.ts src/features/tactical-unified/stores/slide-flip-helpers.ts src/features/tactical-unified/stores/slide-formation-helpers.ts src/features/tactical-unified/stores/slide-reset-helpers.ts src/features/tactical-unified/stores/__tests__/slide-flip-helpers.test.ts src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts src/features/tactical-unified/__tests__/tracking-arrow-and-ball-trajectory.test.ts src/features/tactical-unified/stores/__tests__/slide-formation-both-and-match-reset.test.ts` PASS
- **Worker Handoff Log**:
  <!-- 確定したexportシンボルや注意点のみを1〜2行で記録 -->

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 
- **Decision**: `TODO`
- **Audit Checklist**:
  - [ ] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [ ] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [ ] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [ ] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  <!-- 判定理由または改善指示を簡潔に記載 -->

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
