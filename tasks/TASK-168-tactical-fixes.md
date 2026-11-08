# TASK-168: 戦術ボードUI操作性・レイアウト連動・試合データ整合性改修

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-09
- **Target Files**:
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts` (MODIFY)
  - `src/features/tactical-unified/tactical-unified-page.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/right-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/stores/phase-crud-actions.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-player-crud-slice.ts` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/use-preview-wheel-zoom.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/player-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **ショートカット & フォーカス連動**:
  - `Mod+]`（Mac: `Cmd+]`, Win: `Ctrl+]`）で右パネルが開閉トグルすること。
  - `Escape` キー押下時、① 入力中なら blur ➔ ② オブジェクト選択中なら選択解除 ➔ ③ 選択なしなら右パネルを閉じる、という段階的キャンセルが正しく機能すること。
  - 右パネル閉鎖時（Escape, Mod+], 閉じるボタン）にフォーカスが解放され、`Space` キーによるアニメーション再生/停止が確実に反応すること。
- [x] 2. **Directorモードでの左パネル開閉**:
  - Director モード（レイアウト画面）中も左パネルの開閉ガードが解除され、フェーズ・スライドの表示と操作ができること。
- [x] 3. **試合詳細ボードでのフェーズ追加**:
  - `project.matchId` または `matchFormations` を持つプロジェクトにおいて新規フェーズを追加した際、第1フェーズの実選手データ（ID, 名前, 顔写真, 背番号, ロール, ベンチ選手）を完全維持した上で、キックオフ時の初期フォーメーション座標（案Y）で新フェーズのスライドが生成されること。
- [x] 4. **スタイル・マーカーサイズの一括反映**:
  - `FormationPanel` に「フェーズ内の全スライドに適用」アクションが配備され、マーカーサイズ、ボールサイズ、Inside Content（写真/背番号/なし）、Bottom Label（名前/背番号/なし）が現在のフェーズ内の全スライドへ一括反映されること。
- [x] 5. **カーソル位置追従ホイールズーム**:
  - レイアウト画面でマウスホイール操作を行った際、マウスカーソルが指しているピッチ位置を起点としてスムーズに拡大・縮小（パン補正）が行われること。
- [x] 6. **チーム表示切替のプレビュー・エクスポート反映**:
  - Store の `teamVisibility`（`both` | `home` | `away`）がレイアウト画面およびエクスポートレンダラー（`player-renderer.ts`）に伝達され、非表示チームの選手マーカー・名前・背番号が描画から除外されること。
- [x] 7. **エクスポートプレビューの完全一致**:
  - `ExportModal` / `ExportPreviewPlayer` に `directorCamera`、`playerPhotos`、`teamVisibility` が渡され、レイアウト画面と100%同一の表示になること。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **Escape キーの段階的キャンセル順序（誤爆防止）**:
     - 順序: ① フォーム入力中なら `blur` ➔ ② ピッチ上オブジェクト選択中なら `clearSelection()` ➔ ③ 何も選択されていない状態で `Escape` を押したら右パネルを閉じる（`setRightPanelOpen(false)`）。
     - *Why*: オブジェクト選択解除の意図で押された Escape で右パネルまで閉じてしまう操作事故を根絶するため。
  2. **フォーカス脱出保証（Focus Restoration）**:
     - 右パネルが閉じた時（Escape、`Mod+]`、閉じるボタンクリック問わず）、直ちに `document.activeElement?.blur()` を実行してボタンや input からフォーカスを解放する。
     - *Why*: フォーカスがUIボタンに残っていると、ブラウザ標準動作により Space キー押下でそのボタンが再クリック（再開閉等の誤動作）され、再生ショートカットがブロックされるため。
  3. **`addPhase` の同期性保護（IndexedDB 非同期アクセスの禁止）**:
     - Zustand のスライスクルード関数 `addPhase: (name?: string) => string` は純粋な同期インターフェースである。
     - `matchId` が存在する場合、IndexedDB `db.matches` を非同期に再フェッチせず、既存フェーズ（第1フェーズ）に既に格納されている全選手プール（`players`）と、プロジェクトに保持されている `matchFormations`（Home/Awayフォーメーション）を活用して同期的・純粋関数として初期配置スライドを構築する。
     - *Why*: Store アクションを非同期化すると React の再描画タイミングの破綻やレースコンディションを誘発するため。
  4. **オプショナル引数による後方互換性（Zero Breaking Change）**:
     - `renderPlayers(context, players, playerPhotos, teamVisibility?)` および `renderTacticalFrame` の `teamVisibility` 引数はオプショナル（既定値 `'both'`）とする。
     - *Why*: 既存のテスト fixture や外部レンダラーの呼び出し元を一切破壊しないため。
  5. **ホスト境界の厳守 (4層モデル Level 2/3)**:
     - 全改修ファイルは `src/features/tactical-unified/` および `src/lib/tactical/` 配下に留め、Chrome Extension 専用 API（`chrome.*`）への依存を一切混入させない。
- **Consumers (同期が必要な別画面・呼び出し元)**:
  - `src/lib/tactical/export/tactical-frame-renderer.ts` — `renderPlayers` への `teamVisibility` 伝達
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` — プレビュー描画同期
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` — プレビュー描画同期
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx` — props伝達
  - `src/lib/tactical/export/video-mediabunny-export.ts` — 動画エクスポート整合
  - `src/lib/tactical/export/video-media-recorder-export.ts` — 動画エクスポート整合

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { Player, PlayerStyle, TacticalTeamVisibility } from '@/features/tactical-unified/types';
import { useTacticalStoreContext } from '@/features/tactical-unified/core/store';
```

### 3.2 Key Interfaces & Types
```ts
// ズームパン補正の型
export interface UsePreviewWheelZoomParams {
  containerRef: React.RefObject<HTMLElement | null>;
  activeCue: ActionCameraCue | null | undefined;
  resolvedCamera: ResolvedCameraState;
  activeSlide: TacticalSlide | null;
  currentTimeMs: number;
  upsertActionCameraCue: (timeMs: number, cue: Partial<ActionCameraCue>) => void;
  updatePitchTransform: (slideId: string, transform: Partial<PitchTransform>) => void;
}

