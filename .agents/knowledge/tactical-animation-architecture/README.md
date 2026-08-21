# Tactical Animation Architecture & Features (戦術アニメーション機能設計)

## 概要
戦術アニメーション（`src/components/features/tactical-animation/`）は、キーフレームシーン間の補間再生・動画エクスポート・フォーメーション配置・複数選手範囲選択・マーカーカスタマイズを提供する機能です。

---

## 1. 主要機能と設計

### 1.1 選手名ラストネーム表示
- **モジュール:** `src/lib/tactical/player-formatting.ts` (`getLastName`)
- **仕様:** フルネーム文字列から最後の単語（Family Name / Surname）を抽出し、ピッチ上マーカーおよびエクスポートフレームの下部ラベルに表示。

### 1.2 リアルな3D光沢サッカーボール描画 & エクスポート完全同期
- **モジュール:** `soccer-ball-svg.ts`, `animation-marker.tsx`, `pitch-renderer.ts`, `tactical-export.worker.ts`
- **仕様:**
  - 球面ラジアルグラデーション、パネル間のシームライン（縫い目）、陰影、ハイライトを備えた高精細 3D 光沢 SVG (`SOCCER_BALL_SVG`) を採用。
  - 画面上（Konva `AnimationMarker`）だけでなく、動画エクスポート（Worker / `getSoccerBallBitmap`）でも同一の SVG をラスタライズして Blit し、プレビューとエクスポート結果の 100% 同一品質を実現。

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

### 1.6 移動軌道（カスタム曲げ & 直線）補間 & シーン連動ガイド矢印
- **モジュール:** `src/lib/tactical/trajectory.ts`, `interpolation.ts`, `animation-pitch.tsx`, `animation-inspector-panel.tsx`
- **仕様:**
  - **選手 & ボール両対応:** 選手だけでなくボール（`ballTrajectory`）に対しても直線 / カスタム（曲げ）軌道を設定可能。
  - **シーン2（目的地）での直感的操作ワークフロー:**
    - シーン $i \ge 1$（シーン2以降）で選手/ボールを選択した際、「シーン $i-1$（直前の位置）」 $\to$ 「シーン $i$（現在の位置）」を結ぶガイド矢印が表示される。
    - シーン $i$ 上で「カスタム」を選択し、矢印中間にあるオレンジの曲げポインターをドラッグすると、シーン $i$ の `trajectory.controlPoint` に保存されリアルタイムに矢印が曲がる。
    - 先頭シーン（シーン0）で選択した場合は、次シーン（シーン1）への矢印が表示・編集される。
  - **矢印と補間アニメーションの完全一致:** 補間エンジン（`interpolation.ts`）において終点シーンの `trajectory` を最優先参照して `calculateBezierPoint` を実行するため、画面上の矢印の曲線の通りにマーカー・ボールが正確に移動する。
  - **再生・エクスポート時自動非表示:** ガイド矢印および曲げポインターは編集時のみ表示され、再生時やMP4エクスポート時には自動で非表示となる。



### 1.7 縦横画面切り替え時の座標変換 & レスポンシブ最適化
- **モジュール:** `tactical-animation-store.ts` (`setOrientation`), `tactical-animation-board.tsx`
- **仕様:**
  - 横画面 $\leftrightarrow$ 縦画面の切り替え時に、全シーンのピッチ上選手およびボール座標を戦術的幾何学変換（横 $\to$ 縦: $x_v = y_h, y_v = 100 - x_h$ / 縦 $\to$ 横: $x_h = 100 - y_v, y_h = x_v$）で即座に連動変換。
  - 縦画面時は垂直スペースの確保を最優先し、ピッチ描画コンテナのパディングを最小化してピッチ表示サイズを画面限界まで最大化。

### 1.8 縦画面特化＆ピッチ最大化 3カラムレイアウト (Pitch-First 3-Column Architecture)
- **モジュール:** `tactical-animation-board.tsx`, `animation-timeline-panel.tsx`, `animation-inspector-panel.tsx`
- **仕様:**
  - **デフォルト縦画面 (Vertical First):** 縦画面（68:105比率）をデフォルトとし、上下に積み重なっていたUIを左右サイドバーへドック。画面高さを100%ピッチ描画に割り当て、表示面積を約2.5〜3倍に拡大。
  - **左カラム (タイムライン & シーン管理):** 再生/停止、動画保存、一括設定、シーン追加、縦スクロール型シーンカードリスト（Duration, Pause, Easing 設定）。
  - **右カラム (インスペクター):** 【マーカー・軌道設定】タブと【控え・フォーメーション配置】タブの2タブ統合。
  - **全画面ピッチモード:** 左右パネルをワンクリックで折りたたみ可能（フローティング展開ボタン付き）。

