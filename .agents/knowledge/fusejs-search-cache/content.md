# Fuse.js ラベル検索とキャッシュ機構 (Fuzzy Search Cache)

## 概要
Event Memo 機能などにおけるサジェスト（自動補完）で、`Fuse.js` を用いた曖昧検索（Fuzzy Search）を高速かつ安全に実行するためのキャッシュ・インスタンス管理の制約です。

## 厳守すべき制約 (Constraints)

1. **インスタンスの再利用とキャッシュ**
   - 検索関数（例: `filterSuggestions`）が呼ばれるたびに `new Fuse(...)` を実行してはいけません。再レンダリングや文字入力のたびに大量のオブジェクトが生成され、パフォーマンスが著しく低下します。
   - コンポーネント外（または Custom Hook 内の `useMemo`/`useRef`）に `fuseInstance` をキャッシュし、**検索対象のリストの参照が変更された場合のみ**インスタンスを再生成してください。
   - 実装例 (`memoOverlayLogic.ts`):
     ```typescript
     let fuseInstance: Fuse<FlattenedEvent> | null = null;
     let lastFlattenedEvents: FlattenedEvent[] | null = null;

     export function filterSuggestions(query: string, items: FlattenedEvent[]) {
       if (!fuseInstance || lastFlattenedEvents !== items) {
         fuseInstance = new Fuse(items, { keys: ['label', 'keywords'], threshold: 0.35 });
         lastFlattenedEvents = items;
       }
       return fuseInstance.search(query).map(r => r.item);
     }
     ```

2. **単純なフィルタへの先祖返りの禁止**
   - イベントのラベル等に対するサジェストにおいて、`items.filter(item => item.label.includes(query))` のような厳密一致（Exact Match）のコードに戻さないでください。高速な入力（タイプミス）に対応できなくなります。

3. **Fuse オプションの標準設定**
   - 日本語などの曖昧検索を考慮し、`threshold` は `0.35` 程度を基本とします。
   - `keys` には表示用の `label` だけでなく、検索用の `keywords` 等を含めて柔軟な検索を可能にします。
