# 引継ぎサマリー: TACTICAL-PITCH-BOUNDARY-LIMITS (Tacticalピッチ外・キャンバス外オブジェクト境界制限仕様)

## 1. タスク概要
- **チケットID**: `TACTICAL-PITCH-BOUNDARY-LIMITS`
- **タスク名**: Tacticalピッチ外・キャンバス外オブジェクト配置・描画境界制限仕様
- **作業ブランチ**: `main`
- **関連ファイル**:
  - `src/features/tactical-unified/objects/canvas/helpers/drawing-shape-commit.ts`
  - `src/features/tactical-unified/objects/player/hooks/use-player-layer-drag.ts`
  - `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts`
  - `src/lib/types/tactical-unified.ts`

---

## 2. 手詰まり・引継ぎの経緯 (Background & Impasse Reason)
- **手詰まりの原因**: 設計・仕様壁打ちフェーズの完了に伴い、Pure Orchestration規約（会話分離の原則）に基づきGMチケット発行チャットへ移行するため
- **試行して破棄したアプローチ**: ピッチ比率依存でのセーフティリミット計算（アスペクト比切替時に限界空間が歪むため、1:1固定正方形空間を採用）

---

## 3. ユーザーとの対話で確定した前提概念・確定仕様 (Confirmed Specs & Mental Models)
### ① 基本座標系とデータ保持
- ピッチ内を `0% 〜 100%` とする正規化座標系 **1つに完全統一**。
- ピッチ外への配置は負の値（例: `-10%`）や100%超（例: `110%`）としてそのまま保存する。

### ② プレイヤー / ボールの制約（見失い防止・見えない壁）
- ピッチ外（ベンチやスローイン位置等）への移動は許可する。
- ただし、**現在のキャンバス（Stage）の表示枠外へは出られない「見えない壁」** を設ける（UI操作レイヤーでStage境界に合わせてクランプ）。

### ③ 描画オブジェクト（矢印・ゾーン・ライン等）の制約
- キャンバスの表示枠外へ突き抜けて描画可能（画面外へのロングフィード等の表現を許容）。
- 無限遠ロストや誤操作を防ぐセーフティリミットとして、**1:1 固定基準の 3 × 3 正方形空間（`-100% 〜 200%`）** で固定制限する。

---

## 4. 現時点の実装状況と検証結果 (Implementation & Verification)
1. **設計・仕様確定完了**:
   - コード変更は未実施（設計壁打ち完了状態）

### 品質検証結果
- **Biome Check**: `SKIP (コード未変更)`
- **TypeScript (Scoped)**: `SKIP (コード未変更)`
- **Vitest**: `SKIP (コード未変更)`

---

## 5. 残課題 / 次のチャットでやるべきこと (Next Steps & Action Items)
1. GMによるタスク分解とDAGチケット発行（`.regista/tickets/`）
2. チケットバリデーション（`rtk pnpm tickets:validate`）
3. 各Workerによる実装（キャンバス壁クランプ、描画コミットの1:1固定セーフティリミット化）

---

## 6. 新しい会話に貼り付けるプロンプト (Next Conversation Prompt)

別の会話（新規Conversation）を開き、以下のプロンプトをそのまま貼り付けて開始してください。

```markdown
現在、Footicsのタスク「Tacticalピッチ外・キャンバス外オブジェクト境界制限仕様」のチケット発行・実装を進めます。
前回のチャットで仕様壁打ちが完了したため、新規チャットへ引き継ぎました。

### 前提コンテキスト
- **対象タスク**: TACTICAL-PITCH-BOUNDARY-LIMITS (Tacticalピッチ外・キャンバス外オブジェクト境界制限仕様)
- **引継ぎサマリーファイル**: file:///home/watter46/src/footics/.regista/handover/TACTICAL-PITCH-BOUNDARY-LIMITS-handover.md
- **関連ファイル**:
  - src/features/tactical-unified/objects/canvas/helpers/drawing-shape-commit.ts
  - src/features/tactical-unified/objects/player/hooks/use-player-layer-drag.ts
  - src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts
  - src/lib/types/tactical-unified.ts

### 確定した仕様・前提概念
1. 座標系はピッチ基準の正規化座標（ピッチ内 0〜100%）1つに統一し、ピッチ外は負の値/100%超でそのまま保存する。
2. プレイヤー/ボールはピッチ外への移動を許可するが、キャンバス（Stage）表示枠からは出られない「見えない壁」でクランプする。
3. 描画オブジェクト（矢印・ゾーン等）はキャンバス外への突き抜けを許可しつつ、セーフティリミットとして 1:1 固定基準の 3×3 正方形空間（-100%〜200%）で固定制限する。

### 次に着手してほしいこと
1. GM（regista-gm）としてタスクをScoutへ探索委譲し、チケットを発行・バリデーションしてください。
```
