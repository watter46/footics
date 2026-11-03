# TASK-145: topbar-and-right-panel-ux-overhaul

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-03
- **Target Files**:
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx` (MODIFY)
  - `src/features/tactical-unified/stores/tool-slice.ts` (MODIFY)
  - `src/features/tactical-unified/tactical-unified-page.tsx` (MODIFY)
  - `src/features/tactical-unified/stores/tool-types.ts` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx` (NEW)
  - `src/features/tactical-unified/panels/right-panel/right-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/__tests__/right-panel-tabs.test.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-team-toggle.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/__tests__/formation-panel-step5.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 用語統一とトップバーのUI整理: 編集モードの用語を「ボード (Board)」＆「レイアウト (Layout)」、Export確認を「プレビュー (Preview)」に統一する。`TopBarCenter` から重複していたモード切替セグメントを削除し、アスペクト比のすぐ横にモード切替トグルボタンのみを残す。`Swap` と `Reset` はアイコンのみの省スペースボタンとし、右側の `Copy PNG` ラベルを `Copy` に変更、全ボタンに `whitespace-nowrap shrink-0` を徹底すること
- [x] 2. 右パネルのモード連動タブ表示: レイアウトモード（`workspaceMode === 'director'`）時も `RightPanel` を表示維持し、ボードモードでは `Formation / Squad / Pitch` の3タブ、レイアウトモードでは `Camera / Screen` の2タブに表示を切り替えること（モード切替時に右パネルのタブも各モードのデフォルト `'formation'` / `'camera'` へ自動遷移）
- [x] 3. Cameraタブの新設と数値・スライダー調整: `CameraControlPanel` を右パネルの `Camera` タブとして新設し、カメラプリセット選択に加えて `tilt`（0°〜60°）と `yaw`（0°〜180°）をスライダーおよび数値入力（`<input type="number">`）の両方で変更可能にし、Zoom/Pan表示とリセットボタンを備えること
- [x] 4. FormationパネルのUI/UX再構築: 最上部に `Home | Away | Both`（デフォルト: `Home`）のチーム選択を配置し、選択中チームに対して (a) Team Color（重複していた `All|H|A` は削除）、(b) マーカー内表示（`Num | Photo | Empty`、現在選択中の状態をハイライト明示）、(c) マーカー下ラベル（`Name | Num | None`、選択状態ハイライト付き）、(d) マーカーサイズ変更スライダー、(e) ボールサイズ変更スライダー を配置し、その下部に「Formation Presets（横に `Half | Full` トグル付き）」セクションを配置すること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { Camera, Clapperboard, Monitor, Shield, SlidersHorizontal, Users } from 'lucide-react';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
```

