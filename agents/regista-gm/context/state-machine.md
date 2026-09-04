# Regista 開発ワークフロー State Machine

> **注記 (Execution Modes):** 本 State Machine は複数ドメインに跨る大規模機能開発や破壊的変更時（**Orchestrated Mode**）に適用されます。日常の質問、調査、1〜3ファイル以内の機能修正・バグ修正、型エラー対応は **Fast-Track Mode** として単独・即時実行されます。

## 状態定義 (States)

### State 1: TRIAGE (トリアージ)
- **入口**: オーナーまたはGMからの開発リクエスト受領
- **担当**: regista-gm
- **活動**:
  - リクエストの本質課題を特定
  - 影響範囲の分析 (trace-dependencies.sh)
  - 開発ドメインの特定 (A-F)
  - 優先度判定 (Critical / High / Medium / Low)
  - 担当エージェントのアサイン
- **Exit Criteria**:
  - [ ] 本質課題が1文で記述されている
  - [ ] 影響ファイル・モジュールが特定されている
  - [ ] 開発ドメイン (A-F) が決定されている
  - [ ] 担当エージェントがアサインされている
  - [ ] タスクチケットが作成されている

### State 2: DESIGN (設計)
- **入口**: TRIAGE完了、タスクチケット発行
- **担当**: アサインされた専門エージェント + regista-gm (レビュー)
- **活動**:
  - 技術調査・既存コードの依存関係分析
  - 設計方針の策定 (変更ファイル、API設計、型定義等)
  - AGENTS.md / KI (Knowledge Item) との整合性確認
  - 設計書ドラフト作成
- **Exit Criteria**:
  - [ ] 変更対象ファイルのリストが確定
  - [ ] 新規型定義・API仕様が明文化
  - [ ] 既存テストへの影響が評価済み
  - [ ] 設計書がGMレビューを通過

### State 3: IMPLEMENTATION (実装)
- **入口**: DESIGN完了、設計書承認
- **担当**: 専門エージェント (Generator)
- **活動**:
  - コード実装 (AGENTS.md規約遵守)
  - ユニットテスト作成 (複雑なロジックの場合)
  - セルフチェック (lint, type-check)
- **Exit Criteria**:
  - [ ] コードが実装完了
  - [ ] `rtk pnpm lint` パス
  - [ ] `rtk pnpm type-check` パス
  - [ ] 該当テストがパス (`rtk pnpm test`)
  - [ ] 古い参照が残っていないことをgrepで確認

### State 4: REVIEW_QA (レビュー・QA)
- **入口**: IMPLEMENTATION完了、全チェックパス
- **担当**: regista-qa (独立Critic)
- **活動**:
  - コードレビュー (AGENTS.md準拠チェック)
  - 10軸ルーブリック採点
  - 修正フィードバック発行
- **Generator-Critic ループ制御**:
  - 最大3回のフィードバックループ
  - 3回連続不合格 → GMにエスカレーション
- **Exit Criteria**:
  - [ ] 全10軸が2点以上 (実務水準)
  - [ ] AGENTS.md規約違反なし
  - [ ] 型安全性・テストカバレッジ確認済み

### State 5: DONE (完了)
- **入口**: REVIEW_QA合格
- **担当**: regista-gm
- **活動**:
  - デプロイ実行 (auto-deploy on push / auto-build & sync)
  - Knowledge Item 更新
  - タスクチケットクローズ
  - 完了報告
- **Exit Criteria**:
  - [ ] デプロイ/ビルド成功
  - [ ] KI更新完了
  - [ ] オーナーへの完了報告

## 状態遷移図 (ASCII)

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

## 開発ドメインとエージェントマッピング

| ドメイン | 対象ディレクトリ | 担当エージェント |
|---|---|---|
| A: Web App Core | src/app/, src/components/ui/ | regista-frontend |
| B: Tactical Board & Animation | src/components/features/tactical-* | regista-canvas |
| C: Video & Export Pipeline | video-canvas/, src/lib/tactical/export/ | regista-canvas |
| D: Data Layer | src/lib/db/, src/lib/data/, src/hooks/ | regista-data |
| E: Browser Extension | extension/ | regista-extension |
| F: Analysis & Memo | src/components/features/analysis/, memo-overlay/ | regista-frontend |
| Cross-cutting: QA/Review | 全パッケージ | regista-qa |
