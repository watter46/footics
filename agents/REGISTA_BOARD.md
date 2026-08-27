# Regista Management Board

## 1. [Active Focus]
- **【最重要・基盤設計】統合タクティカルキャンバス（Unified Tactical Canvas）の構築**:
  - **背景**: Studio（特定時間指定→選手/フォーメーション自動配置）の導入に先立ち、基盤となる静止画・アニメーション機能のUI/データ構造を統合する。
  - **確定UI & アーキテクチャ仕様 (Mode-less / Free D&D First)**:
    - **自由なD&D選手配置（11人縛りなし）**: 11人に限定せず、左パレットから選手をドラッグ＆ドロップで何人でもピッチに出し入れ可能（局所戦術 3v3・ロンド練習・退場10人ブロック等にも完全対応）。
    - **プリセット一括展開**: 4-3-3等のフォーメーションボタン1発でスタメン11人を自動配置・変形させる機能も併用サポート。
    - **モードレス・マルチスライド構造**: 「静止画モード」「動画モード」の分離を撤廃。基本は単一キャンバスで、下部の `[ ＋ スライド追加 ]` で自由にスライド（シーン）を増やせるパワポ/Canva型。
    - **下部スライドストリップ**: 画面最下部にミニマムなスライド一覧 `[ ▶ プレビュー ]` ｜ `[ 📄 1 ]` `[ 📄 2 ]` ... `[ ＋ 追加 ]` を配置。
    - **フレキシブル・エクスポート (📤 書き出しボタン)**:
      - モーダルポップアップで成果物プレビューを確認しながら出力形式を選択：
        - 静止画: `現在のスライドPNG` / `全スライド一括ZIP` / `選択スライドPNG`
        - 動画: `全スライド連結アニメーション(MP4/GIF)` / `指定スライド間動画化`
    - **ワンタップ即時コピー (📋 コピーボタン)**: 現在表示中のスライドを瞬時にクリップボードへPNG画像化（X等へCtrl+V即貼り付け）。
    - **拡張機能からのスクショ自動連携**: ブラウザ拡張で撮影したスクショから、Footicsの統合編集ページが新タブで自動起動し、背景に即時バインド。
    - **トップバー配置 (Minimal Clean)**:
      - 左端: `[ 📁 レイヤー/選手パレット ]`（サイドパネル開閉）
      - 中央: `[ 📐 16:9 / 9:16 ]`（全画面アスペクト比切替・データ完全同期）
      - 右端: `[ 📋 コピー ]` ｜ `[ 📤 書出 ]` ｜ `[ ⚙️/☰ その他メニュー ]`（JSONインポート/背景切替/保存）
    - **中央キャンバス最大化**: 左パネルは基本折りたたみ、ピッチ上部に描画ツールバーをフロート配置。
    - **右プロパティパネル (Inspector)**: 選手・矢印をクリックした時だけ詳細設定が集約表示。
    - **ネスト構造**: 選手オブジェクト配下に「視野コーン」「コネクト線」「バッジ」を内包。

## 2. [Backlog / Adopted Roadmaps (オーナー承認済 バックログ)]
- **【基盤設計】統合タクティカルキャンバス（Mode-less Multi-Slide ＆ 自由D&D方式）**（Active Focusへ昇格）
- **【構造改革】拡張機能の1本化統合 (Unified Extension Pipeline)**:
  - `video-canvas` の Konva 描画エンジンを `extension/` へ統合し、ブラウザ拡張を単一パッケージに集約。
- **【品質基盤】エージェント性能最大化 3大ルールの徹底運用**:
  - 1. State Machine厳守 / 2. 極小AAWU（1〜3ファイル） / 3. KI自動更新。
- **【リファクタリング】チーム機能（チェルシー画面）のモダン化 & 汎用化**:
  - `ChelseaSquadClient.tsx` 分割、動的ルーティング `/teams/[teamId]` 対応。

