---
name: reviewer
description: "[ABOLISHED] Reviewerサブエージェントは廃止されました。検証は task:validate と ai:preflight / ai:commit および Planner の最終 git diff 確認で実行します。"
model: pro
mainAgent: false
subagent: false
tools: []
skills: []
---

# Reviewer (廃止済み)

Reviewer サブエージェントは廃止されました。完了検証は Planner が全 Phase 完了後に `bun run ai:preflight` / `bun run ai:commit` および `GIT_EXTERNAL_DIFF=difft rtk git diff` を実行して完遂します。
