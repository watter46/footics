In 2026, the best practice for building local-first applications with **Dexie.js v4** and **Zustand** is to treat the local database as the **single source of truth**. This eliminates the need for traditional "loading" and "error" states associated with network requests.

### Architecture: The Repository Pattern
In a local-first architecture, the Repository Pattern acts as a facade between your UI (Zustand) and your storage layer (Dexie.js).

*   **Local-First Logic**: All reads and writes must hit Dexie.js directly. The UI reacts to database changes rather than explicitly waiting for API responses.
*   **Decoupled Sync**: Do not mix network sync logic with your business logic. Treat background synchronization (e.g., pushing `synced: 0` records to your backend) as a separate, asynchronous process that occurs independently of the UI.
*   **Zustand's Role**: Use Zustand primarily for **ephemeral UI state** (e.g., current view, toggles, active filters). Avoid mirroring your entire database inside Zustand, as this creates a "split-brain" state where the UI and the database can get out of sync.

### Recommended Best Practices (2026)

#### 1. Data Reactivity with `useLiveQuery`
Instead of manually updating Zustand stores when the database changes, use Dexie’s `useLiveQuery` hook. It automatically re-renders your components when the underlying IndexedDB data changes.
*   **Why**: It keeps the UI perfectly in sync with the database with minimal boilerplate.

#### 2. Avoid Derived State in Storage
Do not store computed values (like a "total balance") in Dexie. Instead, store the raw records and compute derived values in your selectors or directly in your components/hooks.

#### 3. Transactional Integrity
Always bundle related operations (e.g., updating a record and its related items) within a `db.transaction('rw', ...)` block to ensure atomicity. If a sync operation fails, the database remains consistent locally.

#### 4. The Sync Flag Pattern
For simple custom sync implementations, include a `synced` (boolean or status) flag in your schema.
*   **Sync Engine**: Run a background `setInterval` or service worker that queries for records where `synced: 0`, pushes them to your API, and updates the flag to `1` upon success.

#### 5. Schema Migrations
Plan for schema changes early. Since users have their own local data, you cannot simply drop or reset tables. Use Dexie’s `version()` and `stores()` to manage non-breaking, additive migrations.

### Summary of Responsibilities
| Layer | Responsibility |
| :--- | :--- |
| **IndexedDB (Dexie.js)** | The Source of Truth, persistent storage, transaction management. |
| **Zustand** | Temporary UI state (modals, active tabs, theme). |
| **Repository Pattern** | Standardized CRUD methods, sync orchestration, and data transformation. |
| **Sync Engine** | Background replication, conflict resolution (if needed), network connectivity handling. |
