---
description: "Footics & Extension 共通コンポーネントアーキテクチャ規約（4層モデル, 6大設計品質原則, ホスト境界, Store Provider, 副作用ゼロ）"
globs:
  - "src/**"
  - "extension/**"
---
# コンポーネントアーキテクチャ規約 (Component Architecture Standards)

本規約は、Footics Web アプリケーションと Chrome Extension において、**コンポーネントの2重管理を排除し、初期チラつき（Flicker）や黒マージン等の副作用を出さず、高い保守性・拡張性・テスタビリティを担保するための絶対遵守ルール**です。

---

## 1. Footics 4層コンポーネントモデル (4-Tier Model)

すべてのコンポーネントは、以下の 4 つの階層（Level）のいずれかに属さなければなりません。

| 階層 | 名称 | 責務と配置ルール | 実在する代表ファイル |
| :--- | :--- | :--- | :--- |
| **Level 4** | **Application Shell** | 画面全体のエントリーポイント、URLパラメータ解決、ルーティング、タブ/ウィンドウ制御。**純粋マウンターに徹し、低レベルなパイプライン処理のインライン記述を禁止する。ホスト（Web / Extension）固有のコードをここに限定する。** | `src/app/tactical/page.tsx`, `extension/entrypoints/overlay.content.tsx`, `extension/entrypoints/background.ts` |
| **Level 3** | **Feature View** | データソース（IndexedDB / Query）のロードと永続化ライフサイクル管理。**`StoreProvider` による初期値（Props）確定注入** を行い、複数の Level 2 を組み立てる。 | `FullTacticalCanvas.tsx`, `QuickAnnotationCanvas.tsx`, `memo-overlay-bridge.tsx` |
| **Level 2** | **Domain UI Block** | 単一の関心事を持つ自律的な UI パーツ。**ホスト非依存（Web / Extension 完全共用）**。ビジネスロジックはカスタムフックに逃がし、UIファイルは描画に集中。状態は Context Hook 経由で取得。 | `CanvasStageContainer.tsx`, `CoreDrawingToolbar.tsx`, `AnnotationLayer.tsx`, `MemoOverlayView.tsx` |
| **Level 1** | **Pure Primitive / Headless** | ドメイン知識を持たない汎用部品、純粋幾何計算、汎用フック。完全純粋でテスト容易性が 100%。 | `calculateContainVideoCrop`, `worldToScreen`, `button.tsx`, `select.tsx` |

---

## 2. 6大設計品質原則 (Six Design Pillars) とコード判定基準

### ①【単一責任・責務の分離 (SRP / SoC)】
- **コード判定基準**: UI コンポーネント（`.tsx`）の関数本体内に、`db.*` 呼び出し、`fetch`、複雑な幾何計算式（行列演算・ベジェ制御点計算）、生 IPC 通信を直接記述することを禁止します。
- **純粋マウンター原則 (Shell Purity)**: Level 4 のエントリポイント（`page.tsx`, `overlay.content.tsx`, `background.ts`）は、UI のマウントとコマンドディスパッチのみを担当し、DOM探索・待機ループ・画像変換などの複合処理をインライン記述してはなりません（`services/` や `commands/` へ分離する）。

### ②【凝集度と結合度 (Cohesion & Coupling)】
- **Web ↔ Extension の一方向依存の厳守**:
  依存の向きは必ず `extension/ -> src/` の一方向とします。`src/` から `extension/` のコードを import することを固く禁じます（`.dependency-cruiser.cjs` で機械遮断）。
- **機能モジュール間の疎結合**:
  `src/features/<domainA>/` から別の `src/features/<domainB>/` の内部コンポーネントを直接 import することを原則禁止します。共用部品は `src/components/` または `src/lib/`（または共通コア `tactical-unified/core/`）へ抽出してください。

### ③【開放閉鎖原則 (OCP: Open-Closed Principle)】
- **コマンド / メッセージ / イベント戦略のレジストリ化 (Registry Pattern)**:
  バリエーションが増える要素（バックグラウンドコマンド `extension/entrypoints/background/commands/registry.ts`、イベント戦略 `src/registry/`、ショートカットハンドラ等）に巨大な `switch / if` をコアコードへベタ書きすることを禁止します。ハンドラー定義を追加し、レジストリに登録する構造としてください。

