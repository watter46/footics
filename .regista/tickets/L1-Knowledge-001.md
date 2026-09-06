---
id: L1-Knowledge-001
emoji: 🔴
title: WhoScoredデータ仕様ナレッジと解析スキルの作成
status: DONE
depends_on: []
model: Gemini 3.1 Pro
effort: high
context_files:
  - upload/data-spec.txt
  - src/types/index.ts
---

# 🔴 L1-Knowledge-001: WhoScoredデータ仕様ナレッジと解析スキルの作成

## UX Impact
開発者やエージェントがWhoScored特有の複雑なデータ構造（座標、交代、フォーメーション）を迷わず正確に扱えるようになり、分析時のバグがなくなる。

## Detailed Spec
1. `upload/data-spec.txt` および `src/types/index.ts` の内容を元に、エンジニア向け仕様書 `.agents/knowledge/whoscored-data-specification.md` を作成する。
   - 含める内容: 主要プロパティ、時間と交代の仕様(`minute`と`expandedMinute`の違い)、特定分におけるピッチ上11人の算出アルゴリズム、フォーメーションルール、ピッチ座標系。
2. 上記ナレッジを参照し、WhoScoredのデータを抽出・解析する専門タスク用スキル `.agents/skills/whoscored-analyst/SKILL.md` を作成する。
3. ナレッジおよびスキルファイルは、マークダウン形式で簡潔かつ正確に記述する。

## Acceptance Criteria & Verification Commands
- [x] `.agents/knowledge/whoscored-data-specification.md` が作成され、指定内容が網羅されている。
- [x] `.agents/skills/whoscored-analyst/SKILL.md` が作成され、ナレッジを参照するよう指示されている。

### Verification
`ls -la .agents/knowledge/whoscored-data-specification.md`
`ls -la .agents/skills/whoscored-analyst/SKILL.md`