// チーム表示フィルタの型
export type TacticalTeamVisibility = 'both' | 'home' | 'away';
```

### 3.3 Reference Pattern (既存実装抜粋)
```ts
// チーム表示フィルタ判定パターン
const isPlayerVisible =
  !teamVisibility ||
  teamVisibility === 'both' ||
  p.team === 'neutral' ||
  p.team === teamVisibility;
if (!isPlayerVisible) return;
```

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: UI操作性 & ショートカット & フォーカス管理
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts` (MODIFY)
  - `src/features/tactical-unified/tactical-unified-page.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/right-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts` (MODIFY / NEW)
- **契約 (Exact Contract & Formula)**:
  - **ショートカット `Mod+]`**:
    - キーコード: `e.key === ']' && (e.metaKey || e.ctrlKey)`
    - アクション: `setRightPanelOpen(!isRightPanelOpen)`
    - パネルを閉じる場合は `document.activeElement?.blur()` を実行。
  - **段階的 Escape キー**:
    ```ts
    if (e.key === 'Escape') {
      // 1. フォーム入力中ならフォーカス解除
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') {
        (document.activeElement as HTMLElement)?.blur();
        e.preventDefault();
        return;
      }
      // 2. ピッチ上のオブジェクトが選択されている場合は選択解除
      if (selectedObjectIds.length > 0) {
        clearSelection();
        e.preventDefault();
        return;
      }
      // 3. 何も選択されていない場合は右パネルを閉じる
      if (isRightPanelOpen) {
        setRightPanelOpen(false);
        (document.activeElement as HTMLElement)?.blur();
        e.preventDefault();
      }
    }
    ```
  - **フォーカス解放保証**:
    - 右パネルの「閉じる」ボタン押下ハンドラ内でも `(document.activeElement as HTMLElement)?.blur()` を呼ぶ。
  - **Director モードでの左パネル開閉**:
    - `tactical-unified-page.tsx` の左パネルラッパーで `!isDirectorMode` 条件によって非表示（またはマウント抑止）されていた箇所を修正し、Director モード中も `isLeftPanelOpen` に応じて左パネルを表示・開閉できるようにする。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts`
  - 入力値と期待値:
    - 選手選択時（`selectedObjectIds: ['p1']`）に Escape 押下 ➔ `clearSelection` が呼ばれ、`setRightPanelOpen` は呼ばれないこと。
    - 選択なし（`selectedObjectIds: []`）かつ `isRightPanelOpen: true` 時に Escape 押下 ➔ `setRightPanelOpen(false)` が呼ばれること。
    - `Cmd+]` または `Ctrl+]` 押下 ➔ `setRightPanelOpen` がトグル実行されること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts` PASS