### ④【抽象度の一貫性 (SLAP: Single Level of Abstraction Principle)】
- 単一の関数やコンポーネント内で、高レベルなドメイン意図（「キャプチャして開く」「プロジェクトを保存する」）と、低レベルな実装詳細（rAF 待機、CSS 直操作、ピクセル幾何計算）を混在させてはなりません。

### ⑤【変更の局所性と直交性 (Locality & Orthogonality)】
- **副作用の RAII 型隔離**:
  DOM やグローバルスタイル、イベントリスナーを一時的に変更・登録する処理は、必ず原状回復を行う `cleanup()` 関数を返却し、`useEffect` のクリーンアップまたは `finally` 句で確実に実行してください。
- **マルチタブ排他制御 (Web Locks)**:
  Extension からのストレージ同期キュー処理（`footics-app-bridge.ts` 等）では `navigator.locks` を用いた排他制御を行い、複数タブ間での競合を防止してください。

### ⑥【テスタビリティと認知負荷 (Testability & Cognitive Load)】
- **エントリポイントの DI（依存性注入）設計**:
  `defineBackground` や `defineContentScript` 内に全処理を無名クロージャで閉じ込めることを禁止します。コマンドハンドラやサービス関数として export し、Chrome API や時刻（`Date.now`）を引数注入可能にして単体テストを作成してください。

---

## 3. Zustand 状態管理と Store Provider 規約 (R4)

### 3.1 セレクター購読とレンダリング規律
1. **ストア全体の丸ごと購読禁止**: `const store = useXxxStore()` のように引数なしでストア全体を購読することを禁止します。必ず必要なスライスのみを選択するセレクター関数を渡してください。
2. **複数プロパティ選択時の `useShallow`**: オブジェクトリテラルを返すセレクターには `zustand/react/shallow` の `useShallow` を使用し、不要な再レンダリングを防止してください。
3. **レンダリング本体での `.getState()` 禁止**: コンポーネント関数の描画パス（トップレベル）で `useXxxStore.getState()` を呼ぶことを禁止します（リアクティブ更新が失われます）。`.getState()` はイベントハンドラ・コールバック・非同期処理内でのみ許可されます。

```tsx
// ❌ 禁止: ストア丸ごと購読・描画パスでの getState()
export function SlideToolbar() {
  const store = useCanvasStore((s) => s);
  const currentSlide = useTacticalUnifiedStore.getState().slides[0];
  return <div>{store.activeTool}</div>;
}

// ✅ 推奨: プリミティブセレクターまたは useShallow
import { useShallow } from 'zustand/react/shallow';

export function SlideToolbar() {
  const { activeTool, setActiveTool } = useCanvasStore(
    useShallow((s) => ({
      activeTool: s.activeTool,
      setActiveTool: s.setActiveTool,
    })),
  );
  return <button onClick={() => setActiveTool('arrow')}>{activeTool}</button>;
}
```

### 3.2 Store Provider 対象ドメインと移行ステータス一覧
Web と Extension で共用する機能、または複数インスタンス・初期値確定注入（Flicker ゼロ保証）が必要なドメインでは、Vanilla Store Factory（`createStore`）+ React Context による **Store Provider パターン** を使用します。

| ドメイン | 現在のステータス | ルール・機械検証（`ai:check`） |
| :--- | :--- | :--- |
| **`memo-overlay` (Web)** | **移行完了** (`MemoOverlayStoreProvider` + `useMemoOverlayStoreContext`) | ドメイン内部からのシングルトン直接参照は全面禁止。 |
| **`tactical-unified/core` (Level 2 共用キャンバス)** | **移行完了** (`CanvasStoreProvider` + `useCanvasStore`) | `core/` 配下から `useTacticalUnifiedStore` の import は **`ai:check` で即時エラー遮断**。 |
| **`tactical-unified` (Web パネル・フック群)** | **段階移行中（凍結例外）** (`useTacticalUnifiedStore` 43ファイル + `tactical-canvas-store-adapter.ts`) | 既存の 43 ファイルはベースライン（許可リスト）として凍結。**新規ファイルでの `useTacticalUnifiedStore` 直接参照・アダプター拡張は `ai:check` でエラー遮断**。 |

---

## 4. コンポーネント間・ホスト境界通信規約 (R6)