### 3.2 Key Interfaces & Types
```ts
// src/features/tactical-unified/stores/tool-types.ts
export type RightPanelTab = 'formation' | 'squad' | 'pitch' | 'camera' | 'screen';

export interface PanelState {
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  rightPanelTab: RightPanelTab;
  isRightPanelOpen: boolean;
  splitPreviewOpen: boolean;
  exportModalOpen: boolean;
  projectManagerModalOpen: boolean;
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
- **モード遷移時の右パネル制御 (`tool-slice.ts` & `tactical-unified-page.tsx`)**: `tactical-unified-page.tsx` の `{!isDirectorMode && !isFocusMode && <RightPanel />}` を `{!isFocusMode && <RightPanel />}` に変更し、レイアウトモードでも右パネルを表示する。`transitionWorkspaceMode` では `targetMode === 'director'` 遷移時に `rightPanelTab: 'camera'`, `isRightPanelOpen: true` とし、`'board'` 復帰時に `rightPanelTab: 'formation'`（または保存していたボード用タブ）へ戻す。
- **トップバーのモード切替トグル位置**: `TopBarCenter` のアスペクト比 `SegmentedControl` のすぐ右隣にモード切替トグルボタン（`<IconButton>` またはラベル付きトグル、title/aria-label: `"Toggle Layout Mode"`）を配置し、`TopBar` 右側にあった重複トグルと `TopBarCenter` 左端の旧 `WORKSPACE_MODE_OPTIONS` セグメントを削除する。
- **Formationパネルの現在選択状態ハイライト**: 対象チーム（`activeTeam`: `'home' | 'away' | 'both'`）のピッチ上選手の先頭（または多数派）の `style.insideContent`（`'number' | 'photo' | 'none'`）と `style.bottomLabel`（`'name' | 'number' | 'none'`）と `style.sizeScale`（デフォルト `1.0`）を読み取り、一致するボタンにアクティブクラス（`bg-[#FF8100]/24 text-[#FFA336] border border-[#FF8100]/80`）を適用して一目で選択状態がわかるようにする。

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: トップバーUI整理・用語統一（ボード/レイアウト）・モード遷移連動
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/toolbar/top-bar.tsx`, `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx`, `src/features/tactical-unified/stores/tool-slice.ts`, `src/features/tactical-unified/tactical-unified-page.tsx`
- **契約 (Interface)**:
  ```ts
  export function TopBar(props?: TopBarProps): React.ReactElement;
  export function TopBarCenter(): React.ReactElement;
  ```
- **Testing Strategy**: `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-center.test.tsx`, `top-bar-copy.test.tsx`, `src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx` を更新・実行し、(1) 重複セグメントが消えアスペクト比横のトグルボタンでボード/レイアウトが切り替わること、(2) `Copy` ラベル表示、(3) レイアウトモード時も `RightPanel` が表示維持されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: テスト更新 ➔ トップバー＆ストア実装 ➔ `bun run ai:check src/features/tactical-unified/panels/toolbar/top-bar.tsx src/features/tactical-unified/panels/toolbar/top-bar-center.tsx src/features/tactical-unified/stores/tool-slice.ts src/features/tactical-unified/tactical-unified-page.tsx` PASS
- **Worker Handoff Log**:
  - `TopBarCenter`: 重複モード切替セグメントを削除しアスペクト比横の `Toggle Layout Mode` トグルへ集約、Swap/Resetを省スペース化。
  - `tool-slice.ts` & `tactical-unified-page.tsx`: Layoutモード遷移時に `rightPanelTab: 'camera'`, `isRightPanelOpen: true` とし右パネルの表示を常時維持。

---

### Phase 2: 右パネルのモード別タブ切替（Formation/Squad/Pitch ⇄ Camera/Screen）と Camera パネル新設
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/stores/tool-types.ts`, `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx`, `src/features/tactical-unified/panels/right-panel/right-panel.tsx`, `src/features/tactical-unified/panels/right-panel/__tests__/right-panel-tabs.test.tsx`
- **契約 (Interface)**:
  ```ts
  export function CameraControlPanel(): React.ReactElement;
  export function RightPanel(): React.ReactElement;
  ```
- **Testing Strategy**: `src/features/tactical-unified/panels/right-panel/__tests__/right-panel-tabs.test.tsx` にて、(1) ボードモード時は `Formation / Squad / Pitch` タブのみ表示され、レイアウトモード時は `Camera / Screen` タブのみ表示されること、(2) `CameraControlPanel` でプリセット選択および `tilt` / `yaw` のスライダー・数値入力変更で `updatePitchTransform` が呼ばれることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/right-panel/__tests__/right-panel-tabs.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/stores/tool-types.ts src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx src/features/tactical-unified/panels/right-panel/right-panel.tsx src/features/tactical-unified/panels/right-panel/__tests__/right-panel-tabs.test.tsx` PASS
- **Worker Handoff Log**:
  - `CameraControlPanel`: プリセット、tilt（0°〜60°）、yaw（0°〜180°）の数値/スライダー連動、Zoom/Pan表示、RotateCcwリセットを実装。
  - `RightPanel`: `workspaceMode === 'director'` 時に `Camera / Screen`、`'board'` 時に `Formation / Squad / Pitch` のタブ切替をレール・SegmentedControl・ボディへ反映。

---

### Phase 3: FormationパネルのUI/UX全面再構築（チーム選択先行・マーカー下部ラベル/サイズ・ボールサイズ・プリセット配置）
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/right-panel/formation-team-toggle.tsx`, `src/features/tactical-unified/panels/right-panel/formation-panel.tsx`, `src/features/tactical-unified/panels/right-panel/__tests__/formation-panel-step5.test.tsx`
- **契約 (Interface)**:
  ```ts
  export interface FormationTeamToggleProps {
    activeTeam: 'home' | 'away' | 'both';
    onTeamChange: (team: 'home' | 'away' | 'both') => void;
    homeColor: string;
    awayColor: string;
    onColorChange: (team: 'home' | 'away', color: string) => void;
    teamPlayersCount: { home: number; away: number };
    currentInsideContent: 'number' | 'photo' | 'none';
    onDisplayModeChange: (mode: 'number' | 'photo' | 'none') => void;
    currentBottomLabel: 'name' | 'number' | 'none';
    onBottomLabelChange: (label: 'name' | 'number' | 'none') => void;
    currentMarkerScale: number;
    onMarkerScaleChange: (scale: number) => void;
    currentBallScale: number;
    onBallScaleChange: (scale: number) => void;
  }
  ```
- **Testing Strategy**: `src/features/tactical-unified/panels/right-panel/__tests__/formation-panel-step5.test.tsx` にて、(1) デフォルトで `Home` が選択されており、`All|H|A` の重複フィルタが存在しないこと、(2) `Display Mode` と `Bottom Label` の現在選択値がアクティブハイライトされクリックで切り替わること、(3) マーカーサイズ・ボールサイズ変更スライダーが機能し、下部に `Formation Presets`（`Half | Full` トグル付き）が表示されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/right-panel/__tests__/formation-panel-step5.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/right-panel/formation-team-toggle.tsx src/features/tactical-unified/panels/right-panel/formation-panel.tsx src/features/tactical-unified/panels/right-panel/__tests__/formation-panel-step5.test.tsx` PASS
- **Worker Handoff Log**:
  - `FormationTeamToggle`: `All|H|A` 表示フィルタを削除し、Display Mode / Bottom Label の選択状態ハイライト、Marker/Ball Size スライダーを新設（300行制限準拠のため `FormationTeamColorPicker` と `ScaleSlider` にサブモジュール分割）。
  - `FormationPanel`: 上部に `FormationTeamToggle`、下部に `Formation Presets` ヘッダーと `FormationPresetSelector` を配置し、Marker/Ball Scale および Bottom Label の一括更新アクションを配線。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-03
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  - トップバーの重複UI排除と「ボード／レイアウト」「プレビュー」への用語統一、全ボタンの shrink-0/whitespace-nowrap を徹底。
  - 右パネルのモード連動タブ（Formation/Squad/Pitch ⇄ Camera/Screen）および新設 CameraControlPanel の双方向数値・スライダー連携を確認。
  - Formationパネルのチーム選択先行配置、アクティブハイライト、マーカー・ボールサイズ調整を完備。全テスト PASS。

## 6. Rejections / Additional Tasks (不可逆修正欄)