- **Worker Handoff Log**:
  - Mod+] ショートカットはキーコード整合性のため `document.addEventListener('keydown')` で実装し閉鎖時blurを保証。
  - Escape キーは `enableOnFormTags: true` にて input blur ➔ clearSelection ➔ setRightPanelOpen(false) の段階的キャンセルを保証。

---

### Phase 2: 試合データ整合性 & スタイル一括適用
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/stores/phase-crud-actions.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-player-crud-slice.ts` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/stores/__tests__/phase-match-init.test.ts` (NEW)
- **契約 (Exact Contract & Formula)**:
  - **`addPhase` の初期選手配置ロジック**:
    ```ts
    // project.matchId または project.matchFormations が存在する場合
    const firstPhase = state.project.phases[0];
    const sourceSlide = firstPhase?.slides[0];
    let initialPlayers: Player[] = [];
    if (sourceSlide && state.project.matchFormations) {
      // 1. sourceSlide.players から全選手（名前・背番号・顔写真・ベンチ選手等）をコピー
      // 2. スタメン11名に対して matchFormations (home/away) の初期座標（案Y）をマッピング
      // 3. ベンチ選手は bench 領域のまま維持
    } else if (sourceSlide) {
      // 既存スライドの選手データをクローン
      initialPlayers = sourceSlide.players.map(p => ({ ...p }));
    }
    ```
  - **スタイル・ボールサイズ一括適用アクション**:
    - `applyPlayerStyleToPhaseSlides(phaseId: string, stylePartial: Partial<PlayerStyle>, targetTeam: 'home' | 'away' | 'both'): void`
      - 指定フェーズ内の全スライドをイテレートし、`targetTeam`（`both` または選手所属チーム）に合致する全選手の `style` に `stylePartial` を浅くマージ。
    - `applyBallScaleToPhaseSlides(phaseId: string, sizeScale: number): void`
      - 指定フェーズ内の全スライドの `ball.sizeScale`（または `ball` のスケール設定）を一括更新。
  - **`FormationPanel` UI 連動**:
    - マーカーサイズ、ボールサイズ、Inside Content（写真/背番号/なし）、Bottom Label（名前/背番号/なし）のコントロール付近に「フェーズ内の全スライドに適用」ボタン（または即時適用オプション）を配備し、上記アクションを呼ぶ。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/features/tactical-unified/stores/__tests__/phase-match-init.test.ts`
  - 入力値と期待値:
    - `matchFormations` 付きプロジェクトで `addPhase()` を実行 ➔ 新フェーズの初期スライドに含まれる選手の名前・ID・顔写真が第1フェーズと一致し、スタメンの座標がキックオフ初期配置になっていること。
    - `applyPlayerStyleToPhaseSlides('phase-1', { markerRadius: 24 }, 'home')` ➔ Phase 1 内の全スライドで home 選手の markerRadius が 24 に更新され、away 選手は変化しないこと。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/stores/__tests__/phase-match-init.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/stores/phase-crud-actions.ts src/features/tactical-unified/stores/slide-player-crud-slice.ts` PASS
- **Worker Handoff Log**:
  - `addPhase`: `project.matchId`/`matchFormations` 存在時に `resetSlideKeepSquadData` で第1フェーズの実選手データ（ID・名前・写真・背番号・ベンチ選手）を完全維持したキックオフ初期配置スライド生成を同期的に実現。
  - `applyPlayerStyleToPhaseSlides` / `applyBallScaleToPhaseSlides`: 指定フェーズ内全スライドへの選手スタイル・ボールサイズ一括適用アクションと `FormationPanel`（`FormationTeamToggle`）連携ボタンを配備。

---

