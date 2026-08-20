# Tactical Animation Architecture & Features (戦術アニメーション機能設計)

## 概要
戦術アニメーション（`src/components/features/tactical-animation/`）は、キーフレームシーン間の補間再生・動画エクスポート・フォーメーション配置・複数選手範囲選択・マーカーカスタマイズを提供する機能です。

---

## 1. 主要機能と設計

### 1.1 選手名ラストネーム表示
- **モジュール:** `src/lib/tactical/player-formatting.ts` (`getLastName`)
- **仕様:** フルネーム文字列から最後の単語（Family Name / Surname）を抽出し、ピッチ上マーカーおよびエクスポートフレームの下部ラベルに表示。

### 1.2 リアルなサッカーボール描画
- **モジュール:** `animation-marker.tsx`, `pitch-renderer.ts`
- **仕様:** 白ベース円上に幾何学的に正確な黒五角形・外周黒パッチ・放射状境界線をKonvaベクター / Canvas 2Dで描画。拡大縮小してもボケない鮮明なサッカーボールを実現。

### 1.3 マーカーサイズ変更（個別 & 一括）
- **モジュール:** `marker-size-control.tsx`, `tactical-animation-store.ts` (`sizeScale`)
- **仕様:** 0.6〜1.6倍のスケールに対応。選択中選手（複数選択含む）、HOME/AWAYチーム別、ピッチ全体の3レベルでスライダーおよびプリセット（小・標準・大・特大）から一括・個別変更可能。

### 1.4 フォーメーション自由配置
- **モジュール:** `formation-select-panel.tsx`, `tactical-animation-store.ts` (`applyFormation`)
- **仕様:** 全28種類のフォーメーション定義（`FORMATION_POSITIONS`）に基づき、縦画面（`getFormationActualPosVertical`）または横画面（`getFormationActualPos`）でピッチ上の選手を一発で適切な戦術配置にマッピング。ハーフコート / フルコート対応。

### 1.5 複数選手範囲選択 & 連動ドラッグ移動
- **モジュール:** `animation-pitch.tsx`, `tactical-animation-store.ts` (`selectedPlayerIds`, `moveMultiplePlayersByDelta`)
- **仕様:**
  - ピッチ背景をドラッグすることで半透明青枠のラバーバンド（矩形選択）が発火し、枠内の選手をまとめて選択。
  - Shiftキー＋クリックで選択のトグル追加/解除。
  - 選択中の選手のうち1人をドラッグすると、選択されている全選手が同じ差分 $(\Delta x, \Delta y)$ だけ連動して移動。
  - 複数選択状態からの一括カラー変更・一括サイズ変更・一括軌道変更・一括ベンチ送り。

### 1.6 移動軌道（カーブ）補間
- **モジュール:** `src/lib/tactical/trajectory.ts`, `interpolation.ts`
- **仕様:** シーン $N$ から $N+1$ への移動時、シーン $N$ の trajectory 設定（直線 / 右カーブ / 左カーブ / カーブ強度）を優先参照し、2次ベジェ曲線で滑らかにアニメーション補間およびプレビュー描画。

### 1.7 縦横画面切り替え時の座標変換 & レスポンシブ最適化
- **モジュール:** `tactical-animation-store.ts` (`setOrientation`), `tactical-animation-board.tsx`
- **仕様:**
  - 横画面 $\leftrightarrow$ 縦画面の切り替え時に、全シーンのピッチ上選手およびボール座標を戦術的幾何学変換（横 $\to$ 縦: $x_v = y_h, y_v = 100 - x_h$ / 縦 $\to$ 横: $x_h = 100 - y_v, y_h = x_v$）で即座に連動変換。
  - 縦画面時は垂直スペースの確保を最優先し、ピッチ描画コンテナのパディングを最小化してピッチ表示サイズを画面限界まで最大化。

