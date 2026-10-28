# TASK-106: PitchGroundLayer におけるベンチ選手ゴースト軌道の干渉防止

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-29
- **Target Files**:
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **PitchGroundLayer ベンチ選手除外**:
  - `PitchGroundLayer.tsx` において、`markers` から `m.area !== 'bench'` の選手のみをピッチ描画対象（`pitchMarkers` / `visibleMarkers`）として扱うこと。
  - `BillboardObjectLayer.tsx` と同様の `pitchMarkers` メモ化パターンを導入すること。
- [x] 2. **ゴースト軌道・コネクトライン・矢印のベンチ干渉防止**:
  - `PitchGroundLayer` 内の `PlayerGhostTrajectory` 描画ループで `marker.area === 'bench'` の選手は除外し、ピッチ上にゴースト軌道（矢印・マーカー）が表示されないこと。
  - `players={pitchMarkers}` として `ArrowObject` や `PlayerConnectLines` にもベンチ選手が漏れないようにすること。
  - サブキャンバス内でドラッグまたは選択されたベンチ選手について、メインピッチ側にゴーストや矢印が一切出現しないこと。
- [x] 3. **単体テストと検証**:
  - `pitch-bench-transition.test.ts` に `PitchGroundLayer` のテストを追加し、PASS すること。
  - `bun run ai:check` が exit code 0 でパスすること。

## 3. Context Snippets (既存コードと修正方針)

### `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
```typescript
// 修正前:
  const zones = useCanvasStore((s) => s.annotations.zones);
  const arrows = useCanvasStore((s) => s.annotations.arrows);
  const markers = useCanvasStore((s) => s.annotations.markers);
...
  const visibleMarkers =
    teamVisibility === 'both'
      ? markers
      : markers.filter(
          (m) => m.team === teamVisibility || m.team === 'neutral',
        );

// 修正後: BillboardObjectLayer.tsx と同様に pitchMarkers をメモ化
  const pitchMarkers = useMemo(
    () => markers.filter((m) => m.area !== 'bench'),
    [markers],
  );

  const visibleMarkers = useMemo(
    () =>
      teamVisibility === 'both'
        ? pitchMarkers
        : pitchMarkers.filter(
            (m) => m.team === teamVisibility || m.team === 'neutral',
          ),
    [pitchMarkers, teamVisibility],
  );

// 矢印オブジェクト群:
  <ArrowObject
    key={arrow.id}
    arrow={arrow}
    players={pitchMarkers}
...

// ゴースト描画ループ:
  {!cleanRender &&
    visibleMarkers.map((marker) => {
      if (marker.area === 'bench') return null;
      const prevPlayer = prevSlide?.players.find(
        (p) => p.id === marker.id && p.area === 'pitch',
      );
      if (!prevPlayer) return null;
      if (!selectedIds.includes(marker.id)) return null;
      if (
        Math.hypot(marker.x - prevPlayer.x, marker.y - prevPlayer.y) < 1
      ) {
        return null;
      }

      return (
        <PlayerGhostTrajectory
          key={`ghost-${marker.id}`}
          player={marker}
          prevPlayer={prevPlayer}
          stageSize={{ width: pitchRect.width, height: pitchRect.height }}
          activeSlideId={activeSlideId}
          nodesRegistryRef={nodesRegistryRef}
          aspectRatio={aspectRatio}
          onUpdateTrajectory={updatePlayerTrajectory ?? (() => {})}
        />
      );
    })}
```

### `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts`
追加テスト例:
```typescript
    describe('PitchGroundLayer', () => {
      it('選択された選手が area === "bench" の場合、ピッチ上にゴースト軌道（PlayerGhostTrajectory）が描画されない', () => {
        const store = createCanvasStore({
          mode: 'tactical-board',
          aspectRatio: '16:9',
        });
        const benchPlayer = {
          ...createDefaultPlayer('home', 80, 80, '#034694'),
          id: 'bench-p1',
          area: 'bench' as const,
        };
        const pitchPlayer = {
          ...createDefaultPlayer('home', 50, 50, '#034694'),
          id: 'pitch-p1',
          area: 'pitch' as const,
        };
        store.getState().addMarker(benchPlayer);
        store.getState().addMarker(pitchPlayer);

        // 前スライド情報（benchPlayer は前スライドではピッチ (20, 20) にいた）
        store.setState({
          prevSlide: {
            players: [
              { ...benchPlayer, x: 20, y: 20, area: 'pitch' as const },
              { ...pitchPlayer, x: 50, y: 50, area: 'pitch' as const },
            ],
          },
        });

        // サブキャンバスでドラッグされた時と同様に benchPlayer を選択
        store
          .getState()
          .setSelectedObjects([{ id: benchPlayer.id, kind: 'player' }]);

        const pitchRect = { x: 0, y: 0, width: 800, height: 600 };
        const stageSize = { width: 800, height: 600 };

        const stageRef = React.createRef<any>();
        render(
          React.createElement(
            CanvasStoreContext.Provider,
            { value: store },
            React.createElement(
              Stage as any,
              { ref: stageRef, width: 800, height: 600 },
              React.createElement(PitchGroundLayer, {
                stageSize,
                pitchRect,
                cleanRender: false,
              }),
            ),
          ),
        );

        // benchPlayer のゴースト軌道 (key=`ghost-${benchPlayer.id}`) が存在しないことを検証
        const ghostGroup = stageRef.current?.findOne?.((node: any) => {
          return node.attrs?.id === `ghost-trajectory-${benchPlayer.id}`;
        });
        expect(ghostGroup).toBeFalsy();
      });
    });
```
※ Canvas の getContext mock が必要な場合は `beforeEach` に五層アーキテクチャテストと同様の mockCtx を追加してください。

## 4. Implementation Phases

### Phase 1: TDD & 修正実装
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts`
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
- **Tasks**:
  - [x] 1. `pitch-bench-transition.test.ts` に `PitchGroundLayer` のベンチ選手ゴースト非表示テストを追加（RED確認）
  - [x] 2. `PitchGroundLayer.tsx` で `pitchMarkers` のフィルタリングおよびゴースト描画ガードを追加（GREEN確認）
  - [x] 3. `bun run ai:check` で型・Lint・テストのパスを確認
- **Worker Handoff Log**:
  - `PitchGroundLayer` に `pitchMarkers`（`area !== 'bench'`）メモ化とゴースト描画時の `area === 'bench'` ガード、および `<Group id={`ghost-trajectory-${marker.id}`}>` を導入し、ベンチ選手のゴースト軌道・矢印・コネクトラインの干渉を完全排除。`ai:check`（Biome/TypeCheck/Vitest 13テスト）全PASS。

---

## 5. Reviewer Assessment (コード差分監査基準)
- **Reviewer Model**: `pro`
- **Decision**: `LGTM`
- **Reviewed At**: 2026-10-29 08:54
- **Summary**: PitchGroundLayer の pitchMarkers / visibleMarkers フィルタリングおよびゴースト描画除外が要件通り実装され、Konva実レンダリング・nodesRegistry双方のアサーションを含むテストが追加されている。4大定性監査オールクリア。
- [x] ① 意図と実装の監査（要件網羅性 & テスタビリティ・ハリボテなし）
- [x] ② 境界と副作用の監査（Host Boundary・Store Provider Context遵守・Zero-Flicker・RAII）
- [x] ③ 設計負債の監査（OCP・派生状態の二重保存禁止・SLAP・200行上限遵守）
- [x] ④ AI Worker暴走・サイレント破壊の防止（スコープ厳守・サイレント削除なし）
