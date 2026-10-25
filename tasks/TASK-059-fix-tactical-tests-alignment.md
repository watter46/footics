# TASK-059: 戦術ボードテストの最新仕様同期

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/lib/types/__tests__/tactical-unified.test.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/annotation-layer.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `src/lib/types/__tests__/tactical-unified.test.ts` 内の `SlideSchema > createDefaultSlide が有効なスライドを生成する` テストが、最新の `DEFAULT_BOUNDARY_BOX` 仕様（`visible: false` を含む）に同期され PASS すること。
- [x] 2. `src/features/tactical-unified/core/components/__tests__/annotation-layer.test.tsx` 内のリングマーカーテストが、TASK-049 以降の最新仕様（3Dリングは中心に背番号テキストを描画せず、足元リング楕円とチームカラーのみを描画する）に合致するようアサーションが更新され PASS すること。
- [x] 3. `bun vitest run src/lib/types/__tests__/tactical-unified.test.ts src/features/tactical-unified/core/components/__tests__/annotation-layer.test.tsx` が exit code 0 で完了すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Slide Boundary Box Default (src/lib/types/tactical-unified.ts)
```ts
export const DEFAULT_BOUNDARY_BOX_16_9: BoundaryBox = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  enabled: true,
  visible: false,
  fitTarget: 'pitch',
};
```

### 3.2 3D Ring Marker Spec (player-marker-item.test.tsx:198)
```ts
it('PlayerMarkerRing does not render shirt number in center (center text is removed)', () => {
  // ...
  const texts = stageRef.current?.find('Text') as Konva.Text[];
  const numText = texts.find((t) => t.text() === '10');
  expect(numText).toBeUndefined();
});
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: テスト同期と検証
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/__tests__/tactical-unified.test.ts`
  - `src/features/tactical-unified/core/components/__tests__/annotation-layer.test.tsx`
- **Tasks**:
  - [x] 1. `tactical-unified.test.ts` の L170-177 の `slide.boundaryBox` アサーションに `visible: false` を追加する。
  - [x] 2. `annotation-layer.test.tsx` の L203 で `texts.find((t) => t.text() === '20')` が `undefined`（リング内に背番号テキストを描画しない最新仕様）であることを確認するか、リング楕円（Ellipse）の stroke がチームカラー `#001489` であることの検証に同期する。
  - [x] 3. `bun run ai:check src/lib/types/__tests__/tactical-unified.test.ts src/features/tactical-unified/core/components/__tests__/annotation-layer.test.tsx` を実行し PASS を確認する。
- **Worker Handoff Log**:
  - `slide.boundaryBox` 期待値への `visible: false` 追加、および 3D足元リングマーカーのテキスト非描画アサーション同期を完了し、全29テストPASS。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-26 04:08
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除
  - [x] 2. ホスト境界 & Store Provider: テストコードのため非該当
  - [x] 3. 設計負債 & 拡張性: 仕様変更の正当性担保
  - [x] 4. サイレント破壊 & 既存保護: 他テストへの影響なし
- **Summary**: TASK-049 の 3D足元リング中心背番号非描画仕様および DEFAULT_BOUNDARY_BOX の visible: false 仕様とテスト期待値が正確に同期されており LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
