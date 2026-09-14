# Zustand 5 (5.0.15) Raw Research Data & Sources

## 1. Release Overview & Official Metadata

- **Package Name**: `zustand`
- **Current Stable Version**: `5.0.15` (Released August 13, 2026)
- **Initial v5 Major Release**: `5.0.0` (Released October 14, 2024)
- **Previous Major Release**: `4.5.7` (Final maintenance release for v4 branch)
- **GitHub Repository**: [https://github.com/pmndrs/zustand](https://github.com/pmndrs/zustand)
- **Official Documentation Site**: [https://zustand.docs.pmnd.rs](https://zustand.docs.pmnd.rs)
- **Official Migration Guide (v4 to v5)**: [https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5)
- **GitHub Migration Document**: [https://github.com/pmndrs/zustand/blob/main/docs/reference/migrations/migrating-to-v5.md](https://github.com/pmndrs/zustand/blob/main/docs/reference/migrations/migrating-to-v5.md)
- **npm Registry**: [https://www.npmjs.com/package/zustand](https://www.npmjs.com/package/zustand)
- **Dependencies**: `dependencies: null` (Zero runtime dependencies)
- **Minimum Environment Requirements**:
  - **React**: `>=18.0.0` (Fully compatible with React 19)
  - **TypeScript**: `>=4.5.0`
  - **JavaScript Target**: ES2015+ (ES5 support officially dropped)
  - **Module Systems**: ESM & CJS (UMD & SystemJS support officially dropped)
- **Peer Dependencies**:
  - `react`: `">=18.0.0"` (Optional, for React hook bindings)
  - `@types/react`: `">=18.0.0"` (Optional)
  - `use-sync-external-store`: `">=1.2.0"` (Optional, only required if using `zustand/traditional`)
  - `immer`: `">=9.0.6"` (Optional, only required if using `zustand/middleware/immer`)

---

## 2. Package Structure & Subpath Entrypoints

Zustand 5 modernizes its package exports in `package.json` with dedicated entrypoints:

| Subpath Export | Purpose & Key APIs |
| :--- | :--- |
| `zustand` | Core React bindings: `create`, `useStore` |
| `zustand/vanilla` | Framework-agnostic store: `createStore`, `StoreApi`, `StateCreator`, `ExtractState` |
| `zustand/shallow` | Convenient export of both `shallow` (vanilla comparator) and `useShallow` (React hook) |
| `zustand/react/shallow` | React hook `useShallow` for shallow-equal selector memoization |
| `zustand/vanilla/shallow` | Pure vanilla JavaScript `shallow` comparator function |
| `zustand/traditional` | Backward-compatibility layer for v4-style equality functions: `createWithEqualityFn`, `useStoreWithEqualityFn` |
| `zustand/middleware` | Built-in middlewares: `persist`, `devtools`, `immer`, `combine`, `subscribeWithSelector`, `redux`, `ssrSafe` |

---

## 3. Core Architecture & API Specifications

### 3.1. Vanilla Store (`zustand/vanilla`)

A vanilla store in Zustand 5 is a lightweight, framework-agnostic observable container with only 4 core methods:

```ts
export interface StoreApi<T> {
  setState: {
    (partial: T | Partial<T> | ((state: T) => T | Partial<T>), replace?: false): void
    (state: T | ((state: T) => T), replace: true): void
  }
  getState: () => T
  getInitialState: () => T
  subscribe: (listener: (state: T, prevState: T) => void) => () => void
}
```

- **`getState()`**: Returns the current state reference synchronously.
- **`getInitialState()`**: Added natively to all stores. Returns the state at the time of store initialization. Essential for resetting stores and hydration.
- **`setState(partial, replace?)`**: Updates the store. When `replace` is omitted or `false`, it performs an `Object.assign({}, state, nextState)`. When `replace` is `true`, it requires a complete new state object.
- **`subscribe(listener)`**: Subscribes a listener that receives both `(state, prevState)`. Returns an unsubscribe cleanup function.
- **`destroy()`**: Removed in v4/v5. Subscriptions are garbage collected upon calling unsubscribe.

### 3.2. React Hook Binding (`zustand`)

Under the hood, Zustand 5 implements `useStore` directly using React 18+'s native `React.useSyncExternalStore`:

```ts
export function useStore<TState, StateSlice>(
  api: ReadonlyStoreApi<TState>,
  selector: (state: TState) => StateSlice = identity as any,
) {
  const slice = React.useSyncExternalStore(
    api.subscribe,
    React.useCallback(() => selector(api.getState()), [api, selector]),
    React.useCallback(() => selector(api.getInitialState()), [api, selector]),
  )
  React.useDebugValue(slice)
  return slice
}
```

- **Server Snapshot**: React's SSR `getServerSnapshot` argument is bound to `() => selector(api.getInitialState())`.
- **Selector Execution**: `useSyncExternalStore` uses `Object.is` to compare snapshot results between renders. If a selector returns a newly allocated object or array reference on each execution, React detects infinite changes and throws:
  `Uncaught Error: Maximum update depth exceeded.`

### 3.3. Shallow Comparator & `useShallow` Hook (`zustand/shallow`)

```ts
// zustand/react/shallow.ts
export function useShallow<S, U>(selector: (state: S) => U): (state: S) => U {
  const prev = React.useRef<U>(undefined)
  return (state) => {
    const next = selector(state)
    return shallow(prev.current, next)
      ? (prev.current as U)
      : (prev.current = next)
  }
}
```

- **Mechanism**: `useShallow` wraps your selector in a ref-backed comparator. If the computed slice is shallowly equal to the previous slice, it returns the *exact previous reference* `prev.current`.
- **Supported Structures**: Primitive values, Objects, Arrays, Maps, Sets, and Iterables.

### 3.4. Traditional API (`zustand/traditional`)

Provides the v4 behavior for applications that rely on custom `equalityFn` passed directly to `create` or `useStore`:

```ts
import { createWithEqualityFn } from 'zustand/traditional'
import { shallow } from 'zustand/shallow'

const useStore = createWithEqualityFn(
  (set) => ({ count: 0, text: 'hello' }),
  shallow // default equality function
)
```

Requires `use-sync-external-store` as a peer dependency because it relies on `use-sync-external-store/shim/with-selector`.

---

## 4. Middleware Ecosystem

### 4.1. `persist` Middleware (`zustand/middleware`)

Persists store state to Web Storage (e.g. `localStorage`, `sessionStorage`, IndexedDB, or custom storage).

- **Interface**:
  ```ts
  interface PersistOptions<S, PersistedState = S> {
    name: string
    storage?: PersistStorage<PersistedState>
    partialize?: (state: S) => PersistedState
    onRehydrateStorage?: (state: S) => ((state?: S, error?: unknown) => void) | void
    version?: number
    migrate?: (persistedState: unknown, version: number) => PersistedState | Promise<PersistedState>
    merge?: (persistedState: unknown, currentState: S) => S
    skipHydration?: boolean
  }
  ```
- **Attached Store Methods**:
  - `store.persist.hasHydrated()`: Returns boolean indicating if storage has rehydrated.
  - `store.persist.rehydrate()`: Manually trigger rehydration (crucial when `skipHydration: true`).
  - `store.persist.clearStorage()`: Clears the persisted storage entry.
  - `store.persist.onHydrate(listener)`: Subscribes to start of hydration.
  - `store.persist.onFinishHydration(listener)`: Subscribes to hydration completion.
  - `store.persist.setOptions(options)`: Dynamically updates persist options.

### 4.2. `devtools` Middleware (`zustand/middleware`)

Integrates with Redux DevTools extension for time-travel debugging and action dispatch inspection.

- **Options**: `name`, `anonymousActionType`, `store`, `enabled`.
- **New Feature in v5.0.5**: Added `devtools.cleanup()` to unmount devtools connections cleanly during tests or SPA lifecycle teardown.

### 4.3. `immer` Middleware (`zustand/middleware`)

Allows writing mutable state updates via Immer drafts:

```ts
import { immer } from 'zustand/middleware/immer'

const useStore = create(
  immer((set) => ({
    nested: { count: 0 },
    inc: () => set((state) => { state.nested.count += 1 }),
  }))
)
```

### 4.4. `subscribeWithSelector` Middleware (`zustand/middleware`)

Adds enhanced `subscribe` capabilities to the store, allowing subscriptions outside React to specific slices:

```ts
useStore.subscribe(
  (state) => state.count,
  (count, prevCount) => console.log('Count changed:', count, prevCount),
  { equalityFn: Object.is, fireImmediately: false }
)
```

### 4.5. `combine` Middleware (`zustand/middleware`)

Concatenates initial state object with actions function, enabling automatic TypeScript inference without manually writing state interfaces:

```ts
const useStore = create(
  combine({ count: 0 }, (set) => ({
    inc: () => set((s) => ({ count: s.count + 1 })),
  }))
)
```

### 4.6. `ssrSafe` Experimental Middleware (`zustand/middleware/ssrSafe`)

Added in `v5.0.9`. Throws a descriptive error if server code accidentally calls `setState` during Server-Side Rendering (SSR), protecting against cross-request state pollution.

---

## 5. Key Breaking Changes: Migrating from v4 to v5

1. **Default Exports Dropped**:
   - v4: `import create from 'zustand'`
   - v5: `import { create } from 'zustand'`
2. **Custom Equality Functions Removed from `create`**:
   - v4: `const useStore = create(stateCreator, shallow)` or `useStore(selector, shallow)`
   - v5: Use `useShallow` hook: `useStore(useShallow(selector))` or use `createWithEqualityFn` from `zustand/traditional`.
3. **Selector Reference Stability (Strict `useSyncExternalStore`)**:
   - v4: Allowed returning new inline arrays/objects in some setups without error.
   - v5: Returning unstable object or array references triggers React infinite loops (`Maximum update depth exceeded`). Selectors must return primitives, cached references, or be wrapped in `useShallow`.
4. **Stricter Types for `replace: true`**:
   - v4: `store.setState({}, true)` was accepted even if properties were missing.
   - v5: Overloads distinguish `replace: false` (allows `Partial<T>`) and `replace: true` (requires full `T`).
5. **`persist` Middleware Initialization Change**:
   - v4: Stored the initial state in localStorage automatically upon store creation.
   - v5: No longer writes the initial state on creation; only writes on explicit state mutations (`setState`).
6. **`use-sync-external-store` as Peer Dependency**:
   - v4: Bundled or required as a direct dependency.
   - v5: Pure React 18+ uses native `React.useSyncExternalStore`. Peer dependency only needed for `zustand/traditional`.
7. **Environment & Bundle Cleanups**:
   - Dropped ES5 code generation.
   - Dropped UMD and SystemJS builds.
   - Dropped deprecated `destroy()` store method.

---

## 6. Complete Release Changelog: v5.0.0 through v5.0.15

| Version | Published Date | Key Changes & Highlights |
| :--- | :--- | :--- |
| **v5.0.15** | 2026-08-13 | **fix(devtools)**: Correct V8 stack regex when source path contains spaces (PR #3531).<br>**fix(persist)**: `clearStorage()` now properly invalidates concurrent async rehydration (PR #3555). |
| **v5.0.14** | 2026-05-28 | **fix(devtools)**: Improved type inference for Devtools initializer (PR #3511). |
| **v5.0.13** | 2026-05-05 | **fix(devtools)**: Support Firefox and Safari stack traces in `findCallerName` (PR #3469).<br>**refactor(devtools)**: Removed duplicate module augmentation (PR #3443). |
| **v5.0.12** | 2026-03-16 | **fix(persist)**: Use latest state in post-rehydration callback (PR #3391).<br>**fix(devtools)**: Correct Redux devtools config type extension (PR #3414). |
| **v5.0.11** | 2026-02-01 | **fix(persist)**: Avoid relying on global `localStorage` in SSR environments (PR #3367).<br>**fix(immer)**: Proper typing for Immer middleware in combination with the Slices pattern (PR #3371).<br>**chore**: Improved typing in Devtools middleware (PR #3362). |
| **v5.0.10** | 2026-01-12 | **fix(persist)**: Prevent race conditions during concurrent `rehydrate` calls (PR #3336). |
| **v5.0.9** | 2025-11-30 | **feat(experimental)**: Introduce `unstable_ssrSafe` middleware for Next.js SSR guard (PR #3308, Discussion #2740). |
| **v5.0.8** | 2025-08-19 | **fix(shallow)**: Proper comparison when value is `undefined` (PR #3205).<br>**feat(persist)**: Return storage promise from `setState` (PR #3206). |
| **v5.0.7** | 2025-07-31 | **fix(react)**: Wrap `getSnapshot` in `useCallback` for optimization in edge cases (PR #3192). |
| **v5.0.6** | 2025-06-26 | **fix(devtools)**: Avoid inferring action type when explicit action name is passed (PR #3147).<br>**refactor(middleware)**: Replaced `export *` with explicit named and type exports (PR #3151). |
| **v5.0.5** | 2025-05-21 | **feat**: Added `devtools.cleanup()` method (PR #3111).<br>**feat(vanilla)**: Updated shallow compare function and test coverage (PR #3108).<br>**feat(devtools)**: Inferred action type support (PR #2987).<br>**refactor**: Removed unnecessary type assertion in `createJSONStorage` (PR #3113). |
| **v5.0.4** | 2025-05-01 | **fix(package)**: Fixed `react-native` condition in export map (PR #3087).<br>**refactor(traditional)**: Removed duplicated `ExtractState` type declaration (PR #2982). |
| **v5.0.3** | 2025-01-07 | **feat(types)**: Made `ExtractState` utility publicly exported from `zustand` (PR #2935).<br>**fix(build)**: Fixed rollup alias entries (PR #2942). |
| **v5.0.2** | 2024-12-04 | **fix(persist)**: Fixed async `migrate` handling on persist middleware (PR #2877).<br>**fix(middleware)**: Resolved Devtools type error #2700 (PR #2875). |
| **v5.0.1** | 2024-10-30 | **fix(shallow)**: Fallback map-like iterator comparison & order-insensitive key comparison for iterables (PR #2795, #2821). |
| **v5.0.0** | 2024-10-14 | **Major Release**: React 18 minimum, TypeScript 4.5 minimum, zero-dependencies core, dropped default exports, dropped custom equality in `create`, dropped ES5/UMD/SystemJS. |

---

## 7. Primary Documentation & Community Sources

- **Official Guides**:
  - Slices Pattern: [https://zustand.docs.pmnd.rs/learn/guides/slices-pattern](https://zustand.docs.pmnd.rs/learn/guides/slices-pattern)
  - Prevent Rerenders with `useShallow`: [https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow](https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow)
  - TypeScript Guide (Beginner & Advanced): [https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript](https://zustand.docs.pmnd.rs/learn/guides/advanced-typescript)
  - Setup with Next.js & SSR: [https://zustand.docs.pmnd.rs/learn/guides/nextjs](https://zustand.docs.pmnd.rs/learn/guides/nextjs)
  - Resetting State: [https://zustand.docs.pmnd.rs/learn/guides/how-to-reset-state](https://zustand.docs.pmnd.rs/learn/guides/how-to-reset-state)
  - Testing (Jest & Vitest): [https://zustand.docs.pmnd.rs/learn/guides/testing](https://zustand.docs.pmnd.rs/learn/guides/testing)
  - Auto Generating Selectors: [https://zustand.docs.pmnd.rs/learn/guides/auto-generating-selectors](https://zustand.docs.pmnd.rs/learn/guides/auto-generating-selectors)
- **Authoritative Community Articles & Technical Discussions**:
  - TkDodo: *Working with Zustand* ([https://tkdodo.eu/blog/working-with-zustand](https://tkdodo.eu/blog/working-with-zustand))
  - TkDodo: *Zustand and React Context* ([https://tkdodo.eu/blog/zustand-and-react-context](https://tkdodo.eu/blog/zustand-and-react-context))
  - Dai Shi (Author): Discussion on SSR and Next.js Store Lifecycle ([https://github.com/pmndrs/zustand/discussions/2740](https://github.com/pmndrs/zustand/discussions/2740))
  - Pull Requests on Migration: [#2138](https://github.com/pmndrs/zustand/pull/2138), [#2580](https://github.com/pmndrs/zustand/pull/2580)
