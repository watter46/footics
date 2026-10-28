# TASK-103: ゴースト軌道の初期化（スライド複製 duplicateSlide 時に trajectory をリセット）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-29
- **Target Files**:
  - `src/features/tactical-unified/stores/slide-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/__tests__/timeline-slide-operations.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **スライド複製時の軌道リセット**:
  - `createSlideForMode` の `mode === 'full'` 分岐において、全 `players` の `trajectory` を `undefined` にリセットすること。
  - `ball.trajectory` も存在する場合は `undefined` にリセットすること。
- [x] 2. **新スライドでの直線軌道保証**:
  - 複製先スライドで選手を移動させた際、前スライドの曲がった軌道が残らず、新規の直線軌道から開始されること。
- [x] 3. **単体テストと検証**:
  - `timeline-slide-operations.test.ts` にテストを追加し、PASS すること。

## 3. Context Snippets (型定義・既存コード・設計原則)
```typescript
// slide-helpers.ts: createSlideForMode
if (mode === 'full') {
  const cloned = JSON.parse(JSON.stringify(currentSlide)) as Slide;
  cloned.players = cloned.players.map((pl) => ({ ...pl, trajectory: undefined }));
  if (cloned.ball) cloned.ball.trajectory = undefined;
  return { ...cloned, id: generateId('slide'), ... };
}
```

## 4. Implementation Phases

### Phase 1: duplicateSlide での trajectory リセット
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/stores/slide-helpers.ts`
  - `src/features/tactical-unified/__tests__/timeline-slide-operations.test.ts`
- **Tasks**:
  - [x] 1. テスト作成（RED）
  - [x] 2. `slide-helpers.ts` の `createSlideForMode` を修正し、全 players および ball の trajectory を undefined に初期化（GREEN）
  - [x] 3. 検証実行（`bun run ai:check` PASS）
- **Worker Handoff Log**:
  - `createSlideForMode` の `mode === 'full'` で複製スライドの全 players と ball の trajectory を undefined に初期化。全7テストPASS確認。

---

## 5. Reviewer Assessment (コード差分監査基準)
- **Reviewer Model**: `pro`
- **Decision**: `LGTM`
- **Reviewed At**: 2026-10-29 01:08
- **Summary**: スライド複製時に trajectory が正しくクリアされ、新スライドで曲がり軌道が引き継がれる不具合が完全に解消されたことを確認。
- **Audit Checklist**:
  - [x] 1. **要件合致**: 複製時に全プレイヤー・ボールの trajectory が確実に undefined になるか。
  - [x] 2. **既存機能無欠陥**: 通常の複製機能（選手位置、スタイル、背景等）が正常に維持されているか。
