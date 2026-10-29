# TASK-100: 3D Fade Ring マーカーとコネクタの発光・境界調整

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-29
- **Target Files**:
  - `src/lib/types/tactical-unified.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-marker-ring-fade.tsx` (NEW)
  - `src/features/tactical-unified/core/components/PlayerConnectLines.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/player-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/connect-line-hud.tsx` (MODIFY)
  - `src/lib/tactical/marker-geometry.ts` (MODIFY)
  - `src/lib/tactical/marker-geometry.test.ts` (MODIFY)

---

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **3D Fade Ring マーカー**: `markerType === 'ring-fade'` を追加し、芝生の黒濁りを解消したラジアル透過および多重フォグ減衰描画を実装。
- [x] 2. **デュアル発光制御**: マーカーおよびコネクタに「発光幅 (`glowBlur`: 0〜100)」と「発光透明度 (`glowOpacity`: 0〜1.0)」を持たせ、HUD から増減可能にする。
- [x] 3. **コネクタ境界クリップの修正**: `ring-fade` マーカーの基準半径（`rx = radius * 2.3`, `ry = radius * 1.1`）に基づき、コネクタの端点がマーカー中心へ潜り込まず外周でクリップされること。
- [x] 4. **パフォーマンス**: Konva 描画での `perfectDrawEnabled={false}` や効率的な計算により負荷を抑制。
- [x] 5. **検証**: `bun run ai:check` が全スコープで PASS（exit code 0）。

---

## 3. Context Snippets
```ts
// marker-geometry.ts: ring-fade マーカー外周の計算
const rx = isRingFade ? radius * 2.3 : radius * 1.15;
const ry = isRingFade ? radius * 1.1 : radius * 0.55;
```

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: マーカー＆コネクタ発光制御と境界調整
- **Worker Model**: `flash`
- **Tasks**:
  - [x] 1. `src/lib/tactical/marker-geometry.ts` において `ring-fade` の楕円半径（`rx = radius * 2.3`, `ry = radius * 1.1`）を反映。
  - [x] 2. `src/lib/tactical/marker-geometry.test.ts` で外周境界のクリップテストを更新し PASS を確認。
  - [x] 3. `bun run ai:check` でスコープ内全検査の合格を確認。
- **Worker Handoff Log**:
  - `getMarkerBoundaryPoint` を更新し、`ring-fade` マーカー時のコネクタ端点座標計算を外周境界に完全同期。全テスト PASS。

---

## 5. Reviewer Assessment (コード差分監査基準)
- **Reviewer Model**: `pro`
- **Decision**: `LGTM`
- **Reviewed At**: 2026-10-29 18:55
- **Summary**: 3D Fade Ring マーカーおよびコネクタの発光パラメータ拡張、およびリング境界におけるコネクタ端点のクリップ計算が正しく実装され、回帰テストおよび全スコープチェックが PASS していることを確認。
- **Audit Checklist**:
  - [x] 1. **要件網羅性**: コネクタがマーカーの中心部へはみ出さず、外周で適切に停止していること。
  - [x] 2. **ホスト境界・設計規約**: レベル境界および 300 行ルールが維持されていること。
  - [x] 3. **テスト検証**: 単体テスト・型チェック・Lint がすべて exit code 0 でパスしていること。
