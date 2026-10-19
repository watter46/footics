# TASK-009: インスペクターパネルのプラグイン型刷新 & 分割 (Task 1-C)

## Status: DONE
- Assigned: full-worker
- Reviewer: reviewer (LGTM)

---

## 1. 目的 & ゴール
Web戦術ボードのインスペクターパネル（`inspector-panel.tsx` 333行、`player-inspector.tsx` 317行）は、Biomeの300行上限を超過し、多重if分岐とバケツリレーによりOCP（開放閉鎖原則）に違反している。
本タスクでは以下を達成する：
1. `player-inspector.tsx` から `MultiPlayerInspector` を `multi-player-inspector.tsx` に分離し、両コンポーネントを200行以下に圧縮する。
2. Attached Elements (`vision-cone`, `connect-line`, `focus`) のインスペクターを `attached-element-inspector.tsx` に分離する。
3. `inspector-registry.tsx`（レジストリマッピング）を新設し、オブジェクト種別に応じた動的ディスパッチ（OCP準拠）を実現する。
4. `inspector-panel.tsx` を120行以下の軽量シェルに刷新し、`bun run ai:check`（Lint・型・テスト・サイズ上限）に合格させる。

---

## 2. 変更対象ファイル一覧

| 操作 | パス | 説明 |
| :--- | :--- | :--- |
| **NEW** | `src/features/tactical-unified/panels/inspector/multi-player-inspector.tsx` | 複数選手一括編集コンポーネント (~140行) |
| **NEW** | `src/features/tactical-unified/panels/inspector/attached-element-inspector.tsx` | 視野コーン/コネクター/スポットライト用インスペクター (~70行) |
| **NEW** | `src/features/tactical-unified/panels/inspector/inspector-registry.tsx` | 各種別 (kind) とインスペクターの対応マッピング & タイトル決定 |
| **MODIFY** | `src/features/tactical-unified/panels/inspector/player-inspector.tsx` | `PlayerInspector` 専用化 (317行 → ~145行) |
| **MODIFY** | `src/features/tactical-unified/panels/inspector/inspector-panel.tsx` | 多重 if をレジストリ駆動に刷新 (333行 → ~100行) |
| **NEW** | `src/features/tactical-unified/panels/inspector/__tests__/inspector-registry.test.tsx` | レジストリ解決 & 単体テスト |

---

## 3. 実装フェーズ

### Phase 1: `player-inspector.tsx` の分割 (MultiPlayerInspector 切り出し)
- [x] 1. `multi-player-inspector.tsx` を新設し、`MultiPlayerInspector` を移動。
   - `export interface MultiPlayerInspectorProps` を定義。
   - 必要な UI 部品（`InspectorHeader`, `Row`, `RangeInput`, `ColorInput`, `DeleteButton` 等）を import。
- [x] 2. `player-inspector.tsx` から `MultiPlayerInspector` を削除し、`PlayerInspector` のみを export。
   - 既存の import 箇所（`index.ts` や `inspector-panel.tsx` 等）があれば `multi-player-inspector.tsx` から re-export または直接 import するよう調整。

### Phase 2: Attached Element Inspector の切り出し
- [x] 1. `attached-element-inspector.tsx` を新設。
   - `vision-cone` / `connect-line` / `focus` が選択された際、`selected.parentPlayerId` から親 `Player` を取得し、対応する `MarkerVisionSection` / `MarkerConnectorSection` / `MarkerSpotlightSection` を描画するコンポーネント。
   - 親選手が存在しない場合のフォールバック表示（または null）を担保。

### Phase 3: インスペクターレジストリ（`inspector-registry.tsx`）の導入
- [x] 1. `inspector-registry.tsx` を作成。
   - `InspectorEntry` インターフェースを定義：
     ```ts
     export interface InspectorEntry {
       getTitle: (selected: SelectedObject, slide: Slide) => string;
       component: React.ComponentType<{
         selected: SelectedObject;
         slideId: string;
         activeSlide: Slide;
         onDeselect: () => void;
       }>;
     }
     ```
   - `inspectorRegistry: Partial<Record<SelectedObjectKind, InspectorEntry>>` を定義し、以下を登録：
     - `player`: `PlayerInspector` (タイトル: Ring または Player + 番号)
     - `arrow`: `ArrowInspector` (タイトル: "Arrow & Line")
     - `zone`: `ZoneInspector` (タイトル: "Zone")
     - `text`: `TextInspector` (タイトル: "Text")
     - `ball`: `BallInspector` (タイトル: "Ball")
     - `vision-cone`, `connect-line`, `focus`: `AttachedElementInspector`

### Phase 4: `inspector-panel.tsx` のシェル化
- [x] 1. 多重 `if` 連鎖を撤廃。
- [x] 2. `selectedObjects.length > 1` かつ選手選択時: `MultiPlayerInspector` を描画。
- [x] 3. `effectiveSingle` がある場合:
   - `inspectorRegistry[effectiveSingle.kind]` を取得。
   - 見つかった場合は `InspectorHeader` + 該当 Component を描画。
- [x] 4. 未選択時: `SlideSettingsInspector` を描画。
- [x] 5. ファイル全体の行数が 150行以下（目標 100行程度）になっていることを確認。

### Phase 5: テスト作成 & スコープ検証
- [x] 1. `src/features/tactical-unified/panels/inspector/__tests__/inspector-registry.test.tsx` を作成し、各 kind（player, arrow, zone, ball, text, attached elements）に対するタイトル生成とレジストリエントリの妥当性を検証。
- [x] 2. `bun run ai:check src/features/tactical-unified/panels/inspector/` を実行し、Lint / 型チェック / テスト / 行数上限の合格を確認。

---

## 4. 検証基準 (Verification Criteria)
- `player-inspector.tsx`: 200行以下（実績: 158行）
- `inspector-panel.tsx`: 150行以下（実績: 133行）
- `multi-player-inspector.tsx`: 200行以下（実績: 160行）
- `attached-element-inspector.tsx`: 100行以下（実績: 65行）
- `bun run ai:check src/features/tactical-unified/panels/inspector/` が exit code 0 で全PASS。

---

## Worker Handoff Log
- **Phase 1**: `MultiPlayerInspector` を `multi-player-inspector.tsx` に分離（160行）。`player-inspector.tsx` を `PlayerInspector` 専用化（158行）。
- **Phase 2**: `attached-element-inspector.tsx` を新設（65行）。`vision-cone`, `connect-line`, `focus` のインスペクター表示ロジックを集約。
- **Phase 3**: `inspector-registry.tsx` を作成（180行）。`InspectorEntry` インターフェースに基づき各 kind に対するタイトル解決およびアダプターコンポーネントをレジストリ登録。
- **Phase 4**: `inspector-panel.tsx` を多重 if 連鎖からレジストリ駆動のシェルへ刷新（133行）。
- **Phase 5**: `__tests__/inspector-registry.test.tsx` を作成（全12テスト PASS）。`bun run ai:check src/features/tactical-unified/panels/inspector/` にて exit code 0 を確認。

## Reviewer Handoff Log
- **Verdict**: LGTM（承認）
- **審査内容**: OCP準拠、多重if撤廃、250行上限完全達成（最大181行）、TypeScript strict & Biome合格、単体テスト12件PASS。ホスト依存なし（境界モデル遵守）。
