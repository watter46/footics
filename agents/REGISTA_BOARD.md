# Regista Management Board

## 1. [Active Focus]
- **【最重要・基盤設計】統合タクティカルキャンバス（Unified Tactical Canvas）のFigmaライク化とUI大改修**:
  - **背景**: ユーザビリティ（UX）を最大化するため、FigmaライクなモダンUIへ刷新し、拡張機能とのシームレスな画像連携を強化。
  - **確定UI & アーキテクチャ仕様 (Figma-Like & UX First - 全機能実装・検証完了)**:
    - **レイアウト構造の大幅変更**:
      - **左パネル廃止**: 画面左側のパネルを完全削除。
      - **右パネル常時表示**: インスペクター・選手布陣設定を右パネルに集約し常時表示（開閉ラグ・アニメーション廃止）。
      - **ヘッダー強化**: 左右チーム入替、ピッチ復帰、画像Import、右パネル切替（布陣/プロパティ）、PNGコピー、エクスポートをヘッダーに配置。
    - **キャンバスの画像・背景連携**:
      - `video-canvas`拡張機能からのスクショ実行時、デフォルトピッチを自動削除しスクショ画像をキャンバス背景に即時セット。
      - 画像のコピペ（`Ctrl+V`）・ファイルImport・ドラッグ＆ドロップに対応。
      - デフォルトピッチのワンボタン復帰ボタンを配置。
      - **エクスポート用境界線（Boundary Box）**: 4隅のドラッグハンドルで自由にサイズ・範囲を変更可能。エクスポート時には境界線UIを除外し自動クロップ。
    - **ツールバー（描画ツール）の刷新**:
      - **Line（直線）**: シンプルな直線を引く機能。
      - **Route Line（ルートライン・●付き）**: ラインの端点にドットマーカーがつく移動線。
      - **Eraser（消しゴムモード）**: ドラッグでオブジェクトを連続消去。※選手マーカー本体は削除せず、アノテーション・ゾーン・テキスト・マーカーサブオプションを単体削除。
      - 「選手追加」ボタンはツールバーから削除し、右パネルからのD&Dに集約。
    - **フォーメーション ＆ サブメンバー (右パネル)**:
      - 既存Footicsのフォーメーションをベースに Full/Half の両モードを実装。
      - **拡張性**: 将来の`teams`実装を見据えたシーズンプリセットデータ構造（`SeasonFormationPreset`）を導入。
      - **サブメンバーの自由なD&D**: ピッチ内とサブメンバーエリアを自由に行き来可能（人数制限なし）。
      - **サブ帰還時のクリーンアップ**: 選手がサブメンバーエリアに戻った際、紐づくマーカーオプションやアタッチ矢印を自動削除。
    - **ピッチ操作**:
      - チームの左右（攻める方向）をワンボタンで反転入れ替え可能。

## 2. [Backlog / Adopted Roadmaps (オーナー承認済 バックログ)]
- **【構造改革】拡張機能の1本化統合 (Unified Extension Pipeline)**:
  - `video-canvas` の Konva 描画エンジンを `extension/` へ統合し、ブラウザ拡張を単一パッケージに集約。
- **【品質基盤】エージェント性能最大化 3大ルールの徹底運用**:
  - 1. State Machine厳守 / 2. 極小AAWU（1〜3ファイル） / 3. KI自動更新。
- **【リファクタリング】チーム機能（チェルシー画面）のモダン化 & 汎用化**:
  - `ChelseaSquadClient.tsx` 分割、動的ルーティング `/teams/[teamId]` 対応。