### 判定基準
- **`window.dispatchEvent(new CustomEvent(...))` の新規使用禁止**:
  コンポーネント間やモジュール間の連携にグローバル `CustomEvent`（`footics-action` 等）を使用することを禁止します（Biome `noRestrictedGlobals` + ベースラインで新規追加を遮断）。
  - **同一 React ツリー内**: Context アクション、または `ref`（`useImperativeHandle`）契約で連携してください。
  - **Extension Content Script ↔ Web App 間**: 型定義・Zod 検証された `window.postMessage` プロトコルに一本化してください。
- **ホスト境界の原則 (Host Boundary Rule)**:
  - `chrome.*`（Extension API）、`window.location`、Dexie DB への直接アクセスは **Level 3 以上に隔離** してください。
  - **Level 2 以下のコンポーネントへのホスト依存の持ち込みは絶対禁止**です（`.dependency-cruiser.cjs` で機械遮断）。

```ts
// ❌ 禁止: グローバル CustomEvent による暗黙的なイベント発火
window.dispatchEvent(
  new CustomEvent('footics-action', { detail: { action: 'save' } }),
);

// ✅ 推奨 (ツリー内): Context または Ref コールバック経由で明示的に呼び出す
onSaveRequest();

// ✅ 推奨 (Host 境界間): 型定義された postMessage + 受信側での Zod 検証
export const bridgeMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('FOOTICS_SHORTCUT_ACTION'), action: z.string() }),
  z.object({ type: z.literal('FOOTICS_TRIGGER_CAPTURE') }),
]);
export type BridgeMessage = z.infer<typeof bridgeMessageSchema>;
```

---

## 5. 不具合を生まない状態・振る舞い分離原則

1. **頭脳（ロジック）と見た目（Renderer）の分離**:
   各オブジェクト（選手・ボール・矢印・ゾーン・テキスト）は、座標計算・状態更新を担う Hook / 純粋関数と、描画のみを担う Konva / React コンポーネントに分離してください。
2. **派生状態の二重保存禁止（Derived State via Pure Selectors）**:
   生データから計算できる値（ピクセル座標、カメラ投影座標、フィルタ結果）を別 State として二重保存せず、`tactical-unified-selectors.ts` 等の純粋セレクターで算出してください。
3. **複合操作の単一トランザクション化（Atomic Command Functions）**:
   「リセット」「アスペクト比切替」「フォーメーション適用」など複数データを同時更新する操作は、UI の `onClick` にインライン記述せず、ストアまたはヘルパーの単一コマンド関数に集約してください。
4. **論理座標（World Space `0〜100`）とスクリーン投影座標（Screen Space）の分離**:
   永続化座標（`0〜100`）と画面描画座標を混同せず、必ず座標変換ユーティリティ（`worldToScreen` / `screenToWorld`）を経由してください。

---

## 7. UIデザイン・Primitive利用規約 (Matte & Charcoal Design System Standards)

プロフェッショナルなツール品質（Matte Black & Charcoal Gray、高視認性、極細ボーダー、5大推奨仕様）を維持し、画面・拡張機能ごとのデザイン乖離を防ぐための規約です。

### 7.1 カラーパレット & サーフェス階層（色彩設計）
1. **背景とサーフェス（Surface & Background）**:
   - 純黒（`#000000`）を避け、深いマットブラック（`#0D0D0E`〜`#121214`）をベース背景とする。
   - カード、パネル、モーダルなどの浮き上がる要素には、一段明るいダークグレー（`#18181B`〜`#222226`）を割り当て、**枠線ではなく「明度差」でレイヤー（階層）を表現**する。
   - レイヤー階層:
     - **Base Ground**: `#0D0D0E`（画面全体の最下層ベース）
     - **Sub Surface**: `#121214`（左右サイドバー、ヘッダー、ツールバー外枠）
     - **Elevated Card**: `#18181B`（パネル内カード、入力欄、ドロップダウン、ホバー行）
     - **Top Floating / Modal**: `#222226`（モーダル本体、ポップオーバー、トースト通知）
2. **テキスト階層（Typography Colors）**:
   - プライマリ（見出し・主要データ）: 高コントラストなホワイト（`#FFFFFF`〜`#F4F4F5`）
   - セカンダリ（補足・ラベル・メタ情報）: 落ち着いたミディアムグレー（`#71717A`〜`#A1A1AA`）
