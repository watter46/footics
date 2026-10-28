# TASK-101: Route Line および静止オブジェクトの再生時ブレ修正

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-29
- **Target Files**:
  - `src/features/tactical-unified/core/utils/canvas-registry.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/use-arrow-sync.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/arrow-geometry.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx` (MODIFY)
  - `src/lib/tactical/interpolation-annotation.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **Route Line ドットオフセット同期**:
  - `updateArrowNodes` において `isDotEnd` の場合、静止時と同様に `applyDotOffsets` 相当のオフセットを引いて線を短縮すること。
  - `startDotNode` および `endDotNode` の位置・透明度・表示状態を再生時にも正しく追従させること。
- [x] 2. **静止オブジェクト微動防止**:
  - シーン間で位置を変更していないオブジェクト（矢印、テキスト、ゾーン等）が再生開始時や遷移時に 1px も微動しないこと。
- [x] 3. **単体テストと検証**:
  - `animation-node-updater.test.ts` で全テストが PASS すること。

## 3. Context Snippets (型定義・既存コード・設計原則)
```typescript
// canvas-registry.ts
export interface ArrowNodeEntry {
  node: Konva.Arrow | null;
  startHandleNode?: Konva.Circle | null;
  endHandleNode?: Konva.Circle | null;
  controlHandleNode?: Konva.Circle | null;
  startDotNode?: Konva.Circle | null;
  endDotNode?: Konva.Circle | null;
}
```

## 4. Implementation Phases

### Phase 1: Route Line 再生時ブレ修正
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/utils/canvas-registry.ts`
  - `src/features/tactical-unified/core/components/annotations/use-arrow-sync.ts`
  - `src/features/tactical-unified/core/components/annotations/arrow-geometry.ts`
  - `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx`
  - `src/lib/tactical/interpolation-annotation.ts`
  - `src/features/tactical-unified/hooks/animation-node-updater.ts`
  - `src/features/tactical-unified/hooks/__tests__/animation-node-updater.test.ts`
- **Tasks**:
  - [x] 1. 単体テスト作成（RED確認）
  - [x] 2. `canvas-registry.ts`, `use-arrow-sync.ts`, `interpolation-annotation.ts`, `animation-node-updater.ts` を修正（GREEN）
  - [x] 3. 検証実行（`bun run ai:check` PASS）
- **Worker Handoff Log**:
  - `applyDotOffsets`（`arrow-geometry.ts`）を再利用し静止時と完全同一の短縮を適用。`startDotNode`/`endDotNode` 登録・追従および `rect` ゾーンの中心オフセット同期により再生開始時ジッターを根絶。

---

## 5. Reviewer Assessment (コード差分監査基準)
- **Reviewer Model**: `pro`
- **Decision**: `LGTM`
- **Reviewed At**: 2026-10-29 01:20
- **Summary**: Route Line 再生時のドットオフセット同期および静止時 Rect 位置同期を確認。全13テスト合格・ゼロリグレッション。
- **Audit Checklist**:
  - [x] 1. **要件合致**: Route Line 再生時にドットと線のズレがないか。
  - [x] 2. **既存機能無欠陥**: 通常の矢印・曲線・波線のアニメーションが維持されているか。
