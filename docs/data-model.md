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
| **バリデーション** | `src/lib/schema.ts` / `src/lib/types/tactical-unified.ts` の Zod スキーマ |
| **主要型定義ファイル** | `src/types/index.ts`（試合データ系）、`src/lib/types/tactical-unified.ts`（戦術ボード系） |

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

## 4. 戦術ボード系エンティティ

型定義ファイル: [`src/lib/types/tactical-unified.ts`](file:///home/watter46/src/footics/src/lib/types/tactical-unified.ts)（912行、Contract-First Zod スキーマ）

### 4-1. TacticalProject（プロジェクト全体）

```typescript
// Zod スキーマから導出 (Phase 構造化 v2.0.0)
type TacticalProject = {
  id: string;
  version: '2.0.0';
  title?: string;
  createdAt: string;      // ISO 8601
  updatedAt: string;
  aspectRatio: AspectRatio;                   // '16:9' | '9:16' | '4:5' | '1:1'
  backgroundType: 'pitch' | 'image' | 'blank';
  backgroundImageUrl?: string;
  pitchAppearance?: PitchAppearanceConfig;    // ピッチ外観（solid / marble、ライン設定）
  homeColor: { primary: string; secondary?: string };
  awayColor: { primary: string; secondary?: string };
  phases: TacticalPhase[];                    // フェーズフォルダ配列（最低1個）
  activePhaseId: string;                      // 現在アクティブなフェーズID
  activeSlideId: string;                      // 現在アクティブなシーンID
  matchId?: string;                           // 関連試合ID（任意）
  matchFormations?: {                         // 試合連携フォーメーション
    home: FormationType;
    away: FormationType;
  };
  tags: string[];
  thumbnail?: string;
  screenshotSourceUrl?: string;
  boundaryBox?: BoundaryBox;
  readonly slides: Slide[];                   // activePhaseId のスライドを指す仮想非列挙 getter
}

type TacticalPhase = {
  id: string;
  name: string;                               // フェーズ名 (1〜200文字)
  slides: Slide[];                            // スライド配列（最低1枚）
}
```

### 4-2. Slide（スライド＝シーン）

1プロジェクトは複数のフェーズ（`TacticalPhase`）とスライドで構成される。スライド間の遷移でアニメーション動画を生成する。

```typescript
type Slide = {
  id: string;
  index: number;
  label?: string;
  players: Player[];              // 戦術ボード上の選手オブジェクト
  arrows: ArrowAnnotation[];      // 矢印・ライン
  zones: ZoneAnnotation[];        // ゾーン
  texts: TextAnnotation[];        // テキスト
  ball: BallState;                // ボール
  transitionDurationMs: number;   // 遷移アニメーション時間 (100–30000ms, デフォルト1000ms)
  pauseMs: number;                // 停止時間 (0–10000ms, デフォルト500ms)
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  cameraTransitionMode?: 'sync' | 'slow' | 'continuous' | 'cut'; // カメラ遷移モード
  cameraDurationMs?: number;      // カメラドリフト時間 (500–60000ms, デフォルト10000ms)
  pitchTransform?: PitchTransform; // 3Dカメラ位置 (tilt 0〜70, yaw 0〜360, zoom, panX, panY)
  pitchPosition?: { x: number; y: number };
  pitchAppearance?: PitchAppearanceConfig;
  backgroundImageUrl?: string;
  backgroundType?: 'pitch' | 'image' | 'blank';
  boundaryBox?: BoundaryBox;
  aspectRatio?: AspectRatio;
  isSidesSwapped?: boolean;       // 陣地反転状態（Swap Sides 適用時に true）
}

type PitchTransform = {
  panX: number;
  panY: number;
  zoom: number;                   // 0.5〜2.5
  tilt: number;                   // 0〜70度
  yaw?: number;                   // 0〜360度
  isLocked: boolean;
}

type PitchAppearanceConfig = {
  pitchBackgroundType: 'solid' | 'marble';
  overlayColor: string;           // デフォルト '#0B303E'
  overlayOpacity: number;         // 0〜1.0
  lineColor: string;              // デフォルト '#ffffff' (ピッチSVG初期値はサイアン '#38bdf8')
  lineWidth: number;              // 1〜6 (デフォルト 2.5)
  lineOpacity: number;            // 0〜1.0 (デフォルト 1.0)
}
```

### 4-3. キャンバスオブジェクト

**座標系**: すべて正規化座標 `(0.0 ～ 100.0)`。アスペクト比変換は `transformCoord()` で実施。

#### Player（戦術ボード上の選手）

```typescript
type Player = {           // type TacticalPlayer = Player
  id: string;
  playerId?: string;
  name?: string;
  shirtNo?: string;
  team: 'home' | 'away' | 'neutral';
  area: 'pitch' | 'bench';
  x: number;              // 正規化座標
  y: number;
  style: MarkerStyle;
  // ネストオブジェクト（オプション）
  visionCone?: VisionCone;          // 視野コーン (color: #38bdf8, opacity: 0.3, radius: 13)
  connectLines: ConnectLine[];      // 選手間関係線
  badges: PlayerBadge[];            // バッジラベル
  focus?: PlayerFocus;              // スポットライト強調
  trajectory?: PlayerTrajectory;    // 移動軌道
  locked?: boolean;
}

type MarkerStyle = {
  markerType?: 'circle' | 'ring' | 'ring-fade'; // 2D丸 / 3D足元リング / 3Dフェードリング
  insideContent: 'number' | 'photo' | 'none';
  bottomLabel: 'name' | 'number' | 'none';
  color: string;
  strokeColor: string;
  strokeWidth: number;
  sizeScale: number;
  numberSizeScale: number;
  labelSizeScale: number;
  glowBlur?: number;               // 0〜100 (リングマーカー用)
  glowOpacity?: number;            // 0〜1.0 (リングマーカー用)
}
```

#### ArrowAnnotation（矢印）

```typescript
type ArrowAnnotation = {
  id: string;
  annotationType: 'arrow';
  arrowType: 'pass' | 'move' | 'dribble' | 'defend' | 'run' | 'line' | 'route_line' | 'generic';
  curveType: 'straight' | 'curved' | 'arc';
  points: { x: number; y: number }[];  // 最低2点
  controlPoint?: { x: number; y: number };
  color: string;                        // #RRGGBB
  strokeWidth: number;                  // 1–10
  arrowHead: boolean;
  endMarker?: 'none' | 'arrow' | 'dot';
  startMarker?: 'none' | 'arrow' | 'dot';
  label?: string;
}
```

#### ZoneAnnotation（ゾーン）

```typescript
type ZoneAnnotation = {
  id: string;
  annotationType: 'zone';
  zoneType: 'highlight' | 'space' | 'danger' | 'pressing' | 'buildup' | 'generic';
  shapeType?: 'rect' | 'ellipse' | 'polygon';
  x?: number; y?: number; width?: number; height?: number;
  rotation?: number;
  points: { x: number; y: number }[];
  color: string;
  opacity: number;                      // 0–1
  strokeColor?: string;
  strokeOpacity?: number;               // 0–1.0
  strokeWidth: number;                  // 0–8
}
```

#### TextAnnotation（テキスト）

```typescript
type TextAnnotation = {
  id: string;
  annotationType: 'text';
  x: number; y: number;
  content: string;    // 最大200文字
  fontSize: number;   // 8–72
  color: string;
  bold: boolean;
  italic: boolean;
}
```

#### BallState（ボール）

```typescript
type BallState = {
  x: number; y: number;
  visible: boolean;
  trajectory?: PlayerTrajectory;
  locked?: boolean;
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

コンテンツ投稿用に最適化されたアスペクト比プリセットが定義済み。

| プリセット ID | 比率 | 推奨サイズ | 用途 |
|------------|------|---------|-----|
| `single_image_4_5` | 4:5 | 1080×1350px | 画像1枚（TL最大高さ） |
| `carousel_image_9_16` | 9:16 | 1080×1920px | 画像2枚カルーセル |
| `feed_video_9_16` | 9:16 | 1080×1920px | 縦動画フィード |
| `pitch_overview_16_9` | 16:9 | 1200×675px | ピッチ全体俯瞰 |

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
