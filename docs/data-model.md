# データモデル・API仕様 (Data Model & API Spec)

> **【エージェントへの指示】**
> Footics のデータ構造は **Zod スキーマによる Contract-First 設計**を採用しています。
> 型定義を追加・変更する際は必ず Zod スキーマを先に書き、`z.infer<>` で TypeScript 型を導出すること。
> 手書きの `interface` / `type` でスキーマをバイパスすることは原則禁止。

---

## 1. データ保存の全体方針

| 項目 | 内容 |
|-----|------|
| **データベース** | Dexie.js (IndexedDB) のみ。サーバー DB なし |
| **DB 名** | `footics_db` |
| **現行スキーマバージョン** | v1（レガシー履歴・死にテーブルを撤廃しクリーン再設計） |
| **バリデーション** | `src/lib/schema.ts` / `src/lib/types/tactical/`（Zod スキーマ群） |
| **主要型定義ファイル** | `src/types/index.ts`（試合データ系）、`src/lib/types/tactical/`（モジュール分割構成）およびバレル `src/lib/types/tactical-unified.ts`（戦術ボード系） |

> **[!WARNING]**
> `footics_db` は `version(1)` へクリーン再設計されています（死にテーブル `tactical_snapshots`, `event_memos` は完全撤去）。
> ブラウザに旧 `v20` 以前の DB が残存していて `VersionError` が発生した場合は、`ensureDatabaseReady(db)`（`src/lib/db/schema.ts`）により自動で旧 DB を削除（`database.delete()`）し、`version(1)` としてクリーン再オープンする自己修復機構が備わっています。

---

## 2. DB テーブル一覧（v1）

| テーブル名 | 型 | インデックス定義（先頭が主キー） | 用途 |
|-----------|----|----|------|
| `matches` | `Match` | `id, date, matchType` | インポートした試合の基本情報 |
| `events` | `EventRow` | `[match_id+id], match_id` | 試合イベント（WhoScored） |
| `custom_events` | `CustomEvent` | `id, match_id, created_at` | ユーザーが手動追加したカスタムイベント・メモ |
| `match_memos` | `MatchMemo` | `matchId` | 試合全体への自由記述メモ |
| `players` | `PlayerMaster` | `id, playerId, season, [season+teamName]` | 選手マスターデータ（シーズン別メタデータ管理） |
| `player_photos` | `PlayerPhoto` | `playerId, updatedAt` | 選手顔写真データ（256×256px WebP Blob、全シーズン共通） |
| `tactical_projects` | `TacticalProject` | `id, matchId, updatedAt` | 戦術ボードプロジェクト |
| `keyval` | `KeyValEntry` | `key` | 汎用キーバリューストア |

---

## 3. 試合データ系エンティティ

データソース: **WhoScored から自作 Chrome 拡張でスクレイプした JSON をインポート**

### 3-1. Match（試合）

```typescript
// src/types/index.ts
interface Match {
  id: string;
  date: string;
  score: string;
  matchType: 'club' | 'national';     // クラブ戦 or 代表戦
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  playerIdNameDictionary: Record<string, string>;
  teams: {
    home: Team | SimplifiedTeam;
    away: Team | SimplifiedTeam;
  };
}
```

### 3-2. Team・Player（チーム・選手）

```typescript
interface Team {
  teamId: number;
  name: string;
  field: 'home' | 'away';
  players: Player[];
  formations: Formation[];
  // ...
}

interface Player {
  playerId: number;
  name: string;
  shirtNo: number;
  position:
    | 'GK'
    | 'DF'
    | 'MID'
    | 'FW'
    | 'DR'
    | 'DC'
    | 'DL'
    | 'DMC'
    | 'DML'
    | 'DMR'
    | 'MC'
    | 'MR'
    | 'ML'
    | 'AMC'
    | 'AMR'
    | 'AML'
    | 'FWL'
    | 'FWR'
    | 'Sub'
    | 'Other';
  isFirstEleven: boolean;
  field: 'home' | 'away';
  // ...
}

interface Formation {
  formationId: number;
  formationName: string;
  captainPlayerId: number;
  period?: number;
  startMinuteExpanded: number;
  endMinuteExpanded: number;
  playerIds: number[];
  jerseyNumbers: number[];
  formationSlots?: number[]; // 1〜11: ピッチ上スロット, 0: ベンチ控え
  formationPositions?: Array<{ vertical: number; horizontal: number }>; // ピッチ上11人の相対縦横位置 (0〜10)
  subOnPlayerId?: number;
  subOffPlayerId?: number;
}
```

