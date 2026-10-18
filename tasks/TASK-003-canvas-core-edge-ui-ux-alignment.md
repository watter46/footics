# TASK-003: Edge/Extension CSS適正化 & カラーピッカーコンパクト化 & コネクタ接続UX強化 & 選択状態カラーハイライトUI/UX

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-18
- **Target**: `src/features/tactical-unified/core/`, `src/app/globals.css`, `extension/`
- **Conversation IDs (エージェントログ参照用)**:
  - Planner (Parent): `b0b1383a-b5f6-4471-b589-a8960a78b4db`

---

## 2. Requirements (要件)
- [x] [要件1: Edge/Extension CSS 完全適正化 & 不透明ダーク背景の堅牢化 (二重防壁)]
  - `src/app/globals.css` に `@source "../";` を追加し、Tailwind CSS v4 が `src/features/tactical-unified/core/` 配下の全 Tailwind クラス（`bg-[#222222]`, `border-[#383838]`, `bg-[#0d99ff]`, `shadow-xl`, `w-48` 等）を CSS に抽出するようにする。
  - `ContextHud.tsx`, `DraggableToolbar.tsx` (`FixedToolbar`), `mini-color-picker.tsx` 等の主要 HUD / ツールバーコンテナに、明示的なインラインスタイル `style={{ backgroundColor: '#222222', borderColor: '#383838', color: '#ffffff' }}` を付与。CSS の読み込み状態に依存しない 100% 不透明ダークを保証する。
- [x] [要件2: カラーオプションのコンパクト化 & 巨大展開防止]
  - `mini-color-picker.tsx` のドロップダウンに `style={{ width: 192, maxWidth: 200, backgroundColor: '#222222', borderColor: '#383838' }}` を設定。
  - 各カラースウォッチに `style={{ width: 24, height: 24, minWidth: 24, minHeight: 24 }}` を設定し、CSS が万が一当たらない環境でも絶対に巨大化しないように固定する。
  - 現在選択中のカラースウォッチに外側青リング（`boxShadow: '0 0 0 2px #0d99ff, 0 0 0 4px #222222'`）をインラインスタイルで確実に付与する。
- [x] [要件3: ツールバー & オプションのアクティブ/選択中ハイライト（色付け UI/UX）]
  - 選択中のアイテムを枠線の太さでなく、明確なアクセントカラー（鮮やかな Figma Blue `#0d99ff` 背景 ＋ 白文字/白アイコン）で塗りつぶして一目でわかるようにする。
  - ツールバー選択ツール: `backgroundColor: '#0d99ff', color: '#ffffff'` をインラインスタイルで付与。
  - HUD のトグルボタン（実線/点線、四角/円、ロック等）: 選択状態に明確なアクセントカラー（`#0d99ff`）をインライン適用。
  - マーカー HUD アクション（Vision Cone, Spotlight, ConnectLine）: 有効（ON）時に鮮やかなアクセント色（`#0d99ff` 等）で背景を塗りつぶす。
- [x] [要件4: コネクタ接続待機中 UI/UX の全面強化 & キャンセル操作]
  - `connectingPlayerId !== null` の時：
    - **接続待機ガイダンスバッジ**: `CanvasOverlays.tsx` でキャンバス上部中央に青アクセントバッジ（`🔗 接続先マーカーをクリックしてください (ESCでキャンセル)`）を表示。
    - **接続元マーカーの強調**: `PlayerLayer.tsx` で、接続元の足元に青色パルスリング/強調グローリングを描画。
    - **接続候補マーカーのハイライト**: 他の全マーカーの足元にターゲットリング（点線・シアン）を表示し、ホバーでポインタ cursor にする。
    - **動的ラバーバンド線**: 接続元マーカー中心からマウスカーソル位置へ追従する点線コネクタ（`stroke: '#38bdf8'`, `dash: [5, 5]`）を描画。
    - **キャンセル操作**: ESC キー、またはキャンバス背景クリックで `setConnectingPlayerId(null)` を実行。

---

## 3. Implementation Phases (Worker 実装手順)

### Phase 1: Edge/Extension CSS 完全適正化 & 不透明背景の堅牢化 (二重防壁)
- **Worker Model**: `flash`
- **対象スコープ**: `src/app/globals.css`, `src/features/tactical-unified/core/components/ContextHud.tsx`, `src/features/tactical-unified/core/components/toolbar/DraggableToolbar.tsx`
- **契約 (Interface)**:
  - `globals.css`:
    ```css
    @import "tailwindcss";
    @import "tw-animate-css";
    @import "shadcn/tailwind.css";

    @source "../";
    ```
  - `ContextHud.tsx` & `DraggableToolbar.tsx` (`FixedToolbar`):
    コンテナのルート `div` に `style={{ backgroundColor: '#222222', borderColor: '#383838', color: '#ffffff', ...style }}` を付与。