## 3. [Activity Log]
- **2026-08-28**: [Final Precision Polish Complete] ピッチ白線基準の均等余白境界線フィット（16:9/9:16アスペクト比換算で上下左右のピクセル余白を完全均等化）、マーカー移動時の矢印先頭位置固定（終点はピッチ元座標にとどまり始点のみ追従）、ピッチ⇄サブメンバー間のワンクリック双方向ジャンプ（PlayerInspectorに「サブへ送る」、サブグリッドにピッチ配置＆プロパティ即時展開）を完全実装・検証完了（Vitest 78件全パス、TypeScriptエラー0件、Biomeエラー0件）。
- **2026-08-28**: [Tactical Canvas UI/UX Precision Tuning Complete] 境界線均等余白フィット(2.5% padding)、描画時選手ポインタ保護(listening制御)、矢印・Line曲げ幅ドラッグ感度1.8倍増幅、Focus半径3~5(デフォルト3)、選手ドラッグ強調半径5、視野長デフォルト13、コネクト線太さ&発光、フォーメーション初期配置リセットボタン、ピッチ上選手一覧削除、サブエリアGrid表示&D&D双方向移動(マーカー自動剥離)、縦横ピッチ反転切替(9:16/16:9対応)を完全実装・検証完了（Vitest 78件全パス、TypeScriptエラー0件、Biomeエラー0件）。
- **2026-08-28**: [Advanced Drawing & Marker Features Complete] ツールバーリセットボタン(RotateCcw)、カーブ自動切替、ゾーン回転ハンドル削除(4隅ホバー回転カーソル化)、RouteLine中抜き両端●ライン隣接トリミング、連続描画ロック(|区切りグループ化)、境界線自動フィットボタン、マーカーオプションアイコン押下即時適用、ドラッグ時オレンジ発光グロー(scale拡大廃止)、Focusスポットライト強調機能を完全実装・検証完了（Vitest 66件パス、TypeScriptエラー0件、Biomeエラー0件）。
- **2026-08-28**: [UX/UI Refinements Complete] ツールバー消しゴムポインタ/フリーゾーン消去、RouteLine追従&中抜き両端●、ゾーン回転インジケータ、リアルタイム色変更、マーカーオプション横並びアイコンタブ化、キャンバス内視野コーン・コネクタ操作、チームカラー即時反映を完全実装・検証完了（Vitest 62件パス、TypeScriptエラー0件、Biomeエラー0件）。
- **2026-08-28**: [Implementation & QA Complete] AAWU 2-1 〜 AAWU 2-6 の全タスク実装完了。Vitest（31テスト全パス）、Biome（エラー0件）、TypeScript型チェック（エラー0件）の品質検証を完了。
- **2026-08-28**: [Owner Decision] 統合キャンバスの大幅UI改修（Figmaライク化、左パネル廃止、右パネル常時表示、Line/Eraserツール追加、スクショ背景連携、フォーメーション＆サブメンバーD&D拡張）を正式決定。
- **2026-08-27**: [Owner Decision] 「Tactical（統合キャンバス）先行完成 → Teams移行」方針を正式決定。

## 4. [Task Matrix (AAWU: Unified Tactical Canvas UI/UX改修)]

