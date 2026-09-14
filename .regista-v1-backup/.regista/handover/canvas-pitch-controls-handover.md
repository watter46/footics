# Handover: Canvas Pitch Control, Reset, and Boundary Link Features

## 概要
Regista Canvasにおけるピッチ・境界線の操作性向上および戦術リセット機能の設計壁打ち完了に伴う引継ぎ。
GM（`regista-gm`）にてScout調査およびチケット分解（DAG発行）を行うための仕様情報。

## 決定した仕様

### 1. ピッチ・境界線の連動移動 (Link Movement)
- **配置:** 境界線ツールバー（Boundary Toolbar）
- **トグル:** 🔗 / 🔓（ピッチ・境界線の連動トグル）
- **デフォルト:** **🔗 ON（連動状態）**
- **挙動:**
  - 🔗 ON時: 境界線またはピッチの移動時、双方の相対位置を維持して連動移動。
  - 🔓 OFF時: 境界線のみ、またはピッチのみを個別に移動可能。
  - Konva RefによるAnti-Lag直接更新 → `onDragEnd` でZustandストアへ同期。

### 2. 戦術初期化（Tactics Reset）
- **配置:** ピッチ比率切替コントロールの横（上部ヘッダー/設定エリア）
- **アイコン/ボタン:** 🔄 戦術リセット
- **挙動（一括リセット）:**
  1. 選手メタデータ（名前・背番号・所属等）は維持。
  2. 選手のピッチ内座標（x, y）を現在の選択中フォーメーションの初期配置に再計算・配置。
  3. ピッチ & 境界線の位置・スケールをデフォルト（画面中央・初期倍率）にリセット。
  4. 描画オブジェクト（矢印・ゾーン・線などのアノテーション）を全削除。

### 3. ピッチ中央配置 (Fit/Center Pitch)
- **配置:** 境界線ツールバー（Boundary Toolbar）
- **アイコン/ボタン:** 🎯 中央配置
- **トリガー:** クリック時のみ実行。
- **挙動:**
  - 選手のピッチ内相対座標（0〜100%）およびアノテーションはそのまま維持。
  - ピッチと境界線（ビューポート/Transform）のみをキャンバス中央・初期デフォルト位置へ戻す。

### 4. ピッチ固定（Pitch Lock）のデフォルトON
- **配置:** 境界線ツールバー（Boundary Toolbar）
- **デフォルト:** **🔒 ON（ピッチ固定状態）**
- **挙動:**
  - 初期表示時はピッチ背景のドラッグが無効化（誤操作防止）。
  - 境界線ツールバーの 🔒/🔓 トグルで解除可能。

---

## 関連コンポーネント・想定スコープ (Scout調査候補)
- `src/components/features/tactical-unified/canvas/boundary-box.tsx` (または境界線ツールバーコンポーネント)
- `src/components/features/tactical-unified/canvas/background-layer.tsx`
- `src/components/features/tactical-unified/header/` (ピッチ比率切替周辺のツールバーUI)
- `src/lib/tactical/` / Zustandストア (`tacticalStore` 等の状態管理・アクション追加)

## 後続アクション
GM Conversationにて、上記仕様に基づき `Scout` によるコードベース調査を実施し、Layer-based DAGチケットを発行してください。
