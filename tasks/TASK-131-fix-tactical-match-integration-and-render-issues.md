# TASK-131: fix-tactical-match-integration-and-render-issues

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-01
- **Target Files**:
  - `src/lib/tactical/squad-to-tactical-bridge.ts` (MODIFY)
  - `src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts` (MODIFY)
  - `src/lib/data/formations.ts` (MODIFY)
  - `src/lib/tactical/__tests__/formations.test.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/arrow-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/arrow-drag-updater.ts` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-layout.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. **デフォルト photo 化**: `convertSquadToTacticalPlayers` で生成される選手（スタメン・ベンチ）の `style.insideContent` がデフォルトで `'photo'` に設定され、写真データ未取得時は `PlayerMarkerCircle` の既存挙動により自動で背番号表示にフォールバックすること。
- [x] 2. **縦画面フォーメーション陣地正常化**: `getFormationActualPosVertical`（`mode: 'full'`）において、Home GK（top: 90）が下部陣地（`y ≈ 88.8%`）、Away GK（top: 90）が上部陣地（`y ≈ 11.2%`）に配置され、左右サイド（DL: 画面左側、DR: 画面右側）が直感通り配置されること。
- [x] 3. **マーカー矢印描画不良解消**:
  - `animation-node-updater.ts` で `dashArray` をノードに適用し、アニメーション再生中に点線矢印が実線化しないこと。
  - `arrow-renderer.ts` で `dashArray`（点線）、`dribble`/`arrow_wavy`（波線）、`route_line`/`dot`（ドット端点）をエクスポート描画すること。
  - `arrow-drag-updater.ts` で `isWavy` 判定に `arrow_wavy` を含めること。
- [x] 4. **画面遷移の導線改善**: `TopBar` 左端に「戻るボタン（`ArrowLeft` アイコン）」を配置し、`matchId` 存在時は `/match/${matchId}`、非存在時は `router.back()`（または `/`）へ迷わず戻れること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
import { ArrowLeft } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getWavyPoints } from '@/features/tactical-unified/core/components/annotations/wavy-arrow-math';
import { PITCH_BOUNDS_9_16 } from '@/lib/data/formations';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/data/formations.ts
export function getFormationActualPosVertical(
  pos: { top: number; left: number },
  team: 'home' | 'away',
  mode?: FormationMode,
): { x: number; y: number };

// src/lib/tactical/squad-to-tactical-bridge.ts
export function convertSquadToTacticalPlayers(
  players: SquadPlayerItem[],
  options: { team: 'home' | 'away'; formation?: FormationType; mode?: FormationMode; primaryColor: string; aspectRatio?: AspectRatio },
): TacticalPlayer[];
```

### 3.3 Implementation Notes & Gotchas
```ts
// 1. PlayerMarkerCircle は insideContent === 'photo' かつ loadedImage === null のとき自動で背番号 Text を描画するため、photoUrl が undefined でも insideContent: 'photo' のままで安全に背番号フォールバックする。
// 2. getFormationActualPosVertical (mode === 'full'): 守備側奥(top=90)から前線(top=25)への進行率は dist = 100 - clampedTop。Home(isHome)は下ゴールラインから上へ、Awayは上ゴールラインから下へ進む。
// 3. updateArrowNodes (animation-node-updater.ts): Konva.Arrow に arrowEntry.node.dash(aState.dashArray && aState.dashArray.length > 0 ? aState.dashArray : []) を必ず呼ぶ。
// 4. TopBar (Level 4 Shell): 'use client' 境界。useRouter と useSearchParams を使用し、matchId は searchParams または project.matchId から取得する。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 試合詳細の戦術ボード デフォルト photo 化
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/squad-to-tactical-bridge.ts`, `src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts`
- **契約 (Interface)**:
  ```ts
  export function convertSquadToTacticalPlayers(...): TacticalPlayer[];
  ```
- **Testing Strategy**: `squad-to-tactical-bridge.test.ts`: 写真 URL/Blob がない選手でも `insideContent` が `'photo'` に設定され、`photoUrl` が指定されている場合はそれが保持されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/squad-to-tactical-bridge.ts src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts` PASS
- **Worker Handoff Log**:
  - `convertSquadToTacticalPlayers`: スタメンおよびベンチ選手の `style.insideContent` をデフォルトで `'photo'` に設定（未取得時は `PlayerMarkerCircle` により背番号へ自動フォールバック）。