### Phase 3: レイアウトカーソル位置追従ホイールズーム
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/split-preview/use-preview-wheel-zoom.ts` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/__tests__/use-preview-wheel-zoom.test.ts` (MODIFY / NEW)
- **契約 (Exact Contract & Formula)**:
  - **カーソル位置追従ホイールズーム補正式**:
    ```ts
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;

    const currentZoom = activeCue?.zoom ?? resolvedCamera.zoom ?? 1.0;
    const currentPanX = activeCue?.panX ?? resolvedCamera.panX ?? 0;
    const currentPanY = activeCue?.panY ?? resolvedCamera.panY ?? 0;

    const nextZoom = Math.max(0.4, Math.min(3.0, +(currentZoom - e.deltaY * 0.0015).toFixed(2)));
    const k = nextZoom / currentZoom;

    const nextPanX = Math.round(currentPanX * k + dx * (1 - k));
    const nextPanY = Math.round(currentPanY * k + dy * (1 - k));

    upsertActionCameraCue(currentTimeMs, { zoom: nextZoom, panX: nextPanX, panY: nextPanY });
    if (activeSlide) {
      updatePitchTransform(activeSlide.id, { zoom: nextZoom, panX: nextPanX, panY: nextPanY });
    }
    ```
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/features/tactical-unified/panels/split-preview/__tests__/use-preview-wheel-zoom.test.ts`
  - 入力値と期待値:
    - `rect`: width 800, height 450 ➔ centerX 400, centerY 225
    - マウス位置: mouseX 600, mouseY 325 ➔ dx = +200, dy = +100
    - `currentZoom`: 1.0, `panX`: 0, `panY`: 0
    - `deltaY`: -200 ➔ `nextZoom` = 1.30, `k` = 1.30
    - `nextPanX` = $0 \times 1.30 + 200 \times (1 - 1.30) = -60$
    - `nextPanY` = $0 \times 1.30 + 100 \times (1 - 1.30) = -30$
    - 期待される引数: `{ zoom: 1.30, panX: -60, panY: -30 }`
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/split-preview/__tests__/use-preview-wheel-zoom.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/split-preview/use-preview-wheel-zoom.ts` PASS
- **Worker Handoff Log**:
  - `usePreviewWheelZoom`: カーソル座標を起点としたパン補正式 `Math.round(currentPan * k + d * (1 - k))` を実装し、`upsertActionCameraCue` と `updatePitchTransform` に補正後の `panX`, `panY` を連動。
  - jsdomおよびコンテナサイズ/マウス座標の境界値（`clientX ?? 0`, `rect.left ?? 0`）に対する安全性を担保。

---

### Phase 4: チーム表示切替 & エクスポートプレビュー完全一致
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/renderers/player-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)
  - `src/lib/tactical/export/renderers/__tests__/player-renderer.test.ts` (MODIFY / NEW)
- **契約 (Exact Contract & Formula)**:
  - **`player-renderer.ts` チーム表示フィルタ**:
    ```ts
    export function renderPlayers(
      ctx: CanvasRenderingContext2D,
      players: Player[],
      playerPhotos: Map<string, HTMLImageElement>,
      teamVisibility?: 'both' | 'home' | 'away'
    ): void {
      for (const p of players) {
        const isPlayerVisible =
          !teamVisibility ||
          teamVisibility === 'both' ||
          p.team === 'neutral' ||
          p.team === teamVisibility;
        if (!isPlayerVisible) continue;
        // 描画処理...
      }
    }
    ```
  - **`tactical-frame-renderer.ts` への透過渡し**:
    - options に `teamVisibility?: 'both' | 'home' | 'away'` を含め、`renderPlayers` 呼び出し時に渡す。
  - **`ExportModalBody` & `ExportPreviewPlayer` の完全同期**:
    - Store から `teamVisibility`, `playerPhotos`, `directorCamera`（カメラキーフレームやアクションカメラ設定）を取得。
    - `ExportPreviewPlayer` に渡してプレビュー描画に完全反映させ、レイアウト画面と見た目を100%一致させる。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/lib/tactical/export/renderers/__tests__/player-renderer.test.ts`
  - 入力値と期待値:
    - 選手リスト: `[{ id: 'h1', team: 'home' }, { id: 'a1', team: 'away' }, { id: 'n1', team: 'neutral' }]`
    - `teamVisibility = 'home'` ➔ `h1` と `n1` のみ `ctx.arc` 等の描画メソッドが呼ばれ、`a1` は描画されないこと。
    - `teamVisibility = undefined` または `'both'` ➔ 全選手が描画されること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/export/renderers/__tests__/player-renderer.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/export/renderers/player-renderer.ts src/lib/tactical/export/tactical-frame-renderer.ts src/features/tactical-unified/panels/export/export-modal-body.tsx src/features/tactical-unified/panels/export/export-preview-player.tsx` PASS
- **Worker Handoff Log**:
  - `renderPlayers` に `teamVisibility` フィルタをオプショナル追加。Vision Cone 描画を `player-cone-renderer.ts` に分離してファイルサイズ上限（300行）を遵守。
  - `ExportModalBody` および `ExportPreviewPlayer` に `directorCamera`, `playerPhotos`, `teamVisibility` を伝達し、レイアウトプレビューと100%同一表示を保証。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-09 03:00
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  カーソル位置追従ズームパン幾何補正、段階的Escape/Mod+]フォーカス脱出、試合データ整合性を保持した同期addPhase、エクスポートプレビュー完全同期および後方互換性など、4大定性監査・6大設計品質原則を完全準拠で満たしていることを確認。


## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
