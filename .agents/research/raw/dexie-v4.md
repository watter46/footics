# Dexie.js v4 Research Dump

### useLiveQuery in Dexie v4
`useLiveQuery` (from `dexie-react-hooks`) remains the standard way to create reactive, auto-updating React components based on IndexedDB data. It observes the result of a promise-returning function. When the underlying database tables change, the hook automatically re-runs the query and triggers a re-render.

Basic Implementation:
```javascript
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";

export function MyComponent() {
  const items = useLiveQuery(() => db.items.toArray(), []);
  
  if (!items) return null; // Handle loading state
  return <ul>{items.map(item => <li key={item.id}>{item.title}</li>)}</ul>;
}
```

### Transactions
Dexie v4 maintains the same robust, promise-based transaction API. Transactions are essential for ensuring that multiple operations succeed or fail as a single atomic unit.
Use `db.transaction(mode, tables, scopeFunc)` to perform atomic operations. Modes: `'r'` for READONLY, `'rw'` for READWRITE.
Example:
```javascript
await db.transaction('rw', db.friends, async () => {
  const friend = await db.friends.get({ name: "David" });
  if (friend) {
    await db.friends.update(friend.id, { age: friend.age + 1 });
  }
});
```

### Migrations (Version Upgrading)
Use `db.version(n).stores(...).upgrade(trans => { ... })` to define migration logic.
Modern Migrations (Dexie 5.0+ introduces more declarative methods, but for v4 `version().upgrade()` remains the primary mechanism for structural changes and data migration).
