# 引継ぎサマリー: L3-Tactical-028 (ピッチ中央基準チルト2.5Dを /tactical に移植)

## 1. タスク概要
- **チケットID**: `L3-Tactical-028`
- **タスク名**: /test/pitch-aspect のピッチ中央基準チルト実装を /tactical に移植
- **作業ブランチ**: `main`
- **関連ファイル**:
  - `src/app/test/pitch-aspect/components/pitch-stage.tsx`（参照元・実装済み）
  - `src/features/tactical-unified/components/canvas/unified-canvas.tsx`
  - `src/features/tactical-unified/objects/pitch/components/pitch-background.tsx`
  - `src/features/tactical-unified/stores/pitch-slice.ts`
  - `src/features/tactical-unified/panels/toolbar/`

---

## 2. 引継ぎの経緯

- **引継ぎ理由**: コンテキスト圧迫防止のための定期引継ぎ
- **試行して破棄したアプローチ**: 前チャットで誤って /tactical ではなく /test/pitch-aspect に実装してしまったため、まず /test/pitch-aspect のチルト基準点を修正した

---

## 3. 確定した前提概念・確定仕様

### ① /test/pitch-aspect のチルト実装（参照元）

`src/app/test/pitch-aspect/components/pitch-stage.tsx` の実装：

```tsx
// 境界線コンテナ（正対固定）に perspective を設定
<div style={{ perspective: '1200px' }}>
  {/* ピッチコンテナ：中央基準で奥へ倒す */}
  <div
    style={{
      transformOrigin: '50% 50%',
      transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom}) rotateX(${tilt}deg)`,
      transformStyle: 'preserve-3d',
      transition: isDragging ? 'none' : 'transform 0.08s ease-out',
    }}
  >
    <PitchSvg ... />
  </div>
</div>
```

ポイント：
- `perspective: '1200px'` は境界線コンテナ（exportRef相当の親）に設定
- `transformOrigin: '50% 50%'`（ピッチ中央）で `rotateX(tilt deg)` を適用
- 境界線（シアン枠・ラベル等）はチルト外側に配置され正対固定

### ② /tactical の現在のアーキテクチャ

- `/tactical` は Konva（Canvas 2D）ベース。SVGではなく Konva Stage を使用
- `UnifiedCanvas` → `PitchBackground`（Konva KonvaImage）という構造
- ピッチは `@/lib/tactical/pitch-svg` でSVGを生成して `KonvaImage` として表示
- チルト機能は現在未実装

### ③ 移植方針（案A で実装）

Konva では CSS 3D transform が使えないため、以下の方式を採用：

**Konva Stage を包む div に CSS perspective + rotateX を適用する**

- `unified-canvas.tsx` の Konva Stage ラッパー div に `perspective: '1200px'` を追加
- その内側にピッチ用 div をさらに追加し `transformOrigin: '50% 50%'` + `rotateX(tilt deg)` を適用
- BoundaryBox のオーバーレイ（シアン枠 Tailwind div）は Stage 外側に正対固定を維持

---

## 4. 現時点の実装状況と検証結果

### 完了済み
1. **`src/app/test/pitch-aspect/components/pitch-stage.tsx`**:
   - `transformOrigin` を `50% ${100 - marginPercent}%`（下辺付近）→ `'50% 50%'`（ピッチ中央）に修正
   - TypeScript: PASS

### 未着手（次チャットで実装）
- `/tactical` へのチルト移植

### 品質検証結果
- **TypeScript (Scoped)**: `PASS`
- **Biome / Vitest**: 未実施

---

## 5. 残課題 / 次のチャットでやるべきこと

1. `src/features/tactical-unified/stores/pitch-slice.ts` に `pitchTilt: number`（0〜60°）を追加
2. `src/features/tactical-unified/components/canvas/unified-canvas.tsx` の Konva Stage ラッパーdivに perspective と rotateX チルトを実装
3. `src/features/tactical-unified/panels/toolbar/boundary-box-hud.tsx`（またはその周辺）にチルトスライダーUIを追加
4. BoundaryBox（シアン枠）はチルト外側に正対固定を維持
5. Biome + TypeCheck で検証

---

## 6. 新しい会話に貼り付けるプロンプト

```
Footicsのタスク「L3-Tactical-028: /test/pitch-aspect のピッチ中央基準チルト2.5Dを /tactical に移植」を進めます。

引継ぎサマリー: file:///home/watter46/src/footics/.regista/handovers/L3-Tactical-028-handoff.md

【確定仕様】
1. 参照元: src/app/test/pitch-aspect/components/pitch-stage.tsx のチルト実装
   - perspective: '1200px' を境界線コンテナに設定
   - transformOrigin: '50% 50%' + rotateX(tilt deg) でピッチ中央基準チルト
   - 境界線（シアン枠）はチルト外側に正対固定
2. /tactical は Konva ベース。Konva Stage を包む div に CSS perspective + transform を適用する方式で実装
3. チルト角度は pitch-slice.ts に pitchTilt: number として追加

【実装状況】
- /test/pitch-aspect の修正は完了（型チェック PASS）
- /tactical への移植は未着手

【次にやること】
1. src/features/tactical-unified/stores/pitch-slice.ts に pitchTilt 状態を追加
2. src/features/tactical-unified/components/canvas/unified-canvas.tsx に perspective + rotateX チルトを実装
3. BoundaryBoxHud にチルトスライダーUIを追加
4. Biome + TypeCheck で検証

まず引継ぎファイルと関連コードを確認した上で、実装を開始してください。
```
