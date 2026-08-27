# Agent Graph & State Machine リサーチ結果

## 1. Agent Graph アーキテクチャ設計

LangGraph型の明示的ステートグラフ（階層型オーケストレーター・サブエージェント構造）を採用。

### 基本構造
- Regista Lead (Orchestrator): トリアージ、全体進行管理、ドメイン専門エージェントへの委譲、最終統合
- Domain Specialists (Sub-agents): 各パッケージ・機能に特化した隔離された実行主体
- Shared State (Immutable/Append-Only Context): 全エージェント間で共有される不変ステートコンテキスト

### ドメイン分離

| ドメイン | 担当パッケージ/パス | 固有の責務・技術スタック |
|---|---|---|
| Web UI Specialist | src/ (UI/Pages) | Next.js App Router, Tailwind CSS v4, Zustand |
| Canvas & Graphics Specialist | tactical-board, tactical-animation | 2D Canvas描画、補間アニメーション、座標系変換 |
| Video Canvas Specialist | video-canvas/ | WXT, react-konva, 映像オーバーレイ描画 |
| Browser Extension Specialist | extension/ | WXT, Content Scripts, Background Service Worker |
| Data & State Specialist | src/lib/db, src/hooks/queries | Dexie.js, TanStack Query, Zod v4 |
| Export & Pipeline Specialist | src/lib/export, Share APIs | WebCodecs, Canvas Capture, 共有エンドポイント |

## 2. ステートマシンパターン

5つの決定論的ステートに分割:
1. Triage → 2. Design → 3. Implementation → 4. Review/QA → 5. Done

## 3. Generator-Critic パターン

### 2層Critic構造
1. Deterministic Critic (第1層): Biome/TypeScript/Vitest による機械的検証
2. Semantic Critic (第2層): AGENTS.md規約・UI/UX基準との整合性をLLM Criticが検証

### ループ制限
- Max Iterations: 最大3ループ
- Semantic Convergence: 差分類似度 > 90% でループ中断
- Deterministic Priority: テスト不合格時は即差し戻し

### エスカレーション
- Level 1: 構造化エラーフィードバックに基づく自動リトライ
- Level 2: 3回連続失敗時、Architectに差し戻し
- Level 3: Human-in-the-Loop (ユーザーに確認)

## 4. タスク分解パターン

### 3段階分解
1. Contract-First: Zodスキーマ・型定義の先行切り出し
2. Core Logic & Hook: UIと切り離した純粋ロジック・テスト
3. UI & Integration: UIコンポーネントの構築と結合

### AAWU (最小作業単位) の要件
- 単一責任: 変更対象ファイルが原則1〜3ファイル以内
- 独立検証性: 各単位ごとに単体で合否判定可能
- ロールバック容易性: 失敗時に他の並行作業に影響なく破棄可能

## 5. Footics向け推奨チーム編成

| エージェント名 | 担当領域 | 必読KI |
|---|---|---|
| Regista Orchestrator | 全体統括・トリアージ | indexing-awareness, rule-governance |
| Tactical Canvas Specialist | tactical-board, tactical-animation | tactical-board/animation-architecture |
| Video Canvas Specialist | video-canvas/ (Konva) | video-canvas-konva-migration |
| Extension Specialist | extension/ (WXT) | extension-save-relay |
| Data & Cache Specialist | Dexie.js, TanStack Query | dexie-database-architecture |
| Export Specialist | 映像・戦術エクスポート | tactical-video-export-pipeline |
| Quality Sentinel (Critic) | 全パッケージQA | quality-harness |