### 3-3. MatchEvent（試合イベント）

WhoScored の生データをそのまま保持。ピッチ上の座標は `x: 0–100, y: 0–100` の正規化座標。

```typescript
interface MatchEvent {
  id: number;
  eventId: number;
  minute: number;
  second: number;
  teamId: number;
  playerId?: number;
  x: number;          // 0–100 正規化
  y: number;          // 0–100 正規化
  endX?: number;
  endY?: number;
  type: EventTypeObj<number>;
  outcomeType: EventTypeObj<0 | 1>;
  qualifiers?: Qualifier[];
}
```

### 3-4. EventRow（DB保存形式）

`MatchEvent` を DB の `events` テーブルに保存する際のフラット形式。カスタムイベントも同テーブルで管理（`source` フィールドで区別）。

```typescript
interface EventRow {
  id: number | string;
  match_id: string;
  event_id: number;
  type_value: number;
  type_name: string;
  outcome: boolean;
  minute: number;
  second: number;
  x: number;
  y: number;
  // カスタムイベント専用フィールド
  source?: 'whoscored' | 'custom';
  custom_label?: string;
  custom_memo?: string;
}
```

### 3-5. CustomEvent・MatchMemo（分析メモ）

```typescript
// Zod スキーマから導出 (src/lib/schema.ts)
type CustomEvent = {
  id: string;         // UUID
  match_id: string;
  period: number;     // 1–5
  minute: number;
  second: number;
  labels: string[];
  memo: string;
  created_at: number;
}

type MatchMemo = {
  matchId: string;
  memo: string;
  updatedAt: number;
}
```

### 3-6. PlayerMaster・PlayerPhoto（選手マスター・顔写真データ）

```typescript
// Zod スキーマから導出 (src/lib/schema.ts)
type PlayerMaster = {
  id: string;                 // '${season}_${playerId}'
  playerId: number;
  name: string;
  season: string;             // 例: '26-27', '25-26'
  defaultShirtNo?: number;
  position?: string;
  photoBlob?: Blob;           // クエリ取得時のJOIN結合フィールド（物理保存は player_photos テーブル）
  photoUrl?: string;          // 外部URL（フォールバック）
  teamName?: string;
  isExcluded?: boolean;       // 非表示フラグ
  updatedAt: number;
}

type PlayerPhoto = {
  playerId: number;           // Primary Key（全シーズン共通）
  photoBlob: Blob;            // 256×256px WebP (品質0.85)
  mimeType: string;           // 'image/webp' (またはフォールバック 'image/png')
  updatedAt: number;
}

> **[!NOTE]**
> - **写真保存契約**: `savePlayerPhoto(playerId, photoBlob)` で `player_photos` に物理保存。`db.players` テーブルには Blob を持たせず、クエリ取得時に JOIN 結合します。
> - **ポジション保護契約**: 試合インポートやスカッド同期時、途中交代等で試合データ側のポジションが `'Sub'` になっている場合でも、すでに選手マスター（`db.players`）に存在する本職ポジション（`GK, DF, MID, FW, DC, MC` 等）を `'Sub'` で上書き破壊しない保護ロジック（`savePlayerMaster`）が動作します。
> - **選手自動名寄せ契約 (Auto-Merge)**: 試合インポート、全体データ復元、スカッド同期時に `mergeLegacyPlayersAndPhotos()` が自動発動。レガシー選手・仮ID（`id < 0 || (id >= 345000 && id < 346000)`）と公式WhoScored選手データを正規化氏名の一致で自動統合し、写真データを公式 `playerId` へ移管、旧レコード削除、戦術プロジェクト内の `playerId` 置換を一括トランザクションで実行します。
> - **写真フォールバック契約**: 戦術ボード上で `playerId` が未一致の場合でも、選手氏名の一致によるフォールバック検索（`findPlayerPhotoByName` / `findPlayerPhotosByNames`）により写真の欠落を防止します。
```