---

### Phase 2: 試合詳細フォーメーションの左右逆（上下陣地・サイド）反転問題解消
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/data/formations.ts`, `src/lib/tactical/__tests__/formations.test.ts`
- **契約 (Interface)**:
  ```ts
  export function getFormationActualPosVertical(pos: { top: number; left: number }, team: 'home' | 'away', mode?: FormationMode): { x: number; y: number };
  ```
- **Testing Strategy**: `formations.test.ts`: `mode === 'full'` 縦画面配置において、Home GK の y がピッチ下部（`y > 80`）、Away GK の y がピッチ上部（`y < 20`）に配置され、Home LB の x が左側（`x < 30`）、Home RB の x が右側（`x > 70`）であることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/__tests__/formations.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/data/formations.ts src/lib/tactical/__tests__/formations.test.ts` PASS
- **Worker Handoff Log**:
  - `getFormationActualPosVertical`: `mode === 'full'` において進行率 `dist = 100 - clampedTop` を適用し、Home/Away の上下陣地計算（Home: 下部 y ≈ 83.8%, Away: 上部 y ≈ 16.2%）と左右サイド（LB: x < 30, RB: x > 70）を直感通りに正常化。

---

### Phase 3: マーカー矢印の描画不良解消（アニメーション・エクスポート・ドラッグ更新）
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/hooks/animation-node-updater.ts`, `src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts`, `src/lib/tactical/export/renderers/arrow-renderer.ts`, `src/features/tactical-unified/core/components/annotations/arrow-drag-updater.ts`
- **契約 (Interface)**:
  ```ts
  export function updateArrowNodes(arrows: Record<string, InterpolatedArrowState>, registry: CanvasNodesRegistry, stageWidth: number, stageHeight: number, offsetX?: number, offsetY?: number): void;
  export function renderArrows(context: FrameRenderContext, arrows: Record<string, InterpolatedArrowState>): void;
  ```
- **Testing Strategy**: `animation-node-updater.test.ts`: `dashArray` を持つ矢印がアニメーション更新時に Konva ノードへ dash 属性が反映されること。`renderArrows` で `dashArray` および波線/ドット端点描画が正しく呼び出されること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/hooks/animation-node-updater.ts src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts src/lib/tactical/export/renderers/arrow-renderer.ts src/features/tactical-unified/core/components/annotations/arrow-drag-updater.ts` PASS
- **Worker Handoff Log**:
  - `updateArrowNodes` / `arrow-drag-updater`: `dashArray` による `arrowEntry.node.dash` 更新と `arrow_wavy` の波線判定を追加。
  - `renderArrows`: `dashArray`（点線）、`getWavyPoints`（波線）、`route_line`/`dot`（ドット端点）のエクスポート描画に対応。

---

### Phase 4: 画面遷移の導線改善（TopBar 戻るボタン）
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/toolbar/top-bar.tsx`, `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-layout.test.tsx`
- **契約 (Interface)**:
  ```ts
  export function TopBar(props?: TopBarProps): React.ReactElement;
  ```
- **Testing Strategy**: `top-bar-layout.test.tsx`: TopBar 左端に戻るボタンが存在し、`matchId` がある場合は `/match/${matchId}` へのリンクまたは遷移アクション、ない場合は戻りアクションが発火することを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/toolbar/__tests__/top-bar-layout.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/toolbar/top-bar.tsx src/features/tactical-unified/panels/toolbar/__tests__/top-bar-layout.test.tsx` PASS
- **Worker Handoff Log**:
  - `TopBar` 左端に `ArrowLeft` 戻るボタンを配置し、`searchParams` または `project.matchId` の存在時に `/match/${matchId}` へ遷移、非存在時に `router.back()` を実行するように実装・テスト完了。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-01 20:15
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  全受入要件（選手デフォルトphoto化、縦画面フォーメーション陣地・サイド幾何計算、矢印点線・波線・ドット描画復元、TopBar戻る導線）が高品質なTDDで満たされており、Store Provider・ホスト境界も厳守されていることを確認。LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
