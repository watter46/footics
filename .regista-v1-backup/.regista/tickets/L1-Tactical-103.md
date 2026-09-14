---
id: L1-Tactical-103
status: DONE
emoji: 🚨
title: "[PERF] player-vision-cone-handles: onDragMove内のZustandストア直接更新を排除"
depends_on: []
model: Gemini 3.7 Flash
effort: medium
context_files:
  - src/features/tactical-unified/objects/player/components/player-vision-cone-handles.tsx
  - src/features/tactical-unified/objects/player/components/player-layer.tsx
  - src/features/tactical-unified/objects/player/types.ts
---

# 🚨 L1-Tactical-103: [PERF] player-vision-cone-handles: onDragMove内のZustandストア直接更新を排除

## UX Impact
ビジョンコーン（視野コーン）ハンドルのドラッグ中にReact再レンダリングが毎フレーム発生していたため、ラグや描画ジャンクが生じていた。修正後はドラッグ中はKonvaノード直操作で60fps以上のスムーズな操作体験を実現し、ドラッグ終了時のみストアへ同期する。

## 背景・問題の詳細

### 違反箇所の連鎖
```
PlayerVisionConeHandles.onDragMove
  → onUpdateVisionCone(patch)   ← props経由で毎フレーム呼ばれる
    → player-layer.tsx L222: setVisionCone(activeSlideId, player.id, {...})  ← Zustandストア更新
```

`setVisionCone` はZustandストアへの書き込みであり、毎ドラッグフレームでReactの再レンダリングをトリガーする。
これは `architecture-and-guidelines.md §11`「onDragMove中にstoreを更新してはならない」の明確な違反。

### 現状のコールシグネチャ
```typescript
// player-vision-cone-handles.tsx
onDragMove={(e) => {
  onUpdateVisionCone({ angleRad, radius: Math.round(newRadius) });  // ← 毎フレーム実行
}}
```

```typescript
// player-layer.tsx
onUpdateVisionCone={(patch) => {
  if (player.visionCone) {
    setVisionCone(activeSlideId, player.id, { ...player.visionCone, ...patch });  // ← store更新
  }
}}
```

## Detailed Spec

### ファイル構成案（変更ファイルと責務）
- **`player-vision-cone-handles.tsx`**: `onDragEnd` ハンドラーを追加し、ストア更新は `onDragEnd` でのみ呼ぶよう変更する
- **`player-layer.tsx`**: `onUpdateVisionCone` の prop シグネチャに変更なし（呼び出しは `onDragEnd` からのみになる）
- **`types.ts`**: 必要であれば `onDragEnd` 系propを追加（`onUpdateVisionCone` はそのまま使用可能な場合は変更不要）

### 実装手順

1. **`player-vision-cone-handles.tsx` の `onDragMove` を純粋なKonvaノード操作のみに変更**:
   - `onDragMove` 内の `onUpdateVisionCone(...)` 呼び出しを **完全に削除する**
   - 代わりに `useRef` でドラッグ中の角度・半径をローカルに保持（`Ref` はReactレンダリングをトリガーしない）
   - Konvaノードの視覚的位置はKonvaの内部状態で自動追従するため、追加操作は不要

   ```typescript
   // 修正後イメージ
   const dragStateRef = useRef<{ angleRad: number; radius: number } | null>(null);

   onDragMove={(e) => {
     e.cancelBubble = true;
     const curX = e.target.x();
     const curY = e.target.y();
     let angleRad = Math.atan2(curY, curX);
     if (angleRad < 0) angleRad += 2 * Math.PI;
     const newRadius = Math.max(8, Math.min(60, (Math.hypot(curX, curY) / stageSize.width) * 100));
     // ← ストア更新を行わず、Refにのみ記録
     dragStateRef.current = { angleRad, radius: Math.round(newRadius) };
   }}
   onDragEnd={() => {
     // ← ドラッグ完了時のみストアへ同期
     if (dragStateRef.current) {
       onUpdateVisionCone(dragStateRef.current);
       dragStateRef.current = null;
     }
   }}
   ```

2. **広がり角ハンドル (edge1, edge2) も同様に修正**:
   - `handleDragEdge` 内の `onUpdateVisionCone({ spreadRad })` を、`onDragEnd` のみに移動する
   - `onDragMove` では `spreadRadRef.current = spreadRad` のみ実行

3. **動作確認**: ドラッグ中ビジョンコーンが視覚的に滑らかに動き、ドラッグ解放後にストアへ正しく保存されることを確認

## Acceptance Criteria & Verification Commands
- [ ] `onDragMove` ハンドラー内に `onUpdateVisionCone` / `setVisionCone` の呼び出しが一切存在しないこと
- [ ] ビジョンコーンの方向・半径ドラッグが視覚的に動作すること（ドラッグ中リアルタイムで追従）
- [ ] ドラッグ終了後、値がストアに正しく保存されること
- [ ] 広がり角ハンドル (edge1, edge2) も同様に修正されていること

### Verification
```
rtk biome check src/features/tactical-unified/objects/player/components/player-vision-cone-handles.tsx
rtk pnpm type-check:scoped src/features/tactical-unified/objects/player/components/player-vision-cone-handles.tsx
```
