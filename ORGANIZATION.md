# Regista - Footics 自律型ソフトウェア開発組織

## 組織概要

**Regista（レジスタ）** は、Footics の開発・進化を担う自律型ソフトウェア開発エンジニア組織です。
サッカーの「レジスタ」（試合を支配する司令塔）のように、開発プロジェクト全体を俯瞰し、
適切なエージェントに的確なパスを出すことで、高品質なソフトウェアを継続的に構築します。

## エージェント一覧

| エージェント名 | 役割 | タイプ | 担当ドメイン | スキルパス |
|---|---|---|---|---|
| regista-gm | 統括GM・オーケストレーター | Leader/GM | 全体統括 | `~/.gemini/config/skills/regista-gm/` |
| regista-frontend | フロントエンド/UIスペシャリスト | Specialist | A: Web App Core, F: Analysis & Memo | `~/.gemini/config/skills/regista-frontend/` |
| regista-canvas | Canvas/2Dグラフィックススペシャリスト | Specialist | B: Tactical Board, C: Video & Export | `~/.gemini/config/skills/regista-canvas/` |
| regista-data | Data & Stateスペシャリスト | Specialist | D: Data Layer | `~/.gemini/config/skills/regista-data/` |
| regista-extension | Extension/Platformスペシャリスト | Specialist | E: Browser Extension | `~/.gemini/config/skills/regista-extension/` |
| regista-qa | Quality Sentinel (Critic) | Specialist (独立) | Cross-cutting: 全パッケージQA | `~/.gemini/config/skills/regista-qa/` |

## 開発ドメインマッピング

| ドメイン | 対象ディレクトリ | 担当エージェント |
|---|---|---|
| A: Web App Core | src/app/, src/components/ui/, layout/ | regista-frontend |
| B: Tactical Board & Animation | src/components/features/tactical-* | regista-canvas |
| C: Video & Export Pipeline | video-canvas/, src/lib/tactical/export/ | regista-canvas |
| D: Data Layer | src/lib/db/, src/lib/data/, src/hooks/ | regista-data |
| E: Browser Extension | extension/ | regista-extension |
| F: Analysis & Memo | src/components/features/analysis/, memo-overlay/ | regista-frontend |

## State Machine (開発ワークフロー)

```
  [Request]
      |
      v
  +----------+    チケット発行    +--------+    設計承認    +----------------+
  | TRIAGE   | ----------------> | DESIGN | ------------> | IMPLEMENTATION |
  +----------+                   +--------+               +----------------+
      ^                              ^                           |
      |                              |                           | 実装完了
      |                              |                           v
      |                              |                   +------------+
      |                              |                   | REVIEW_QA  |<--+
      |                              |                   +------------+   |
      |                              |                     |    |         |
      |                              |        不合格(<=3回) |    | 合格    | フィードバック
      |                              |                     +----+         | ループ
      |                              |                           |
      |   3回連続不合格: GM介入       |                           v
      +------------------------------+                      +------+
                                                            | DONE |
                                                            +------+
```

### 各ステートのExit Criteria

| ステート | Exit Criteria |
|---|---|
| TRIAGE | 本質課題記述 / 影響ファイル特定 / ドメイン決定 / 担当アサイン |
| DESIGN | 変更ファイルリスト確定 / 型定義明文化 / テスト影響評価 / GM承認 |
| IMPLEMENTATION | コード実装完了 / lint パス / type-check パス / 対象テスト パス（影響範囲限定） |
| REVIEW_QA | 全10軸が2点以上 / AGENTS.md規約違反なし |
| DONE | デプロイ/ビルド成功 / KI更新完了 / オーナーへ報告 |

## タスク分解パターン (AAWU)

1. **Phase 1 (Contract-First)**: Zodスキーマ・型定義・DBスキーマの確定 → regista-data
2. **Phase 2 (Core Logic)**: Custom Hooks・Utility関数・テスト → 各ドメイン担当
3. **Phase 3 (UI & Integration)**: コンポーネント構築・結合テスト → 各ドメイン担当

## Generator-Critic ループ制御

- **最大3ループ**: Generator-Critic往復を3回に制限
- **Deterministic検証優先**: テスト/型チェック不合格時は即差し戻し
- **エスカレーション階梯**:
  - Level 1: 構造化エラーフィードバックで自動リトライ
  - Level 2: 3回連続失敗 → GM介入（仕様緩和 or タスク再分解）
  - Level 3: 仕様の根本的曖昧さ → オーナーに確認

## パッケージ間境界ルール

- `src/` ⇔ `extension/` ⇔ `video-canvas/` 間の直接インポート禁止
- TypeScript 型定義（Type/Interface）のみ共有可能
- 循環参照の絶対禁止

## デプロイメント規約

| 変更パッケージ | コマンド |
|---|---|
| `src/` (Web App) | `pnpm run deploy` |
| `extension/` (WXT拡張) | `cd extension && pnpm run build` |
| `video-canvas/` (Konvaエディタ) | `cd video-canvas && pnpm run build` |

## 関連組織

- **Syntax** (syntax-gm-mai): サッカー戦術分析メディア組織。コンテンツ企画とFootics改修要件の定義を担当
- **Regista** (本組織): Syntax から発行された改修要件をソフトウェアとして実装する開発組織

## ディレクトリ構造

```
footics/
├── agents/                     # エージェント組織資産
│   └── regista-gm/
│       ├── context/            # コードベース分析、State Machine定義
│       ├── practices/          # 実務原則
│       ├── sources/            # リサーチ結果
│       └── standards/          # ルーブリック
├── ORGANIZATION.md             # 本ファイル（組織全体の運用規約）
├── AGENTS.md                   # プロジェクト全体のコード規約
├── src/AGENTS.md               # Web App固有の規約
├── extension/AGENTS.md         # Extension固有の規約
└── video-canvas/AGENTS.md      # Video Canvas固有の規約
```
