# TASK-027: Reviewer 監査基準・タスク雛形の4層モデル & 6大設計原則適合

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-20
- **Target Files**:
  - `.agents/agents/reviewer.md` (MODIFY)
  - `.agents/rules/agent-delegation.md` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. Reviewer エージェント定義（`.agents/agents/reviewer.md`）の 4大定性監査に、新アーキテクチャ・6大設計品質原則（Store Provider シングルトン直参照禁止、純粋マウンター Shell Purity、初期チラつき Flicker 防止、副作用 RAII 型隔離、SLAP、プロトコル一本化）を明記すること。
- [x] 2. 差し戻し基準として「CRITICAL（Provider直参照、境界破壊、Flicker誘発、未解除リーク）」は即 REJECTED、軽微な項目は LGTM の Summary に改善コメント記録とする運用（選択肢A）が規定されていること。
- [x] 3. サブエージェント委任規約（`.agents/rules/agent-delegation.md`）内の Reviewer 責務説明文が最新の監査項目表現に同期されていること。
- [x] 4. プロダクション TS コードの変更を行わないため、アプリ単体テストは不要。エージェント層保守として Planner 自身が編集を完結させること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過負担なく事前注入する -->

### 3.1 4大定性監査（6大設計品質原則適合）
```markdown
1. 意図と実装の監査（要件網羅性 & テスタビリティ）
2. 境界と副作用の監査 (Host Boundary & Store Provider & Zero-Flicker & RAII)
3. 設計負債の監査 (OCP & SLAP & Shell Purity)
4. AI Worker の暴走・サイレント破壊の防止
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Reviewer プロンプト & 委任規約の更新
- **Worker Model**: `planner` (エージェント層のため親エージェントが自己編集)
- **対象ファイル**: `.agents/agents/reviewer.md`, `.agents/rules/agent-delegation.md`
- **契約 (Interface)**:
  - 4大定性監査の各項目に禁止パターン・期待パターンを網羅
- **Tasks**:
  - [x] 1. `reviewer.md` の監査基準を 6大設計品質原則に完全準拠させる
  - [x] 2. `agent-delegation.md` の Reviewer 定義行を同期
- **Worker Handoff Log**:
  - 4大定性監査の大枠を維持したまま、Provider シングルトン直参照禁止、Shell Purity、SLAP、RAII、通信プロトコル統一を明記完了。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-20 22:30
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: 4大定性監査に 6大設計品質原則の禁止・期待パターンが網羅されている
  - [x] 境界と副作用: Store Provider 直参照、Flicker、Shell Purity、RAII の判定基準が明記されている
  - [x] 設計負債防止: OCP, SLAP, God Component 防止が明確に定義されている
  - [x] サイレント破壊防止: 既存の Zero-Command / Zero-Read 原則およびタスクファイル記録ワークフローが完全に維持されている
- **Summary**:
  - Reviewer プロンプトおよび委任規約が最新の 4層アーキテクチャ・6大設計品質原則に完全に適合しました。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