3. **アクセント＆セマンティックカラー（最小限の面積で使用）**:
   - 暗闇で際立つ高彩度なネオン・ビビッドカラーを、アイコン、ステータスバッジ、アクティブ状態などの「最小限の面積」に限定して使用する。
   - **Primary Accent**: ビビッドオレンジ（`#FF5500`）
   - **Info / Highlight**: エレクトリックシアン（`#00A8FF`）
   - **Warning**: アンバーイエロー（`#F5A623`）
   - **Danger / Alert**: コーラルレッド（`#EB3B5A`）
4. **ハードコード色の禁止**:
   - 旧来のバラバラなグレー（`#222222`, `#383838`, `bg-slate-900`, `bg-[#090d16]` 等）のベタ書きを禁止し、本サーフェストークンへ順次統一すること。

### 7.2 質感・境界・エフェクト（Borders & Effects）
1. **ボーダーレス志向 & 極細線**:
   - 要素間の区切りは強い枠線ではなく「余白」と「背景色のトーン差」で表現する。
   - 境界線が必要な場合は、`1px solid rgba(255, 255, 255, 0.07)`（Tailwind: `border-white/[0.07]`）程度の背景に溶け込む極細線にとどめる。
2. **アクティブ＆グロー表現**:
   - 選択中アイテムやアクティブ状態には、アクセントカラーの文字色＋同系色の薄い透過背景（`opacity: 10%〜15%`、例: `bg-[#FF5500]/10`）、または微細な発光感（`shadow-[0_0_12px_rgba(255,85,0,0.35)]`）を付与する。
3. **モーダル・ダイアログの背面（Dim）**:
   - モーダル表示時の背面は `bg-black/70 backdrop-blur-xs`（微弱ブラー）を使用し、背後のキャンバスを品よく沈めつつ最上位サーフェス（`#222226`）を際立たせる。

### 7.3 タイポグラフィ・形状・アイコン規格
1. **フォントとサイズ規律**:
   - クリーンなサンセリフ体（Inter 等）。ツール系ラベルは小さめ（`text-xs` / 11px〜12px）で引き締まった視認性を維持する。
   - 数値・座標・時間・スタッツは等幅フォント（`font-mono`）を用い、テーブル内では右寄せ統一とする。
2. **角丸（Border Radius）**:
   - ボタン、入力フィールド、カード、バッジには中程度の角丸（`6px`〜`10px`、標準: `rounded-[8px]`）を適用し、シャープさとモダンな親しみやすさを両立させる。
3. **アイコン体系（Lucide Icons）**:
   - **基本線幅（Stroke Width）**: 原則 `strokeWidth={1.5}`（Regular/Thin寄り）に統一。
   - **サイズ規格**:
     - `size-6` (24px枠 / 14pxアイコン): インスペクター内プロパティ、インライン入力用
     - `size-7` (28px枠 / 16pxアイコン): ツールバー、標準アクション（既定）
     - `size-8` (32px枠 / 18pxアイコン): TopBar主要アクション
4. **ステータスバッジ＆ピル**:
   - 背景を暗い透過トーン（`opacity: 10%`、例: `bg-[#FF5500]/10`）に抑え、高彩度の文字（`text-[#FF5500]`）と極細枠（`border-[#FF5500]/25`）で表示する。

### 7.4 ワークスペース構造・レイアウト挙動
1. **3ペイン・ワークスペース構成**:
   - 左ペイン（シーン/オブジェクト一覧: 幅64 / `w-64`、背景 `#121214`）
   - 中央（ピッチキャンバス: 背景 `#0D0D0E`、ピッチ面 `#101913`）
   - 右ペイン（プロパティ・インスペクター: 幅72 / `w-72`、背景 `#121214`）
2. **レスポンシブ & 折りたたみ**:
   - 画面幅狭小時（1280px未満）は左右ペインを折りたたみ可能（アイコン化）とする。
   - **Focus Mode**: ワンクリックまたはショートカット（`\`）で左右ペインを一括非表示にし、中央キャンバスを全幅最大化できること。
3. **トースト通知（Toasts）**:
   - 画面右下固定スタック。サーフェス `#18181B`、左端に成功（シアン `#00A8FF`）/ 警告（コーラル `#EB3B5A`）の2〜3pxアクセントバーを配する。
4. **データグリッド / テーブル**:
   - ゼブラ（縞模様）は禁止。行間は極細下線（`border-b border-white/[0.04]`）のみとし、ホバー行のみが `#18181B` で静かに点灯する。縦罫線は完全排除（ボーダーレス）。