---

## 4. 戦術ボード系エンティティ（関数型DDD・単一所有権・直和型・Branded座標）

型定義ファイル: モジュール分割構成 [`src/lib/types/tactical/`](file:///home/watter46/src/footics/src/lib/types/tactical/) およびバレル [`src/lib/types/tactical-unified.ts`](file:///home/watter46/src/footics/src/lib/types/tactical-unified.ts)（Contract-First Zod スキーマ、詳細は [`.agents/rules/tactical-domain-architecture.md`](file:///home/watter46/src/footics/.agents/rules/tactical-domain-architecture.md) 参照）

### 4-0. Branded Coordinates（ブランド型座標プリミティブ）

異なる座標空間の混同をコンパイル時に遮断するため、素の `{ x: number, y: number }` ではなく以下の Branded Types を使用する：

```typescript
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type ScreenNormCoord = Brand<number, 'ScreenNormCoord'>; // 16:9スクリーン基準 (0..100, overflow時任意実数)
export type PitchNormCoord = Brand<number, 'PitchNormCoord'>;   // ピッチ白線内相対 (0..100)
export type StagePixel = Brand<number, 'StagePixel'>;           // キャンバス描画ピクセル

export interface ScreenNormPoint {
  readonly x: ScreenNormCoord;
  readonly y: ScreenNormCoord;
}

export interface PitchNormPoint {
  readonly x: PitchNormCoord;
  readonly y: PitchNormCoord;
}

export interface StagePixelPoint {
  readonly x: StagePixel;
  readonly y: StagePixel;
}
```

### 4-1. TacticalProject & TacticalPhase（単一所有権階層）

すべてのプロパティは **`TacticalProject` ➔ `TacticalPhase` ➔ `Slide`** のただ1つの階層にのみ属し、親子間での重複オプショナルフィールドや仮想 getter（旧 `project.slides`）を持たない。

```typescript
export interface TacticalProject {
  readonly id: string;
  readonly version: '2.0.0';
  readonly title?: string;
  readonly createdAt: string; // ISO 8601
  readonly updatedAt: string;
  readonly homeColor: { readonly primary: string; readonly secondary?: string };
  readonly awayColor: { readonly primary: string; readonly secondary?: string };
  readonly pitchAppearance: PitchAppearanceConfig; // プロジェクト単位で単一所有
  readonly backgroundType: 'pitch' | 'image' | 'blank';
  readonly backgroundImageUrl?: string;
  readonly matchId?: string;
  readonly matchFormations?: {
    readonly home: FormationType;
    readonly away: FormationType;
  };
  readonly tags: readonly string[];
  readonly thumbnail?: string;
  readonly screenshotSourceUrl?: string;
  readonly phases: readonly TacticalPhase[];       // 最低1個
  readonly activePhaseId: string;
  readonly activeSlideId: string;
}

export interface TacticalPhase {
  readonly id: string;
  readonly name: string;                           // フェーズ名 (1〜200文字)
  readonly aspectRatio: AspectRatio;               // フェーズ単位で単一所有 ('16:9' | '9:16' | '4:5' | '1:1')
  readonly boundaryBox: BoundaryBox;               // フェーズ単位で単一所有 (DEFAULT_BOUNDARY_BOX_16_9)
  readonly slides: readonly Slide[];               // 最低1枚
}
```

### 4-2. Slide（スライド＝シーン）

`Slide` は自身の配置オブジェクト・トランジション時間・3Dカメラ姿勢・陣地反転状態のみを所有し、親階層（`aspectRatio`, `boundaryBox`, `pitchAppearance`, `backgroundType`）の重複フィールドを持たない。

```typescript
export interface Slide {
  readonly id: string;
  readonly index: number;
  readonly label?: string;
  readonly players: readonly Player[];             // 判別可能な直和型 (PitchPlayer | BenchPlayer)
  readonly arrows: readonly ArrowAnnotation[];
  readonly zones: readonly ZoneAnnotation[];       // 判別可能な直和型 (RectZone | EllipseZone | PolygonZone)
  readonly texts: readonly TextAnnotation[];
  readonly ball: BallState;
  readonly transitionDurationMs: number;           // 100–30000ms (デフォルト 1000ms)
  readonly pauseMs: number;                        // 0–10000ms (デフォルト 500ms)
  readonly easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  readonly cameraTransitionMode: 'sync' | 'slow' | 'continuous' | 'cut';
  readonly cameraDurationMs: number;               // 500–60000ms (デフォルト 10000ms)
  readonly pitchTransform: PitchTransform;         // 3Dカメラ姿勢 (tilt 0〜70, yaw 0〜360, zoom, panX, panY)
  readonly isSidesSwapped: boolean;                // 陣地反転状態
}

export interface PitchTransform {
  readonly panX: number;
  readonly panY: number;
  readonly zoom: number;                           // 0.5〜2.5
  readonly tilt: number;                           // 0〜70度
  readonly yaw: number;                            // 0〜360度
  readonly isLocked: boolean;
}

export interface PitchAppearanceConfig {
  readonly pitchBackgroundType: 'solid' | 'marble';
  readonly overlayColor: string;                   // デフォルト '#0B303E'
  readonly overlayOpacity: number;                 // 0〜1.0
  readonly lineColor: string;                      // デフォルト '#38bdf8'
  readonly lineWidth: number;                      // 1〜6 (デフォルト 2.5)
  readonly lineOpacity: number;                    // 0〜1.0 (デフォルト 1.0)
}
```

### 4-3. キャンバスオブジェクト（Discriminated Unions）

**座標系**: すべて第1層 `16:9` 固定スクリーン基準の正規化座標 `ScreenNormCoord (0.0 ～ 100.0)`。選手・ボールは `[0, 100]` にクランプされ（白線外余白は配置可）、矢印・ゾーン・テキストは範囲外配置も許容。UI作図途中の一時フラグ（`isComplete` 等）は永続ドメインモデルに混入させず `EphemeralSessionState` に分離する。

#### Player（ピッチ選手とベンチ選手の判別可能な直和型）

```typescript
interface BasePlayer {
  readonly id: string;
  readonly playerId?: string;
  readonly name?: string;
  readonly shirtNo?: string;
  readonly role?: string;
  readonly team: 'home' | 'away' | 'neutral';
  readonly x: ScreenNormCoord;
  readonly y: ScreenNormCoord;
  readonly style: MarkerStyle;
  readonly locked: boolean;
}

export interface PitchPlayer extends BasePlayer {
  readonly area: 'pitch';
  readonly visionCone?: VisionCone;
  readonly connectLines: readonly ConnectLine[];
  readonly badges: readonly PlayerBadge[];
  readonly focus?: PlayerFocus;
  readonly trajectory?: PlayerTrajectory;
}

export interface BenchPlayer extends BasePlayer {
  readonly area: 'bench';
  // ベンチ選手はピッチ専用装飾（visionCone, connectLines, focus, trajectory）を型レベルで持てない
}

export type Player = PitchPlayer | BenchPlayer;

export interface MarkerStyle {
  readonly markerType: 'circle' | 'ring' | 'ring-fade'; // 2D丸 / 3D足元リング / 3Dフェードリング
  readonly insideContent: 'number' | 'photo' | 'none';
  readonly bottomLabel: 'name' | 'number' | 'none';
  readonly color: string;
  readonly strokeColor: string;
  readonly strokeWidth: number;
  readonly sizeScale: number;
  readonly numberSizeScale: number;
  readonly labelSizeScale: number;
  readonly glowBlur?: number;                           // 0〜100 (リングマーカー用)
  readonly glowOpacity?: number;                        // 0〜1.0 (リングマーカー用)
}
```

#### ArrowAnnotation（矢印・ルートルート線）

```typescript
export interface ArrowAnnotation {
  readonly id: string;
  readonly annotationType: 'arrow';
  readonly arrowType: 'pass' | 'move' | 'dribble' | 'defend' | 'run' | 'line' | 'route_line' | 'generic';
  readonly curveType: 'straight' | 'curved' | 'arc';
  readonly points: readonly ScreenNormPoint[];          // 最低2点
  readonly controlPoint?: ScreenNormPoint;
  readonly color: string;                               // #RRGGBB
  readonly strokeWidth: number;                         // 1–10
  readonly startMarker: 'none' | 'arrow' | 'dot';
  readonly endMarker: 'none' | 'arrow' | 'dot';         // 旧 arrowHead: boolean の二重定義は廃止し一本化
  readonly label?: string;
  readonly locked?: boolean;
}
```

#### ZoneAnnotation（形状別の判別可能な直和型）

```typescript
interface BaseZone {
  readonly id: string;
  readonly annotationType: 'zone';
  readonly zoneType: 'highlight' | 'space' | 'danger' | 'pressing' | 'buildup' | 'generic';
  readonly color: string;
  readonly opacity: number;                             // 0–1
  readonly strokeColor?: string;
  readonly strokeOpacity: number;                       // 0–1.0
  readonly strokeWidth: number;                         // 0–8
  readonly locked: boolean;
}

export interface RectZone extends BaseZone {
  readonly shapeType: 'rect';
  readonly x: ScreenNormCoord;
  readonly y: ScreenNormCoord;
  readonly width: ScreenNormCoord;
  readonly height: ScreenNormCoord;
  readonly rotation: number;
}

export interface EllipseZone extends BaseZone {
  readonly shapeType: 'ellipse';
  readonly x: ScreenNormCoord;
  readonly y: ScreenNormCoord;
  readonly width: ScreenNormCoord;
  readonly height: ScreenNormCoord;
  readonly rotation: number;
}

export interface PolygonZone extends BaseZone {
  readonly shapeType: 'polygon';
  readonly points: readonly ScreenNormPoint[];          // 確定した3頂点以上（作図中プレビューは EphemeralSessionState）
}

export type ZoneAnnotation = RectZone | EllipseZone | PolygonZone;
```

#### TextAnnotation（テキスト） & BallState（ボール）

```typescript
export interface TextAnnotation {
  readonly id: string;
  readonly annotationType: 'text';
  readonly x: ScreenNormCoord;
  readonly y: ScreenNormCoord;
  readonly content: string;                             // 最大200文字
  readonly fontSize: number;                            // 8–72
  readonly color: string;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly locked?: boolean;
}

export interface BallState {
  readonly x: ScreenNormCoord;
  readonly y: ScreenNormCoord;
  readonly visible: boolean;
  readonly trajectory?: PlayerTrajectory;
  readonly locked: boolean;
}
```

---

## 5. エクスポート設定 ＆ モバイル共有ペイロード

### 5-1. エクスポート形式（ExportTarget）
エクスポート形式は `ExportTarget` の discriminated union で管理。PC上での重いエンコードを避け、iPhone のハードウェアエンコーダ（A14 Bionic以降）を活用する「iPhone 高画質動画出力」を中心に構成。

| 形式 | FPS | スコープ | 特記 |
|-----|-----|---------|------|
| `png` | — | current / all / selected | スケール 1–4x。Konva `stage.toBlob()` |
| `zip` | — | all | PNG一括連番。`fflate` による高速圧縮 |
| `mp4` | 30 / 60 | all / range | H.264 / iPhone PWA連携（24Mbps / 14Mbps プリセット、Off-Thread Worker対応） |
| `webm` | 30 / 60 | all / range | アルファ透明チャンネル対応（`mediabunny`） |

> **[!NOTE]**
> - **基準解像度保証**: 出力解像度は固定の 1280×720 ではなく、選択中のアスペクト比に対応する基準解像度（`PITCH_BOUNDARY_CONFIGS`: 4:5なら 1080×1350、9:16なら 1080×1920、1:1なら 1080×1080、16:9なら 1920×1080）が適用され、アスペクト比の歪みを防止します。
> - **iOS 比較プリセット**:
>   - `24mbps`: 1080p FHD, 60fps, 24Mbps, GOP 2秒, AVC/H.264（最高画質）
>   - `14mbps`: 1080p FHD, 60fps, 14Mbps, GOP 1秒, AVC/H.264（容量最適化）
> - **高速化技術**: Off-Thread Web Worker（`video-mediabunny.worker.ts`）による並行エンコード、および `pauseMs` 静止区間での Canvas 再描画スキップ。

### 5-2. iPhone PWA 共有ペイロード（TacticalExportSharePayload）
iPhone 専用エクスポート（`/export`）へプロジェクトを受け渡すための一時共有ペイロード構造（Zod スキーマ `TacticalExportSharePayloadSchema`）。

```typescript
// src/lib/tactical/export/share-payload.ts
type TacticalExportSharePayload = {
  version: '2.0.0';
  title: string;
  slides: Slide[];
  aspectRatio: '16:9' | '4:5' | '1:1' | '9:16';
  orientation: 'horizontal' | 'vertical';
  boundaryBox?: BoundaryBox;
  pitchTransform?: PitchTransform;
  pitchAppearance?: PitchAppearanceConfig;
  playerPhotos?: Record<string, string>; // playerId -> Base64 WebP 文字列（Photo モード選手の顔写真）
}

type TacticalExportShareSummary = {
  shareId: string;
  title: string;
  createdAt: number;
  sceneCount: number;
  aspectRatio: AspectRatio;
  orientation: AnimationOrientation;
  hasBoundaryCrop: boolean;
}
```

### 5-3. 全体バックアップ ZIP 構造（Manifest Version 5）
グローバルデータ管理（`exportAllDataZip` / `importAllDataZip`）のアーカイブ構成。

```
footics_backup_YYYY-MM-DD.zip
  ├── manifest.json            # version: 5, exportedAt, 各種カウント
  ├── matches.json             # 試合マスター一覧
  ├── events.json              # 全イベントレコード
  ├── memos.json               # { custom_events, match_memos }
  ├── players.json             # 選手マスター名簿（photoFileName 参照付き）
  ├── player_photos.json       # 写真メタデータ一覧
  ├── photos/                  # 選手顔写真バイナリ（{playerId}.webp, 非圧縮 level: 0）
  ├── tactical_projects.json   # 戦術ボードプロジェクト群（Phase構造化データ含む）
  └── keyval.json              # キーバリューストアエントリ
```

---

## 6. X (Twitter) メディア最適化プリセット

コンテンツ投稿用に最適化された境界線（BoundaryBox）プリセット（`X_MEDIA_PRESETS`、`src/lib/types/tactical/primitives.ts`）が定義済み。

| プリセット ID (`XMediaPresetKey`) | 比率 | ラベル | 用途 |
|---------------------------------|------|--------|-----|
| `landscape_16_9` | 16:9 | 16:9 ワイド | 横長投稿・YouTube・PC全画面 |
| `portrait_4_5` | 4:5 | 4:5 縦長 | X (Twitter) 単体画像TL最大占有 |
| `vertical_9_16` | 9:16 | 9:16 フル縦 | TikTok / Instagram Reels / 縦動画 |
| `square_1_1` | 1:1 | 1:1 スクエア | Instagram フィード / 正方形作図 |
| `pitch_fit` | 動的 | ピッチにフィット | 現在のピッチ枠にジャストフィット |

---

## 7. 外部データソース（WhoScored）

Footics は独自の外部 API を持たない。データ取得は別の自作 Chrome 拡張を経由する。

```
WhoScored サイト（外部）
  ↓ 自作スクレイパー拡張（Footics とは別の独立した拡張機能）
  ↓ JSON ファイルとしてダウンロード
  ↓ Footics の Import UI で読み込み
  ↓ バリデーション（Zod）
  ↓ Dexie.js (IndexedDB) に保存
```

**対応データ形式:**
- `ClubMatchRoot`: クラブ戦（Premier League 等）の WhoScored JSON
- `NationalMatchRoot`: 代表戦の WhoScored JSON（スキーマが異なる）

> **[!IMPORTANT]**
> WhoScored への直接 fetch / API コールはエージェントが実装してはならない。
> データ取得は常に「JSON ファイルのインポート」を経由する設計を維持すること。