### 1.9 ベンチ選手のポジション別自動グルーピング & 配置
- **モジュール:** `initial-mapping.ts`, `tactical-animation-store.ts`, `animation-inspector-panel.tsx`
- **仕様:**
  - `AnimationPlayerState` に `position` プロパティを保持し、マッチデータ・戦術ボードからポジション情報を完全同期。
  - ベンチ選手をポジション区分（GK / DF / MF / FW / Other）に自動分類し、セクションごとにカラーバッジ・人数・選手一覧（背番号・ポジション名・姓・ワンタップ投入ボタン）を配置。
  - 初期配置生成（`generateInitialMapping`）およびフォーメーション適用時、縦画面（Home: 下陣地 $y=50..92$, Away: 上陣地 $y=8..50$）と横画面（Home: 左 $x=0..50$, Away: 右 $x=50..100$）の幾何学的マッピングを正規化して配置。

### 1.10 マーカー枠線（ストローク）なし／太さ・カラー自由設定
- **モジュール:** `tactical-animation-store.ts` (`strokeColor`, `strokeWidth`), `animation-marker.tsx`, `pitch-renderer.ts`, `animation-inspector-panel.tsx`
- **仕様:**
  - `MarkerOptions` に `strokeColor?: string` および `strokeWidth?: number` を追加。
  - 枠線太さ: `0 (なし)` / `1 (細め)` / `2 (標準)` / `3.5 (太め)` からワンクリック選択。
  - 枠線カラー: プリセット12色パレット（白・黒・ゴールド・シルバー・青・赤・緑・シアン・ピンク・紫・オレンジ・黄）＋ カラーピッカー ＋ HEX入力。
  - 個別選手（単一・複数選択）、HOME/AWAYチーム別、ピッチ全体一括で即時適用可能。
  - Canvas 2D動画エクスポートフレーム描画（`pitch-renderer.ts`）にも枠線なし・カラーが完全反映。

### 1.11 Chelseaデフォルトカラー (#034694) & 背番号・ラベル文字サイズ調整
- **モジュール:** `tactical-animation-store.ts` (`DEFAULT_HOME_COLOR`, `numberSizeScale`, `labelSizeScale`), `tactical-store.ts`, `animation-marker.tsx`, `pitch-renderer.ts`, `animation-inspector-panel.tsx`
### 1.12 リアルな3D光沢SVGサッカーボール
- **モジュール:** `soccer-ball-svg.ts`, `animation-marker.tsx`, `pitch-renderer.ts`
- **仕様:**
  - 球面ラジアルグラデーション、五角形・六角形パネルのシームライン、球面光沢ハイライトを緻密に設計した高品質ベクターSVG（`SOCCER_BALL_SVG`）。
  - Konva描画（`AnimationMarker`）では透明なヒットテストサークルと組み合わせることで、完全なクリック・ドラッグ応答性と鮮明な3D光沢ビジュアルを両立。
  - 動画エクスポート（Canvas 2D）にも完全連動。

### 1.13 デフォルト枠線なし・Chelsea 3-4-3初期配置・初期状態リセット
- **モジュール:** `tactical-animation-store.ts`, `initial-mapping.ts`, `tactical-animation-board.tsx`, `formations.ts`
- **仕様:**
  - マーカーのデフォルト枠線を「なし」（`strokeWidth: 0`, `strokeColor: 'none'`）に統一。
  - Chelseaの初期デフォルトフォーメーションを「3-4-3」に設定。
  - 「リセット」ボタン押下時に全消去される問題を解消し、初期マッチデータまたはChelsea 3-4-3の初期シーン・配置へ安全に復元。

### 1.14 チーム表示切り替え (両チーム / HOMEのみ / AWAYのみ)
- **モジュール:** `tactical-animation-store.ts` (`teamVisibility`), `animation-pitch.tsx`, `tactical-animation-board.tsx`, `pitch-renderer.ts`
- **仕様:**
  - トップヘッダーに「両チーム」「HOME」「AWAY」の切り替えボタングループを配置。
  - 自チーム（HOME）のみ、または対戦相手（AWAY）のみに表示を絞り込み、片側チームに集中した戦術検討が可能。
  - キャンバス描画および動画エクスポート（Web Worker）の双方で `teamVisibility` によるフィルタリングを完全同期。

### 1.15 キャンバスマルチレイヤー分離 & マーカー高速ドラッグ描画最適化
- **モジュール:** `animation-pitch.tsx`, `animation-marker.tsx`
- **仕様:**
  - **静的背景レイヤーと動的マーカーレイヤーの分離:** ピッチ背景（芝生・白線SVG）を `listening={false}` の独立 `<Layer>` に分離し、ドラッグ時の全画面再描画負荷を完全に排除。
  - **マーカー描画コスト最小化:** `AnimationMarker` を `React.memo` 化し、全テキストノードの `shadowBlur` 計算負荷を排除、`dragBoundFunc` でピッチ内クランプを高速実行。
  - **高FPSドラッグレスポンス:** 単一・複数選手の移動操作を滑らかで遅延のない 60fps 追従に最適化。






