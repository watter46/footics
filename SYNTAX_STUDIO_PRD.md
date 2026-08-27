# 【Regista開発発注書】Syntax Studio 構築仕様書 (v2.0)

```text
================================================================================
【案件名】: Syntax Studio（2画面並列・成果物最大表示型 アライメント基盤）の構築
【依頼元】: Syntax 統括GM (Mai)
【受託先】: Regista 統括GM (regista-gm)
【対象パッケージ】: src/ (Web App - Next.js 16 / React 19 / Konva / Tailwind v4)
【専用URL】: /syntax-studio (src/app/syntax-studio/page.tsx)
【実行モデル体制】: [Design / QA] -> pro ｜ [Implementation] -> flash
================================================================================
```

---

## 1. 開発背景と本質課題

- **背景**: サッカー戦術分析メディア「Syntax」において、AI（`syntax-visual-director`）が生成した戦術シーンJSON（`footics-integration-v1.json`）の幾何学的精度を向上させる必要がある。
- **本質課題**: プロンプト調整のみで座標を合わせ込むのは非効率である。「AI原案（Draft）」と「オーナー修正案（Ground Truth）」を2画面並列で比較・手直しし、その対照データを蓄積してAIを継続アライメントする基盤を最短工数で構築する。
- **重要規約**: 
  - ゼロからの再開発・クローンを厳禁とし、Footics既存のKonva描画基盤（`tactical-board` 等）を最大限流用する。
  - 本番ルートへのデグレを防止するため、全コードを `/syntax-studio` 配下に完全隔離する。

---

## 2. システム要件 & UI仕様

### ① UI設計原則: 「Large Canvas First（成果物最大表示）」
- **画面占有率**: 画面領域の80%以上を16:9のピッチキャンバスが占有すること。
- **入力UIの退避**: JSONテキストエリアや設定パネルは「折りたたみドロワー（Collapsible Drawer）」とし、通常時は非表示でピッチを最大化。
- **表示モードトグル**:
  - `Split View`: 左右2画面並列（AI Draft ⇄ Ground Truth）で最大表示。
  - `Focus View`: オーナー編集キャンバスを画面いっぱいに超巨大表示。

### ② 画面ワイヤーフレーム

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Footics - Syntax Studio                    [📁 JSON読込/貼付 (Drawer)] [🔲 Split / 🔍 Focus 切替]│
├───────────────────────────────────┬──────────────────────────────────────────────────────────────┤
│ 【AI Draft (固定・読込専用)】     │ 【Human Ground Truth (オーナー手動編集キャンバス)】          │
│                                   │                                                              │
│ ┌───────────────────────────────┐ │ ┌───────────────────────────────────────────────┐            │
│ │                               │ │ │                                               │            │
│ │   [ 巨大 16:9 確定成果物 ]     │ │ │   [ 巨大 16:9 インタラクティブ編集 ]          │            │
│ │   ・AI生成の戦術シーン        │ │ │   ・選手アイコンをドラッグ移動 (x,y即時更新)  │            │
│ │   ・操作ロック                │ │ │   ・10文字バッジのインライン書き換え          │            │
│ │                               │ │ │   ・矢印の始点/終点微調整                     │            │
│ │                               │ │ │                                               │            │
│ └───────────────────────────────┘ │ └───────────────────────────────────────────────┘            │
├───────────────────────────────────┴──────────────────────────────────────────────────────────────┤
│ 【コマ送り】: [Scene 1: Hook]  [Scene 2: Context]  [Scene 3: Mechanism]  [Scene 4: Detail]        │
│                                                                                                  │
│ ┌──────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ 💾 [対照データを保存 (Save Alignment Pair)]                                                  │ │
│ └──────────────────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 機能要件詳細 (Functional Requirements)

