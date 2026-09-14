# Bench Task: Flash Orchestration Benchmark

## 1. 目的
Gemini 3.7 Flash による GM オーケストレーション（regista-gm -> worker-data, worker-frontend）の実走速度と品質を検証・計測する。

## 2. 要件
- **データ・ユーティリティ (worker-data)**:
  - `src/lib/data/tactical-pitch-bench.ts` を作成。
  - ピッチ座標（x: 0〜105m, y: 0〜68m等、あるいは実座標）をパーセンテージ（0〜100%）に正規化・クランプする軽量関数 `normalizePitchCoordinate(point: { x: number; y: number }, pitchDimensions?: { width: number; height: number }): { x: number; y: number }` を実装・エクスポートする。
  - `src/lib/data/__tests__/tactical-pitch-bench.test.ts` を作成し、境界値・クランプ・正規化の単体テストを実装する。
  - すべてのコマンド実行（テスト等）には `rtk vitest run src/lib/data/__tests__/tactical-pitch-bench.test.ts` を使用する。

- **フロントエンド連携 (worker-frontend)**:
  - `src/components/ui/TacticalBenchIndicator.tsx` を作成。
  - `normalizePitchCoordinate` をインポートし、指定された x, y 座標を正規化してパーセント表示するバッジ/インジケータUIコンポーネント `TacticalBenchIndicator({ x, y, width, height }: { x: number; y: number; width?: number; height?: number })` を実装する。
  - Tailwind クラスを使用し、型エラーがないことを確認する。

## 3. 実装領域 (ホワイトリスト制約)
- `src/lib/data/tactical-pitch-bench.ts` (worker-data)
- `src/lib/data/__tests__/tactical-pitch-bench.test.ts` (worker-data)
- `src/components/ui/TacticalBenchIndicator.tsx` (worker-frontend)

## 4. 受入条件
1. `rtk vitest run src/lib/data/__tests__/tactical-pitch-bench.test.ts` がオールグリーンで通過すること。
2. `rtk pnpm verify:scoped` (または `rtk tsx scripts/verify/scoped-check.ts`) がエラーなく通過すること。
3. 行数上限（Data: 200行, Frontend: 300行）を遵守すること。