5. **Disabled（非活性） & Empty（未登録）**:
   - Disabled: `opacity: 0.35`、`cursor-not-allowed`、グローやホバー効果を完全排除。
   - Empty: 派手なイラストを排し、極細点線枠（`border border-dashed border-white/10`）＋控えめなアイコン＋簡潔な1行＋アクセントカラーのアクションボタンで構成する。

### 7.5 Level 1 UI Primitive の必須利用
新規画面・UIパーツ作成時は、以下の共通Primitiveを優先して利用してください：

| コンポーネント | パス | 責務と使用箇所 |
| :--- | :--- | :--- |
| **`FloatingSurface`** | `@/components/ui/floating-surface` | パネル、ツールバー、HUD、モーダル外枠の統一ダークサーフェス（variant: `floating`, `subtle`, `solid`） |
| **`IconButton`** | `@/components/ui/icon-button` | アイコン単体ボタン（Undo/Redo、閉じる、お気に入り、ツール切替等） |
| **`ActionButton`** | `@/components/ui/action-button` | アイコン＋ラベル付きのアクションボタン（Export、保存、一括設定等） |
| **`SegmentedControl`** | `@/components/ui/segmented-control` | タブ切替、表示モード切替（Video/Image/JSON、アスペクト比選択等） |

### 7.6 クロスプラットフォーム（Edge / iOS Safari）＆パフォーマンス保護規約

1. **Microsoft Edge（Chromium / Windows）環境への配慮**:
   - **フォールバック**: Chromiumベースのため基本描画は安定しているが、WindowsのClearType環境で細線（0.07枠線）が潰れないよう、`border` のアンチエイリアス崩れを防ぐため `1px` 未満の小数は指定しないこと。
   - **スクロールバーの最適化**: Edge固有のオーバーレイスクロールバーとの干渉を防ぐため、カスタムスクロールバーは細幅（5px）に抑え、タッチパッド/ホイールのスクロール慣性を阻害しないこと。
2. **iOS Safari（WebKit）環境への厳格な配慮**:
   - **過度な `backdrop-blur` の禁止**: iOS WebKitでは複数重なった `backdrop-filter: blur(...)` がGPUメモリを圧迫し、フレームレートの急低下（ジャンク）や発熱の原因となる。ブラーはモーダル背面などの最上位レイヤー（`backdrop-blur-xs`）に限定し、キャンバス上を頻繁に動くツールチップやリストアイテムには**不透明・単色サーフェス（#18181B / #121214）を使用**すること。
   - **100vh問題の防止**: モバイル/タブレット表示時、アドレスバー伸縮によるレイアウト崩れを防ぐため、`h-screen` ではなく `h-[100dvh]`（Dynamic Viewport Height）を使用すること。
   - **セーフエリア（Safe Area Insets）**: iOSデバイスのノッチやホームインジケーターにUIが被らないよう、ヘッダー・フッター・フローティングHUDには `pb-[env(safe-area-inset-bottom)]` 等の余白を考慮すること。
   - **タップ遅延と300msディレイ排除**: `touch-action: manipulation` を適用し、ダブルタップズーム遅延を防止すること。
3. **Konvaキャンバスのパフォーマンス保護（60fps維持）**:
   - **再描画の完全隔離**: キャンバス（Konva）の再描画をDOM UIのホバー、アニメーション、ツールバーのステート変化でトリガーさせないこと（Zustandセレクタの局所化・React.memoの徹底）。
   - **GPU合成レイヤーの明示**: アニメーションするフローティングUIやトーストには `transform: translateZ(0)` または `will-change: transform` を適用し、メインスレッドの再レイアウト（Reflow）を誘発させないこと。

---

## 8. 将来の目標（未実装・段階移行ロードマップ）

以下はターゲットアーキテクチャとして計画されている概念ですが、**現時点のコードベースにはまだ該当インターフェース名としては存在しない**ため、既存コードで勝手に import してはなりません（該当リファクタリングタスクで段階的に導入します）：
- **`useTacticalUnifiedStore` の完全 Store Provider 化と `tactical-canvas-store-adapter.ts` の撤去**（是正タスクで実施）
- **`CustomEvent('footics-action')` 残存 5 ファイルの完全撤去**（是正タスクで実施）
- **ツール・オブジェクト定義の統一プラグインインターフェース化**
