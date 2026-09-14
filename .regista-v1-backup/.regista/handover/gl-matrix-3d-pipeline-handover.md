# 📋 Handover: gl-matrix導入による3D射影・逆射影パイプライン刷新とチルト操作不具合解消

## 1. 背景と課題 (Context & Problem)
- **現状の課題**: ピッチを奥に倒す（チルト）と、Konva標準や簡易な2D計算では手前と奥でパースペクティブ（透視投影）の歪みが生じ、ピッチを掴んで動かす（Pan）際やオブジェクト（選手・ボール・矢印等）をドラッグする際に、マウスポインタと掴んでいる地点が離れていく「滑走現象（座標ズレ）」が発生している。
- **解決方針**: 軽量3D数学ライブラリ `gl-matrix` を導入し、MVP行列（View-Projection Matrix）を用いた厳密な **「3D射影（Project） / 逆射影（Unproject / Raycasting）」** パイプラインを純粋関数として構築。すべての操作・描画・動画エクスポートの座標変換を単一の真実源（Single Source of Truth）に統一する。

---

## 2. 達成すべきゴール・要件 (Requirements)
1. **チケット整理・刷新**:
   - 既存の `L1-Tactical-001`（手計算・パッチワーク前提の旧チケット）を破棄し、`gl-matrix` アーキテクチャを前提とした新しいチケット群に再設計・分解する。
   - ※`L1-Tactical-106`（ボール操作UX）および `L1-Tactical-107`（選択枠レイヤー）は実装完了済みのためクローズ/維持。
2. **ライブラリ導入 & 共通数学ユーティリティ基盤**:
   - `gl-matrix` + `@types/gl-matrix` の導入。
   - `mat4` を用いたカメラ行列生成、`projectPitchToScreen`（ピッチ正規化座標→画面2D）、`unprojectScreenToPitch`（画面2D→ピッチ正規化座標）の純粋関数群の実装と単体テスト（Vitest）。
3. **インタラクション層の完全統一**:
   - **ピッチ掴み移動 (Pan)**: チルト角・ズーム倍率に関わらず、クリックした地点が常にカーソル真下に吸着するUnprojectベースの実装。
   - **ホイールズーム (Zoom)**: カーソル位置を中心とした正確なズーム計算。
   - **オブジェクトドラッグ (選手・ボール・アノテーション)**: 画面ポインタからの逆変換をすべて共通 `unproject` に統一。
4. **動画エクスポート / レンダラー整合性**:
   - WebCodecs / OffscreenCanvas の動画書き出し時にも画面と全く同一の行列を渡し、パース崩れのない描画を担保。
5. **組織・スキル定義の更新**:
   - `regista-canvas` スキルに「3D射影変換・Unproject・gl-matrix規約」を追記（専用エージェントの新設は不要）。

---

## 3. 推奨DAG・タスク分解案 (Proへの推奨インプット)
- **Layer 1 (基盤)**:
  - `gl-matrix` 導入 & `src/features/tactical-unified/objects/canvas/helpers/matrix-coordinates.ts` (仮) の実装・テスト
  - `regista-canvas` スキル定義のアップデート
- **Layer 2 (インタラクション・描画結合)**:
  - ピッチ Pan/Zoom フック（`use-canvas-zoom-pan.ts`, `use-canvas-wheel-zoom.ts`）への適用
  - オブジェクトドラッグ・ポインタディスパッチャ（`use-canvas-pointer-dispatcher.ts` 等）への適用
- **Layer 3 (動画エクスポート・検証)**:
  - WebCodecs / OffscreenCanvas エクスポートパイプラインの行列同期と結合テスト

---

## 4. Pro (GM) への依頼プロンプト (そのままコピーして使用可能)

```markdown
以下の要件に基づき、Scout委譲・極小AAWU（DAG）へのチケット分解、およびチケット発行（.regista/tickets/[ID].md）をお願いします。

### 要件概要
ピッチを奥に倒す（チルト）および将来の斜めカメラワークに対応するため、`gl-matrix` を導入して3D射影・逆射影（Unproject）パイプラインを根本から刷新し、チルト時のピッチ掴み移動（Pan）やドラッグ操作の滑走ズレを完全解消したい。

### 詳細要件
1. 旧 `L1-Tactical-001` チケットを破棄し、`gl-matrix` 前提のDAGチケット群に再設計
2. `gl-matrix` の導入と、`mat4` による純粋な座標変換（Project / Unproject）ユーティリティの作成およびVitestテスト
3. ピッチ掴み移動（Pan）、ホイールズーム、オブジェクト（選手・ボール・矢印等）ドラッグの座標変換をすべて `unproject` に統一
4. 動画エクスポートパイプラインとの行列同期・パース整合性
5. `regista-canvas` スキルの規約更新（3D数学/gl-matrixの扱い）

詳細は `.regista/handover/gl-matrix-3d-pipeline-handover.md` を参照してください。
```