- **Testing Strategy**:
  - 対象: `src/features/tactical-unified/core/__tests__/canvas-phase9.test.tsx` または新設テスト
  - ケース:
    - `ContextHud` および `FixedToolbar` の DOM 要素が `style="background-color: rgb(34, 34, 34); border-color: rgb(56, 56, 56);"` を保持すること
    - Extension ビルド後の CSS ファイル（`.output/chrome-mv3/assets/*.css`）に `222222` および `383838` が含まれていること
- **Steps**:
  - [x] 1. `src/app/globals.css` に `@source "../";` を追加
  - [x] 2. `ContextHud.tsx` および `DraggableToolbar.tsx` のルート div にインラインスタイルを設定
  - [x] 3. Extension ビルドを実行し、出力 CSS に `#222222` が出力されていることを検証
- **Phase Verification**:
  - [x] `bun run ai:check src/features/tactical-unified/core/components/ContextHud.tsx src/features/tactical-unified/core/components/toolbar/DraggableToolbar.tsx` が exit code 0 で全PASS
  - [x] `bun run --cwd extension compile && bun run --cwd extension build` が exit code 0 で全PASS

---

### Phase 2: カラーオプションのコンパクト化 & 選択状態カラーハイライトUI/UX
- **Worker Model**: `flash`
- **対象スコープ**: `src/features/tactical-unified/core/components/hud/`, `src/features/tactical-unified/core/components/toolbar/`
- **契約 (Interface)**:
  - `mini-color-picker.tsx`:
    - ポップオーバーコンテナに `style={{ width: 192, maxWidth: 200, backgroundColor: '#222222', borderColor: '#383838' }}`
    - 各カラースウォッチに `style={{ width: 24, height: 24, minWidth: 24, minHeight: 24 }}`
    - 選択中スウォッチに `boxShadow: '0 0 0 2px #0d99ff, 0 0 0 4px #222222'`
  - `ToolbarToolsGroup.tsx`:
    - アクティブツールボタンに `style={isActive ? { backgroundColor: '#0d99ff', color: '#ffffff' } : undefined}`
  - `arrow-hud.tsx`, `zone-hud.tsx`, `connect-line-hud.tsx`, `player-quick-actions.tsx`:
    - 実線/点線、四角/円、ロック、視野コーン、コネクタ、スポットライト等のトグルボタンで、アクティブ時に `style={{ backgroundColor: '#0d99ff', color: '#ffffff' }}`（またはロック時は琥珀色 `#f59e0b`）を適用。太さを変えるのではなく「色をつけて」一目で分かるUI/UXにする。
- **Testing Strategy**:
  - 対象: `src/features/tactical-unified/core/components/hud/__tests__/mini-color-picker.test.tsx` または既存テスト
  - ケース:
    - `MiniColorPicker` のポップオーバー幅が 192px で固定され、スウォッチが 24x24px であること
    - ツールバーのアクティブツールボタンに背景色 `#0d99ff` が設定されること
    - トグルボタンのアクティブ状態にアクセントカラーが設定されること
- **Steps**:
  - [x] 1. `mini-color-picker.tsx` をコンパクトに固定化し、選択中スウォッチの青リングをインライン設定
  - [x] 2. `ToolbarToolsGroup.tsx` にアクティブ色のインラインスタイルを追加
  - [x] 3. `arrow-hud.tsx`, `zone-hud.tsx`, `connect-line-hud.tsx`, `player-quick-actions.tsx` のトグル状態にアクセント色スタイルを適用
- **Phase Verification**:
  - [x] `bun run ai:check src/features/tactical-unified/core/components/hud/ src/features/tactical-unified/core/components/toolbar/` が exit code 0 で全PASS

---

### Phase 3: コネクタ接続待機中 UI/UX の全面強化 & キャンセル操作
- **Worker Model**: `flash`
- **対象スコープ**: `src/features/tactical-unified/core/components/`, `src/features/tactical-unified/core/hooks/`
- **契約 (Interface)**:
  - `CanvasOverlays.tsx`:
    - `connectingPlayerId !== null` の時、画面上部中央に青アクセントガイダンスバッジを表示：
      `🔗 接続先マーカーをクリックしてください (ESCでキャンセル)`
  - `PlayerLayer.tsx`:
    - 接続元マーカー（`player.id === connectingPlayerId`）の足元に青色パルス・強調グローリングを描画。
    - 接続先候補マーカー（`player.id !== connectingPlayerId`）の足元にターゲットリング（点線・シアン）を表示し、ホバーでポインタ cursor にする。
  - `PlayerConnectLines.tsx`:
    - `connectingPlayerId` が存在し、マウスカーソルが移動中のとき、接続元マーカー中心からマウス位置への仮の点線コネクタ（`stroke: '#38bdf8'`, `dash: [5, 5]`）を描画。
  - `canvas-shortcuts-handler.ts` & `CanvasStageContainer.tsx`:
    - ESC キー押下、またはキャンバス背景クリック時に `setConnectingPlayerId(null)` を呼び出して接続待機を安全にキャンセル。