## 3. [Activity Log]
- **2026-08-27**: [Owner Decision] 「Tactical（統合キャンバス）先行完成 → Teams移行」方針を正式決定。
- **2026-08-27**: [Architecture] 依存関係解析に基づき、統合キャンバスの実装を6つの極小AAWU（Step 1〜6）へ分解・優先順位付け。
- **2026-08-27**: [Owner Decision] 「自由なD&D選手配置（11人制限なし / 局所戦術・ロンド対応）」および「プリセット一括展開サポート」を決定・反映。
- **2026-08-27**: [Owner Decision] 「Mode-less マルチスライド構造（＋でスライド追加・エクスポート時に静止画/動画を選択）」および「拡張機能スクショ自動連携」を正式決定。
- **2026-08-27**: [Owner Decision] 左端＝サイドパネル開閉、右端＝設定メニュー・出力アクションのトップバー配置を確定。
- **2026-08-27**: [Owner Decision] エクスポート仕様（📋ワンタップPNGコピー ＆ 📤プレビューモーダル付き書き出し）を確定。
- **2026-08-27**: [Owner Decision] 「拡張機能の1本化」および「エージェント性能引き上げ3大ルール」の採用を決定。
- **2026-08-26**: [regista-gm] Syntax統括GM（Mai）より `SYNTAX_STUDIO_PRD.md` を受領。

## 4. [Task Matrix (AAWU: Unified Tactical Canvas 分解実装)]

| Step / # | タスク名（UIパーツ・機能） | 担当 | 対象ファイル | 主な実装・ゴール | ステータス |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AAWU 1-0** | Contract-First 型・Store・基盤スキャフォールド | `regista-data` | `src/lib/types/tactical-unified.ts`<br>`src/stores/tactical-unified-store.ts` | Zodスキーマ、座標変換、Storeテスト82件パス | **DONE** ✅ |
| **AAWU 1-1 (Step 1)** | 🥇 **Central Canvas: 選手・ボール操作性** | `regista-canvas` | `src/components/features/tactical-unified/canvas/player-layer.tsx`<br>`src/components/features/tactical-unified/canvas/ball-object.tsx` | 選手マーカーのD&D吸い付き、ホバー/選択枠、当たり判定、ネスト要素 | **Ready** ⏳ |
| **AAWU 1-2 (Step 2)** | 🥈 **Central Canvas: 矢印・ゾーン・テキスト描画** | `regista-canvas` | `src/components/features/tactical-unified/canvas/annotation-layer.tsx`<br>`src/components/features/tactical-unified/canvas/unified-canvas.tsx` | ピッチ上ドラッグでの矢印描画、多角形ゾーン作成、テキスト配置 | **Pending** ⏹️ |
| **AAWU 1-3 (Step 3)** | 🥉 **Inspector Panel: 双方向プロパティ編集** | `regista-frontend` | `src/components/features/tactical-unified/inspector/inspector-panel.tsx` | 選択中オブジェクト（選手/矢印/ゾーン）のリアルタイムスタイル変更・削除 | **Pending** ⏹️ |
| **AAWU 1-4 (Step 4)** | 🏅 **Side Panel: 選手パレット & フォーメーション展開** | `regista-frontend` | `src/components/features/tactical-unified/sidebar/side-panel.tsx` | 左ドロワーからのD&D投入、4-3-3等のプリセット一括整列配置 | **Pending** ⏹️ |
| **AAWU 1-5 (Step 5)** | 🎖️ **Slide Strip: マルチスライド & アニメーション** | `regista-canvas` | `src/components/features/tactical-unified/slides/slide-strip.tsx`<br>`src/components/features/tactical-unified/canvas/unified-canvas.tsx` | シーン追加/複製/削除、スライド間イージング補間プレビュー再生 | **Pending** ⏹️ |
| **AAWU 1-6 (Step 6)** | 📦 **Top Bar & Export: PNG即時コピー ＆ 書出モーダル** | `regista-frontend`<br>`regista-canvas` | `src/components/features/tactical-unified/toolbar/top-bar.tsx`<br>`src/components/features/tactical-unified/export/export-modal.tsx` | 📋ワンタップPNGクリップボード化、ZIP/GIF/MP4書き出しパイプライン | **Pending** ⏹️ |
| **AAWU 1-7 (QA)** | 🛡️ **全体結合テスト & Biome/TSC/ルーブリックQA** | `regista-qa` | 全体 | 10軸ルーブリック採点、エンドツーエンド動作検証 | **Pending** ⏹️ |

## 5. [Architecture & Boundaries]
- **Mode-less Multi-Slide**: 静止画/動画のモード切替を完全廃止し、スライドの枚数（1枚＝静止画、複数枚＝アニメーション）とエクスポート時の自由選択に一本化。
- **Free D&D Placement**: 選手数を固定せず、配列データとして柔軟に保持することで局所戦術からフルピッチまでカバー。
- **Export Pipeline**: `html-to-image` / `mp4-muxer` を用いたプレビュー付きモーダル ＋ `navigator.clipboard.write` による瞬時PNGコピー。
