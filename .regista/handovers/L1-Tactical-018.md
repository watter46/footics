# 引継ぎドキュメント: L1-Tactical-018 (アスペクト比最適化ピッチ検証・境界線基準・5%余白・ピッチ完全フィット・PNGコピー)

## 1. 実施概要
- **チケットID**: `L1-Tactical-018`
- **対象URL**: `/test/pitch-aspect`
- **目的**: X (Twitter) 最適化メディア比率（16:9 / 9:16 / 4:5 / 1:1）において、**境界線（Boundary Box）をX用PNG出力マスター基準**とし、キャンバス画面の最大まで比率を保って拡大（視認性確保のためキャンバスと境界線の間に微小余白）。その内側に**上下左右 5% の均等余白**を持たせ、その余白の内側領域を完璧に埋めるようにピッチ比率を変形描画（センターサークル真円保証）。ワンクリックで高解像度PNGとしてクリップボードコピー＆ダウンロード可能。

---

## 2. 確定仕様と設計（再実装反映済み）
1. **境界線マスターフレーム (X用PNG出力境界線 & キャンバス最大化)**:
   - 境界線は画面上で「X用PNG切り取り指標」として機能（四隅のクロップマーカー・シアン枠）。
   - **PNG出力時の完全非表示保証**: 境界線の枠線・シャドウ・バッジは `no-export` のオーバーレイとして分離実装されており、クリップボードコピーおよびダウンロードされるPNG画像には境界線の線は一切映り込まず、純粋な戦術ピッチのみが出力されます。
   - キャンバス画面のサイズに合わせて、比率（16:9, 9:16, 4:5, 1:1）を厳格に守りつつ最大まで広げる。
   - 境界線の可視性向上のため、キャンバスと境界線の間に上下左右 20px の余白を設ける。
   - 解像度プリセット:
     - `16:9`: 1920 × 1080 (横長・X/YouTube俯瞰)
     - `9:16`: 1080 × 1920 (縦長・スマホ全画面)
     - `4:5`: 1080 × 1350 (縦長・Xタイムライン最大化)
     - `1:1`: 1080 × 1080 (正方形)
2. **上下左右 5% 均等余白 (`marginPercent = 5.0`)**:
   - 境界線の内側に、上下左右各 5.0% の均等余白を確保（スライダーで0%〜15%の可変検証可能）。
   - 余白ガイドライン（破線）により、境界線とピッチの間の 5% 余白領域を可視化。
3. **5%余白の内側を完璧に埋めるピッチ比率変形描画**:
   - 5%余白の内側領域（90% × 90%）の長方形を、ピッチ外枠（タッチライン・ゴールライン）およびピッチ地色・芝生ストライプが**隙間なく完璧に埋める**。
   - ペナルティエリア・ゴールエリア等のプロポーションもピッチ比率に合わせて適応配置。
   - **センターサークル厳密真円保証**: 等方スケーリング（`meterScale = min(scaleL, scaleW)`）により、アスペクト比に関わらず完全な真円（歪みゼロ）を保証。
4. **ワンクリック PNG クリップボードコピー機能**:
   - `html-to-image` の `toBlob(exportRef, { pixelRatio: 2 })` を使用。
   - `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])` によりクリップボードへ直接コピー。
   - クリップボード権限が制限された環境では自動で PNG ファイルダウンロードへフォールバック。
   - 「PNG保存」ボタンによる直接ダウンロードも対応。
5. **操作インタラクション**:
   - マウスホイールによるズーム（0.5x 〜 3.0x）
   - ドラッグによるパン（平行移動）
   - 奥側3Dチルトスライダー（0°〜35°、`perspective: 1200px; rotateX(...)`）
   - サンプル選手配置（4-3-3 vs 4-2-3-1）および真円測定ルーラーの表示トグル

---

## 3. 作成・変更ファイル一覧
- `src/app/test/pitch-aspect/page.tsx`: メイン検証ページ
- `src/app/test/pitch-aspect/pitch-constants.ts`: 比率定義・解像度・幾何計算関数 (`calculatePitchGeometry` - 余白内側完全フィット＆真円計算)
- `src/app/test/pitch-aspect/components/pitch-stage.tsx`: キャンバス最大化＆20pxマージン計算・境界線マスターフレーム・3Dパースペクティブ
- `src/app/test/pitch-aspect/components/pitch-svg.tsx`: 境界線背景および余白ガイドライン・ピッチ描画SVG
- `src/app/test/pitch-aspect/components/horizontal-pitch.tsx`: 横向きピッチ（ベース地色・芝ストライプ・白線・真円・ペナルティエリア）
- `src/app/test/pitch-aspect/components/vertical-pitch.tsx`: 縦向きピッチ（ベース地色・芝ストライプ・白線・真円・ペナルティエリア）
- `src/app/test/pitch-aspect/components/pitch-controls.tsx`: アスペクト比タブ・余白スライダー・PNG操作ボタン・チルト・ズーム
- `src/app/test/pitch-aspect/components/pitch-header.tsx`: ヘッダーUI
- `src/app/test/pitch-aspect/components/pitch-indicators.tsx`: メトリクス・比率・余白インジケーター
- `src/app/test/pitch-aspect/hooks/use-pitch-export.ts`: PNGクリップボードコピー＆ダウンロード処理
- `src/app/test/pitch-aspect/hooks/use-pitch-interaction.ts`: ズーム・ドラッグパン・3Dチルト処理
- `src/app/test/pitch-aspect/__tests__/pitch-constants.test.ts`: Vitest ユニットテスト (4件)

---

## 4. 品質検証結果
- **Biome Check**: `PASS` (エラー・警告 0件)
- **TypeScript (Scoped)**: `PASS` (`TypeScript: No errors found`)
- **Vitest**: `PASS (4/4件)`

---

## 5. 次のステップ / 検討事項
- 本テストページ (`/test/pitch-aspect`) で確立した「境界線マスター基準＋5%余白＋内側完全フィット＋等方真円スケーリング」の計算ロジックを、メインの戦術ボード (`src/components/features/tactical-unified/`) やエクスポートエンジンへ反映・統合する。