- **Testing Strategy**:
  - 対象: `src/features/tactical-unified/core/components/__tests__/player-connector.test.tsx` または新設テスト
  - ケース:
    - `connectingPlayerId` がセットされた時、キャンバス上にガイダンスバッジが表示されること
    - ESC キー押下で `connectingPlayerId` が `null` にリセットされること
- **Steps**:
  - [x] 1. `CanvasOverlays.tsx` に接続ガイダンスバッジを追加
  - [x] 2. `PlayerLayer.tsx` に接続元強調リングおよび接続候補ハイライトリングを描画
  - [x] 3. `PlayerConnectLines.tsx` に接続待機中のラバーバンド線プレビューを描画
  - [x] 4. ESC キーおよびステージクリックでのキャンセル処理を接続
  - [x] 5. 全体テスト & Extension ビルド & 規約検証
- **Phase Verification**:
  - [x] `bun run ai:check src/features/tactical-unified/core/ extension/features/canvas/` が exit code 0 で全PASS
  - [x] `bun run --cwd extension compile && bun run --cwd extension build` が exit code 0 で全PASS
  - [x] `bun run typecheck && bun run lint` が exit code 0 で全PASS

---

## 4. Reviewer Checklist & Assessment

### 4.1 Automated Gates (自動検証)
- [x] すべての Phase のチェックボックス (`- [x]`) が完了していること
- [x] `bun run ai:check src/features/tactical-unified/core/ extension/features/canvas/` が exit code 0 で全PASS
- [x] `bun run --cwd extension compile && bun run --cwd extension build` が exit code 0 で全PASS
- [x] `bun run typecheck && bun run lint` が exit code 0 で全PASS
- [x] ビルド成果物 CSS に `#222222`, `#383838`, `#0d99ff` が確実に含まれていること

### 4.2 Quality & Spec Audit (仕様・品質審査)
- [x] Edge/Extension 環境でのスタイル崩れ（背景透明・黒枠線）が完全解消されていること
- [x] カラーピッカーがコンパクトな Figma 風ポップオーバーとして動作し巨大化しないこと
- [x] ツールバーおよび HUD オプションの選択状態が枠線の太さではなく鮮やかな色でハイライトされていること
- [x] コネクタ接続待機中にガイダンスバッジ・候補ハイライト・ラバーバンド線が表示され、選択待ちであることが一目でわかること
- [x] ホスト境界・1ファイル200行（最大250行）規約が厳守されていること

### 4.3 Reviewer Decision
- **Decision**: `LGTM` (PASSED)
- **Reviewed At**: 2026-10-18T18:07:00+09:00
- **Reviewer**: Footics Reviewer Agent
- **Assessment Summary**:
  1. **自動検証ゲート**: 全ゲートを exit code 0 でパス。
     - `ai:check` (Vitest 16 files, 69 tests): 全PASS
     - Extension compile (`tsc --noEmit`) & build (`wxt build`): エラーなし
     - `typecheck` & `lint`: TypeScript エラー 0 件、Biome lint エラー 0 件
     - Extension CSS 出力検証: `#222222`, `#383838`, `#0d99ff` が `overlay.css` および `jsx-runtime-*.css` に確実に生成されていることを確認
  2. **要件網羅性**:
     - 要件1 (二重防壁ダーク背景): `globals.css` の `@source "../";` による Tailwind クラス出力と、`ContextHud` / `FixedToolbar` のインラインスタイルの二重防壁で背景透明化・枠線崩れを根絶。
     - 要件2 (コンパクトカラーピッカー): `width: 192px`, スウォッチ `24x24px` 固定、選択中アクティブ青リング（`boxShadow`）で巨大化防止を保証。
     - 要件3 (色付けアクティブハイライト): ツールバー、HUD（線種・形状・ロック・Cone・Spotlight・ConnectLine）の選択状態を太さ変更ではなく鮮やかなアクセント色（`#0d99ff`, `#f59e0b`, `#10b981` 等）でハイライト。
     - 要件4 (コネクタ接続UI/UX強化): 画面上部ガイダンスバッジ、接続元の強調グローリング、接続候補の点線シアンリング、マウス追従の動的ラバーバンド線、ESCキー・ステージクリックでのキャンセル処理を完備。
  3. **品質・規約遵守**:
     - 全ファイルが 200 行以内（最大でも 220 行で 250 行上限内）。
     - `isExtension`, `process.env`, `chrome.` 等の環境分岐は Level 2 core 内に一切存在せず、ホスト境界を完全遵守。
     - Biome v2 strict, TypeScript strict 準拠。


