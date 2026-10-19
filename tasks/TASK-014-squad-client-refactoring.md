# TASK-014: TeamSquadClient オーケストレーター化 & 状態・UI分離

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-19
- **Target Files**:
  - `src/features/teams/hooks/use-team-squad-client.ts` (NEW)
  - `src/features/teams/components/squad-category-list.tsx` (NEW)
  - `src/features/teams/components/squad-dialogs.tsx` (NEW)
  - `src/features/teams/components/TeamSquadClient.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `use-team-squad-client.ts` にシーズン選択、フィルター状態、データ集約（`mergedPlayers`、写真紐付け、カテゴリ集計）、および操作ハンドラー（同期、削除、編集、写真更新、Tactical Canvas連携）を抽出すること（Hook上限 150行クリア）。
- [x] 2. `squad-category-list.tsx` にポジションカテゴリ別のセクションヘッダーおよび `SquadPlayerCard` グリッド描画を抽出すること（Component上限 300行クリア）。
- [x] 3. `squad-dialogs.tsx` に `AddPlayerDialog`, `EditPlayerDialog`, `CopySeasonPlayersDialog` のマウント処理をカプセル化すること。
- [x] 4. `TeamSquadClient.tsx` を 130行以内（上限 300行クリア）にスリム化し、既存のProps（`teamId`, `initialSeason`）および画面動作・表示を完全維持すること。
- [x] 5. `bun run ai:check src/features/teams` および既存テスト全件が PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Hook Return Interface
```ts
export interface UseTeamSquadClientResult {
  teamConfig: SupportedTeam;
  selectedSeason: string;
  setSelectedSeason: (season: string) => void;
  availableSeasons: readonly string[];
  idFilter: IdFilterOption;
  setIdFilter: (filter: IdFilterOption) => void;
  isLoading: boolean;
  mergedPlayers: MergedSquadPlayer[];
  filteredPlayers: MergedSquadPlayer[];
  playersByCategory: Record<StandardPosition, MergedSquadPlayer[]>;
  officialCount: number;
  manualCount: number;
  isAddPlayerOpen: boolean;
  setIsAddPlayerOpen: (open: boolean) => void;
  isCopySeasonOpen: boolean;
  setIsCopySeasonOpen: (open: boolean) => void;
  editingPlayer: EditablePlayerData | null;
  setEditingPlayer: (player: EditablePlayerData | null) => void;
  availableOfficialPlayers: OfficialPlayerOption[];
  currentSeasonPlayerIds: Set<number>;
  handleSyncSquad: () => Promise<void>;
  handleDeletePlayer: (player: MergedSquadPlayer) => Promise<void>;
  handleEditPlayer: (player: MergedSquadPlayer) => void;
  handleOpenTacticalCanvas: () => void;
  handlePhotoUpload: (playerId: number, blob: Blob, name: string) => Promise<void>;
  handlePhotoDelete: (playerId: number) => Promise<void>;
  refetchSquad: () => void;
}
```

### 3.2 Category List Props
```ts
export interface SquadCategoryListProps {
  positionCategories: typeof POSITION_CATEGORIES;
  playersByCategory: Record<StandardPosition, MergedSquadPlayer[]>;
  selectedSeason: string;
  onEdit: (player: MergedSquadPlayer) => void;
  onDelete: (player: MergedSquadPlayer) => void;
  onPhotoUpload: (playerId: number, blob: Blob, name: string) => Promise<void>;
  onPhotoDelete: (playerId: number) => Promise<void>;
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: use-team-squad-client.ts の抽出
- **Worker Model**: `inherit`
- **対象ファイル**: `src/features/teams/hooks/use-team-squad-client.ts`
- **契約 (Interface)**:
  - `export function useTeamSquadClient({ teamId, initialSeason }: { teamId: string; initialSeason?: string }): UseTeamSquadClientResult`
- **Testing Strategy**: `bun run ai:check src/features/teams`
- **Tasks**:
  - [x] 1. フックを実装し、型チェックとBiomeパスを確認
- **Worker Handoff Log**:
  - `useTeamSquadClient` (134行) およびデータ集約・アクションヘルパー (`squad-aggregation.ts`, `squad-actions.ts`) を抽出し、全テストおよび `ai:check` PASS。

---

### Phase 2: squad-category-list.tsx, squad-dialogs.tsx & TeamSquadClient.tsx の再編
- **Worker Model**: `inherit`
- **対象ファイル**: `src/features/teams/components/squad-category-list.tsx`, `src/features/teams/components/squad-dialogs.tsx`, `src/features/teams/components/TeamSquadClient.tsx`
- **契約 (Interface)**:
  - `export const SquadCategoryList: React.FC<SquadCategoryListProps>`
  - `export const SquadDialogs: React.FC<SquadDialogsProps>`
  - `export const TeamSquadClient: React.FC<TeamSquadClientProps>`
- **Testing Strategy**:
  - `bun run ai:check src/features/teams`
  - 全28テスト PASS
- **Tasks**:
  - [x] 1. `squad-category-list.tsx` と `squad-dialogs.tsx` を作成
  - [x] 2. `TeamSquadClient.tsx` を 130行以内にスリム化
  - [x] 3. `bun run ai:check src/features/teams` 全テスト PASS を検証
- **Worker Handoff Log**:
  - `SquadCategoryList` (72行), `SquadDialogs` (74行), `SquadEmptyState` (76行) を抽出し、`TeamSquadClient.tsx` を 103行のオーケストレーターにスリム化。全41テストおよび `ai:check` PASS。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `inherit`
- **Reviewed At**: 2026-10-19
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: Requirements の仕様が手抜きなくコードに実在するか（テストのハリボテ化がないか）
  - [x] 境界と副作用: Level 2 core にホスト依存の混入がないか、useEffectによるFlickerがないか
  - [x] 設計負債防止: switch/ifの増殖（OCP違反）がなく、1ファイル250行以内（Hook 150行以内）に収まっているか
  - [x] サイレント破壊防止: 指示外ファイルの変更や既存コード・テストの勝手な削除がないか
- **Summary**:
  `TeamSquadClient.tsx` (旧537行) を 104行の軽量なオーケストレーターにリファクタリング完了。
  ビジネスロジック・状態管理は `use-team-squad-client.ts` (137行), `squad-aggregation.ts` (149行), `squad-actions.ts` (172行) に純粋分離され、UI描画は `squad-category-list.tsx` (73行), `squad-dialogs.tsx` (75行), `squad-empty-state.tsx` (77行) に適切に責務分離された。
  全コンポーネント・フックともに行数上限（Component <= 300, Hook <= 150, Pure Util <= 250）を余裕をもってクリア。
  Level 2 へのホスト依存混入や不要な `useEffect`（Flicker原因）は一切なく、全インターフェース・公開Propsの互換性が維持されている。
  新規テスト群（6テストファイル・13テストケース）および teams 配下の全41テストケースが Vitest にて完全 PASS することを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