| # | 機能名 | 詳細仕様 | 担当ドメイン |
| :--- | :--- | :--- | :--- |
| **F1** | **JSON Input Drawer** | ・`footics-integration-v1.json` のテキスト貼付 or ファイルDrop<br>・Zodスキーマ検証とエラーハンドリング | Data / Frontend |
| **F2** | **2画面並列レンダリング** | ・左：AI Draft（操作不可・参照プレビュー）<br>・右：Ground Truth（操作可能キャンバス）<br>・4シーンのタブ切り替え連動 | Canvas / Frontend |
| **F3** | **インタラクティブ手直し** | ・選手アイコンをドラッグ移動（0.0〜100.0正規化座標に即時双方向バインド）<br>・バッジ（アノテーション）テキストのインライン編集<br>・矢印（ベクトル）の微調整 | Canvas |
| **F4** | **対照データペア保存** | ・`Save Alignment Pair` ボタン押下時、`syntax/pipeline/tuning-dataset/{id}.json` 形式でペアJSONを保存（API / ファイル出力） | Data / Frontend |

---

## 4. データ保存スキーマ (`tuning-dataset/{id}.json`)

```json
{
  "datasetId": "tuning_chelsea_fulham_001",
  "timestamp": "2026-08-26T23:30:00.000Z",
  "matchMetadata": {
    "homeTeam": "Chelsea",
    "awayTeam": "Fulham",
    "actionType": "Open Play Breakdown"
  },
  "aiDraft": {
    "version": "1.0.0",
    "tacticalScenes": [ /* AIが生成した初期4コマ */ ]
  },
  "humanGroundTruth": {
    "version": "1.0.0",
    "tacticalScenes": [ /* オーナーが右画面で手直しした確定4コマ */ ]
  }
}
```

---

## 5. AAWU（タスク分解）とモデル割り当て計画

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 【Phase 1: 設計 (Design Phase)】- Model: pro                                                     │
│   ・型定義確定 (footics-integration-v1.json ⇄ TypeScript)                                       │
│   ・コンポーネント構造・状態管理（Zustand / useState）のインターフェース設計                     │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 【Phase 2: 実装 (Implementation Phase)】- Model: flash                                           │
│   ・AAWU 1 (Data): スキーマ型定義・パーサー・対照保存APIの実装                                   │
│   ・AAWU 2 (Canvas): 既存Konvaピッチの2画面並列マウント & ドラッグ座標バインド                  │
│   ・AAWU 3 (Frontend): /syntax-studio 画面構築、Large Viewレイアウト、Drawer、トグル実装         │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 【Phase 3: レビュー・QA (Review & QA Phase)】- Model: pro                                        │
│   ・regista-qa による 10軸ルーブリック検収、Biome lint、tsc型チェック、E2E動作確認               │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 各AAWUの詳細指示

#### AAWU 1: データ層・スキーマ連携 (担当: `regista-data` / `flash`)
- **ファイル**: `src/lib/types/syntax-integration.ts`, `src/app/api/syntax/save-tuning/route.ts`
- **タスク**: `footics-integration-v1.json` の型定義配備および対照ペアJSON保存エンドポイントの実装。
- **Exit Criteria**: `tsc --noEmit` パス、JSONパースおよび保存処理のユニットテスト通過。

#### AAWU 2: Canvas 2画面バインディング (担当: `regista-canvas` / `flash`)
- **ファイル**: `src/components/features/syntax-studio/syntax-pitch-canvas.tsx`
- **タスク**: 既存のKonvaピッチコンポーネントを流用し、`readOnly`（左画面）と `interactive`（右画面）の2モードを実装。右画面で選手ドラッグ時に親Stateの正規化座標（0.0〜100.0）を即時更新。
- **Exit Criteria**: 選手アイコンのドラッグ移動が滑らかに親Stateと連動すること。

#### AAWU 3: Studio UI & Layout構築 (担当: `regista-frontend` / `flash`)
- **ファイル**: `src/app/syntax-studio/page.tsx`, `src/components/features/syntax-studio/`
- **タスク**: 成果物最大表示（Large Canvas First）レイアウトの構築。JSON Drawer、Split/Focusトグル、4コマ切り替えタブ、保存ボタンの実装。
- **Exit Criteria**: `pnpm dev` 起動時に `/syntax-studio` で大画面ピッチが崩れずに描画されること。

#### AAWU 4: 独立品質検収 (担当: `regista-qa` / `pro`)
- **タスク**: Biome lint、TypeScript型チェック、および「インポート → 右画面手直し → 保存」の一連のフローを検収。
- **Exit Criteria**: 全10軸ルーブリック2点以上、エラー0件。