| Step / # | タスク名（UIパーツ・機能） | 担当 | 対象ファイル | 主な実装・ゴール | ステータス |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AAWU 1-0** | Contract-First 型・Store・基盤スキャフォールド | `regista-data` | `src/lib/types/tactical-unified.ts`<br>`src/stores/tactical-unified-store.ts` | Zodスキーマ、座標変換、Storeテスト全件パス | **DONE** ✅ |
| **AAWU 2-1 (Step 1)** | 🥇 **Layout & Header: Figmaライク基盤** | `regista-frontend` | `src/components/features/tactical-unified/tactical-unified-page.tsx`<br>`src/components/features/tactical-unified/toolbar/top-bar.tsx` | 左パネル廃止、右パネル常時表示枠確保、ヘッダーにトグルアイコン配置 | **DONE** ✅ |
| **AAWU 2-2 (Step 2)** | 🥈 **Canvas Base: 背景画像連携 & 左右入替** | `regista-canvas` | `src/components/features/tactical-unified/canvas/unified-canvas.tsx`<br>`src/stores/tactical-unified-store.ts` | 拡張機能スクショ受付でピッチ削除＆画像セット、コピペ/Import対応、ワンボタンピッチ配置、チーム左右入替 | **DONE** ✅ |
| **AAWU 2-3 (Step 3)** | 🥉 **Right Panel: Formation & Sub-members** | `regista-frontend`<br>`regista-canvas` | `src/components/features/tactical-unified/right-panel/*`<br>`src/components/features/tactical-unified/canvas/player-layer.tsx` | Full/Halfフォーメーション(拡張性担保)、サブメンバー自由D&D、サブ帰還時のマーカー削除 | **DONE** ✅ |
| **AAWU 2-4 (Step 4)** | 🏅 **Toolbar: Line, Route Line, Eraser** | `regista-canvas` | `src/components/features/tactical-unified/toolbar/drawing-toolbar.tsx`<br>`src/components/features/tactical-unified/canvas/annotation-layer.tsx` | 選手追加ボタン削除、Lineツール、Route Line(ドット付)ツール、Eraser(選手除外＆連動削除)モード実装 | **DONE** ✅ |
| **AAWU 2-5 (Step 5)** | 🎖️ **Export Boundary & Multi-Slide** | `regista-canvas` | `src/components/features/tactical-unified/canvas/boundary-box.tsx`<br>`src/components/features/tactical-unified/hooks/use-konva-export.ts` | 4点ドラッグ可能な書出境界線(エクスポート時除外・自動クロップ) | **DONE** ✅ |
| **AAWU 2-6 (QA)** | 🛡️ **全体結合テスト & ルーブリックQA** | `regista-qa` | 全体 | Vitest 31件全パス、Biomeエラー0件、TypeScript型エラー0件検証完了 | **DONE** ✅ |
| **AAWU 2-7 (UX)** | 💎 **ツールバー・マーカーオプション・インスペクター精密改善** | `regista-frontend`<br>`regista-canvas` | `src/components/features/tactical-unified/*` | 消しゴム指ポインタ/フリーゾーン消去、RouteLine中抜き両端●＆追従、ゾーン回転明示、リアルタイム色変更、マーカーオプション横並びアイコン化、視野/コネクタのキャンバス内操作、チームカラー即時反映 | **DONE** ✅ |
| **AAWU 2-8 (Advanced)** | 🚀 **連続描画ロック・境界線自動フィット・Focusスポットライト・Reset・操作性極限改善** | `regista-frontend`<br>`regista-canvas` | `src/components/features/tactical-unified/*` | Resetボタン(RotateCcw)、カーブ自動切替、Konva上部回転ノブ削除＆4隅回転カーソル、RouteLine両端中抜き●線分隣接トリム、連続描画ロック、境界線ワンボタン自動フィット、マーカーオプション即時適用、ドラッグ時オレンジ発光グロー、Focus(スポットライト強調)実装 | **DONE** ✅ |
| **AAWU 2-9 (Precision)** | 🎯 **境界線余白フィット・描画時選手保護・曲げ感度向上・Focus微調整・サブGrid D&D・縦横ピッチ反転** | `regista-frontend`<br>`regista-canvas` | `src/components/features/tactical-unified/*` | 境界線均等余白フィット(2.5%)、描画中player非干渉化、曲線ドラッグ感度1.8x増幅、Focus(3~5/デフォルト3)、ドラッグ強調半径5、視野長13、コネクト発光太線、初期配置リセットボタン、ピッチ選手一覧削除、サブGrid D&D双方向移動(マーカー自動剥離)、縦横ピッチ反転 | **DONE** ✅ |
| **AAWU 2-10 (Polish)** | ✨ **ピッチ外枠均等フィット・矢印先頭固定・ピッチ⇄サブ双方向ジャンプ** | `regista-frontend`<br>`regista-canvas` | `src/components/features/tactical-unified/*` | ピッチ白線基準の均等余白フィット（16:9/9:16完全対応）、選手移動時の矢印先頭固定（始点追従・終点維持）、PlayerInspector「サブへ送る」/サブグリッド「ピッチ配置＆インスペクター即時展開」 | **DONE** ✅ |

## 5. [Architecture & Boundaries]
- **Mode-less Multi-Slide**: 静止画/動画のモード切替を廃止し、自由なスライド構築とエクスポート選択に一本化。
- **Free D&D Placement**: 選手数を固定せず、ピッチとサブメンバーエリア間で無制限に行き来可能。
- **Extension Integration**: スクリーンショットの即時背景化をサポートし、スムーズな画像編集を実現。
