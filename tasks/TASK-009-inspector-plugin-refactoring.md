# TASK-009: インスペクターパネルのプラグイン型刷新 & 分割 (Task 1-C)

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-19
- **Target Files**:
  - `src/features/tactical-unified/panels/inspector/multi-player-inspector.tsx` (NEW)
  - `src/features/tactical-unified/panels/inspector/attached-element-inspector.tsx` (NEW)
  - `src/features/tactical-unified/panels/inspector/inspector-registry.tsx` (NEW)
  - `src/features/tactical-unified/panels/inspector/player-inspector.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/inspector/inspector-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/inspector/__tests__/inspector-registry.test.tsx` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] `player-inspector.tsx` から `MultiPlayerInspector` を `multi-player-inspector.tsx` に分離し、両コンポーネントを200行以下に圧縮すること。
- [x] Attached Elements (`vision-cone`, `connect-line`, `focus`) のインスペクターを `attached-element-inspector.tsx` に分離すること。
- [x] `inspector-registry.tsx`（レジストリマッピング）を新設し、オブジェクト種別に応じた動的ディスパッチ（OCP準拠）を実現すること。
- [x] `inspector-panel.tsx` を150行以下の軽量シェルに刷新し、多重if分岐を完全撤廃すること。
- [x] `bun run ai:check`（Lint・型・テスト・サイズ上限）に exit code 0 で合格すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { SelectedObject, SelectedObjectKind, Slide } from '@/lib/types/tactical-unified';
import { inspectorRegistry, type InspectorEntry } from './inspector-registry';
```

### 3.2 Key Interfaces & Types
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

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: player-inspector.tsx の分割 (MultiPlayerInspector 切り出し)
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/inspector/multi-player-inspector.tsx`, `player-inspector.tsx`
- **Tasks**:
  - [x] 1. TDD実装: `multi-player-inspector.tsx` を新設し `PlayerInspector` を専用化（RED ➔ GREEN ➔ `ai:check` PASS）
- **Worker Handoff Log**:
  - `MultiPlayerInspector` を `multi-player-inspector.tsx` に分離（160行）。`player-inspector.tsx` を `PlayerInspector` 専用化（158行）。

---

### Phase 2: Attached Element Inspector の切り出し
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/inspector/attached-element-inspector.tsx`
- **Tasks**:
  - [x] 1. TDD実装: `attached-element-inspector.tsx` を新設し視野コーン・コネクター・フォーカスのロジックを集約（RED ➔ GREEN ➔ `ai:check` PASS）
- **Worker Handoff Log**:
  - `attached-element-inspector.tsx` を新設（65行）。親選手が存在しない場合のフォールバック表示を担保。

---

### Phase 3: インスペクターレジストリの導入
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/inspector/inspector-registry.tsx`
- **Tasks**:
  - [x] 1. TDD実装: `inspectorRegistry` を新設し各 kind への動的ディスパッチを実装（RED ➔ GREEN ➔ `ai:check` PASS）
- **Worker Handoff Log**:
  - `inspector-registry.tsx` を作成（180行）。`InspectorEntry` インターフェースに基づき各 kind に対するタイトル解決およびアダプターコンポーネントをレジストリ登録。

---

### Phase 4: inspector-panel.tsx のシェル化
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/inspector/inspector-panel.tsx`
- **Tasks**:
  - [x] 1. TDD実装: 多重 if 分岐を撤廃しレジストリ駆動のシェルへ刷新（RED ➔ GREEN ➔ `ai:check` PASS）
- **Worker Handoff Log**:
  - `inspector-panel.tsx` を多重 if 連鎖からレジストリ駆動のシェルへ刷新（133行）。

---

### Phase 5: テスト作成 & スコープ検証
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/inspector/__tests__/inspector-registry.test.tsx`
- **Tasks**:
  - [x] 1. スコープ検証: `inspector-registry.test.tsx` を作成し `bun run ai:check` 合格を確認
- **Worker Handoff Log**:
  - `__tests__/inspector-registry.test.tsx` を作成（全12テスト PASS）。`bun run ai:check src/features/tactical-unified/panels/inspector/` にて exit code 0 を確認。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-19
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: Requirements の仕様が手抜きなくコードに実在するか（テストのハリボテ化がないか）
  - [x] 境界と副作用: Level 2 core にホスト依存（chrome.*, Web専用ストア）の混入がないか、useEffectによるFlickerがないか
  - [x] 設計負債防止: switch/ifの増殖（OCP違反）がなく、1ファイル250行以内に収まっているか
  - [x] サイレント破壊防止: 指示外ファイルの変更や既存コード・テストの勝手な削除がないか
- **Summary**:
  - OCP準拠、多重if撤廃、250行上限完全達成（最大180行）、TypeScript strict & Biome合格、単体テスト12件PASS。ホスト依存なし（境界モデル遵守）。4大定性監査にすべて合格。LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 差し戻し時のみ追記 -->
