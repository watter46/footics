# Zustand 5 Best Practices & Anti-Patterns

This guide provides actionable best practices and anti-patterns for applications built with **Zustand 5 (5.0.15)** in modern React 18 and React 19 environments.

---

## 1. Selector Stability & React 18/19 Rendering Performance

### Rule 1.1: Always Wrap Multi-Property or Computed Selectors in `useShallow`

**Why**: Zustand 5 relies directly on `React.useSyncExternalStore`, which compares successive snapshot values with strict referential equality (`Object.is`). If a selector creates a new object or array reference on every call, React encounters an infinite loop and throws: `Maximum update depth exceeded`. Wrapping the selector in `useShallow` ensures referential stability whenever the shallow contents are equal.

#### ❌ Anti-Pattern (Returning inline objects or arrays without shallow equality)
```tsx
import { useBearStore } from '@/stores/bear-store'

function BearSummary() {
  // ❌ Throws infinite loop error in Zustand 5 / React 18+!
  // A new object reference is created on every selector invocation.
  const { bears, honey } = useBearStore((state) => ({
    bears: state.bears,
    honey: state.honey,
  }))

  // ❌ Array literals also produce new references on every evaluation!
  const [fish, bees] = useBearStore((state) => [state.fish, state.bees])

  return <div>{bears} bears eating {honey} jars of honey with {fish} fish</div>
}
```

#### ✅ Best Practice (Wrapped in `useShallow`)
```tsx
import { useShallow } from 'zustand/react/shallow'
import { useBearStore } from '@/stores/bear-store'

function BearSummary() {
  // ✅ Returns the same cached object reference when bears and honey haven't changed
  const { bears, honey } = useBearStore(
    useShallow((state) => ({
      bears: state.bears,
      honey: state.honey,
    }))
  )

  // ✅ Arrays are also kept referentially stable with useShallow
  const [fish, bees] = useBearStore(
    useShallow((state) => [state.fish, state.bees])
  )

  return <div>{bears} bears eating {honey} jars of honey with {fish} fish</div>
}
```

---

### Rule 1.2: Prefer Atomic Selectors Over Combined Object Selectors

**Why**: Atomic selectors subscribe only to the exact primitive or reference needed. They avoid object allocation, eliminate the need for `useShallow`, and make component dependencies completely clear.

#### ❌ Anti-Pattern (Aggregating unrelated state properties into one selector)
```tsx
function HeaderCounter() {
  // ❌ Subscribes to changes in both bears, fish, and honey even if only bears is rendered here
  const { bears } = useBearStore(
    useShallow((state) => ({
      bears: state.bears,
      fish: state.fish,
      honey: state.honey,
    }))
  )

  return <span>Bears: {bears}</span>
}
```

#### ✅ Best Practice (Atomic primitive selectors)
```tsx
function HeaderCounter() {
  // ✅ Subscribes ONLY to primitive state.bears; zero rerenders when fish or honey change
  const bears = useBearStore((state) => state.bears)

  return <span>Bears: {bears}</span>
}
```

---

### Rule 1.3: Never Define Fallback Closures or Functions Inside Selectors

**Why**: An inline fallback function `state.callback ?? (() => {})` allocates a fresh function instance whenever the selector runs. Because `Object.is(fn1, fn2) === false`, this causes an infinite re-render loop in `useSyncExternalStore`.

#### ❌ Anti-Pattern (Inline function fallback)
```tsx
function ActionButton() {
  // ❌ Returns a brand new function reference on every call, triggering infinite re-renders!
  const onSave = useBearStore((state) => state.onSave ?? (() => {}))

  return <button onClick={onSave}>Save</button>
}
```

#### ✅ Best Practice (Module-scoped static fallback)
```tsx
const NOOP = () => {}

function ActionButton() {
  // ✅ References the immutable module-level NOOP singleton
  const onSave = useBearStore((state) => state.onSave ?? NOOP)

  return <button onClick={onSave}>Save</button>
}
```

---

### Rule 1.4: Never Call `useStore()` Without a Selector

**Why**: Invoking `useStore()` without passing a selector causes the component to subscribe to the entire store state. Any mutation to *any* property anywhere in the store triggers an unavoidable re-render of that component.

#### ❌ Anti-Pattern (Subscribing to whole store)
```tsx
function BearCount() {
  // ❌ Subscribes to the ENTIRE store! Rerenders on any mutation (e.g. fish, honey, auth, ui)
  const store = useBearStore()

  return <div>{store.bears}</div>
}
```

#### ✅ Best Practice (Export individual custom hooks or use auto-generated selectors)
```tsx
// @/stores/bear-store.ts
const useBearStoreBase = create<BearState>()((set) => ({
  bears: 0,
  fish: 0,
  increaseBears: () => set((s) => ({ bears: s.bears + 1 })),
}))

// Option A: Explicit custom hooks (TkDodo pattern)
export const useBears = () => useBearStoreBase((s) => s.bears)
export const useIncreaseBears = () => useBearStoreBase((s) => s.increaseBears)

// Option B: Auto-generated selectors helper
type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never

export const createSelectors = <S extends UseBoundStore<StoreApi<object>>>(_store: S) => {
  const store = _store as WithSelectors<typeof _store>
  store.use = {}
  for (const k of Object.keys(store.getState())) {
    ;(store.use as any)[k] = () => store((s) => s[k as keyof typeof s])
  }
  return store
}

export const useBearStore = createSelectors(useBearStoreBase)

// In components:
// const bears = useBearStore.use.bears()
```

---

## 2. Store Design & State Architecture

### Rule 2.1: Separate Static Actions from Dynamic State

**Why**: Actions in Zustand are typically static functions whose identity never changes. Subscribing to actions together with state in an unmemoized selector can cause unnecessary component renders. Separating actions or grouping them in an `actions` object provides clean separation and ergonomic consumption.

#### ❌ Anti-Pattern (Selecting action alongside frequently updated state)
```tsx
function CounterControls() {
  // ❌ If written without useShallow, this triggers an infinite loop;
  // even with useShallow, re-running the selector is unnecessary for static actions.
  const { increment, decrement } = useCounterStore((state) => ({
    increment: state.increment,
    decrement: state.decrement,
  }))

  return (
    <div>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  )
}
```

#### ✅ Best Practice (Grouped static actions or external actions)
```tsx
// Pattern A: Grouped actions object inside the store
interface CounterState {
  count: number
  actions: {
    increment: () => void
    decrement: () => void
  }
}

export const useCounterStore = create<CounterState>()((set) => ({
  count: 0,
  actions: {
    increment: () => set((s) => ({ count: s.count + 1 })),
    decrement: () => set((s) => ({ count: s.count - 1 })),
  },
}))

// Action hook never triggers a re-render because `actions` is an unchanging reference
export const useCounterActions = () => useCounterStore((s) => s.actions)

// Pattern B: Actions defined at module level outside the store
export const increment = () =>
  useCounterStore.setState((s) => ({ count: s.count + 1 }))
export const decrement = () =>
  useCounterStore.setState((s) => ({ count: s.count - 1 }))
```

---

### Rule 2.2: Model Actions as Semantic Domain Events, Not Generic Setters

**Why**: Simple setters (`setCount`, `setName`, `setData`) scatter business logic across UI components. Modeling actions as high-level domain events (`cartItemAdded`, `filterApplied`, `checkoutCompleted`) encapsulates validation and state transitions in the store where they belong.

#### ❌ Anti-Pattern (Exposing raw setters and assembling logic in components)
```tsx
// Store only exposes raw setters
const useCartStore = create((set) => ({
  items: [],
  total: 0,
  setItems: (items) => set({ items }),
  setTotal: (total) => set({ total }),
}))

// Component must calculate business logic and synchronize multiple fields
function ProductItem({ product }) {
  const { items, total, setItems, setTotal } = useCartStore()

  const handleAdd = () => {
    const updatedItems = [...items, product]
    setItems(updatedItems)
    setTotal(total + product.price) // ❌ Prone to desync and bugs
  }
}
```

#### ✅ Best Practice (Encapsulated domain actions)
```tsx
interface CartState {
  items: Product[]
  total: number
  addItem: (product: Product) => void
}

export const useCartStore = create<CartState>()((set) => ({
  items: [],
  total: 0,
  addItem: (product) =>
    set((state) => ({
      items: [...state.items, product],
      total: state.total + product.price,
    })),
}))
```

---

### Rule 2.3: Keep Store Scope Limited to Client/UI State

**Why**: Zustand is designed for client-side state (dialogs, sidebars, filter inputs, canvas tools, active selections). Storing async server data (API responses, cache invalidation, pagination) in Zustand leads to duplicated fetching logic, race conditions, and lack of automatic garbage collection.

#### ❌ Anti-Pattern (Using Zustand as a custom server-cache layer)
```tsx
// ❌ Reinventing TanStack Query / SWR poorly
const useUserStore = create((set) => ({
  users: [],
  isLoading: false,
  error: null,
  fetchUsers: async () => {
    set({ isLoading: true, error: null })
    try {
      const res = await fetch('/api/users')
      set({ users: await res.json(), isLoading: false })
    } catch (e: any) {
      set({ error: e.message, isLoading: false })
    }
  },
}))
```

#### ✅ Best Practice (TanStack Query for server data, Zustand for client state)
```tsx
// Server State (handled by TanStack Query)
const { data: users, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
})

// Client UI State (handled by Zustand)
export const useUserFilterStore = create<FilterState>()((set) => ({
  selectedRole: 'all',
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedRole: (role) => set({ selectedRole: role }),
}))
```

---

### Rule 2.4: Use the Slices Pattern for Large Stores; Apply Middleware Only at the Root Store

**Why**: Dividing a monolithic store into slices keeps code maintainable. However, applying middleware (such as `persist` or `devtools`) inside individual slices creates broken internal wrappers. Middlewares must be wrapped around the final combined bounded store.

#### ❌ Anti-Pattern (Applying middleware inside individual slices)
```tsx
// ❌ Do NOT wrap individual slices in middleware!
const createAuthSlice = persist<AuthSlice>(
  (set) => ({
    user: null,
    login: (user) => set({ user }),
  }),
  { name: 'auth-slice' }
)
```

#### ✅ Best Practice (Clean slices combined in a single root store)
```tsx
import { create, StateCreator } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// 1. Slice definitions
export interface UserSlice {
  user: string | null
  setUser: (user: string | null) => void
}

export interface SettingsSlice {
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

export type RootStore = UserSlice & SettingsSlice

// 2. Slice creators (typed with StateCreator)
export const createUserSlice: StateCreator<
  RootStore,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  UserSlice
> = (set) => ({
  user: null,
  setUser: (user) => set({ user }),
})

export const createSettingsSlice: StateCreator<
  RootStore,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  SettingsSlice
> = (set) => ({
  theme: 'light',
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
})

// 3. Middlewares applied ONLY to the root combined store
export const useRootStore = create<RootStore>()(
  devtools(
    persist(
      (...a) => ({
        ...createUserSlice(...a),
        ...createSettingsSlice(...a),
      }),
      { name: 'app-root-storage' }
    )
  )
)
```

---

## 3. TypeScript Patterns & Best Practices

### Rule 3.1: Always Use the Curried `create<T>()(...)` Syntax

**Why**: Zustand's type system uses currying to separate the state generic `T` from middleware mutator types. Writing `create<T>((set) => ...)` (without the intermediate call `()`) turns the generic into a type assertion that bypasses middleware inference and breaks TypeScript autocompletion.

#### ❌ Anti-Pattern (Uncurried type definition)
```tsx
interface StoreState {
  count: number
  increment: () => void
}

// ❌ Uncurried: acts as an assertion; loses middleware mutator types
const useStore = create<StoreState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}))
```

#### ✅ Best Practice (Curried type definition)
```tsx
// ✅ Correct: create<T>()(...)
const useStore = create<StoreState>()((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}))
```

---

### Rule 3.2: Use `ExtractState<typeof useStore>` for Types

**Why**: In v5.0.3+, `ExtractState` is publicly exported from `zustand`. This utility safely extracts the full state and action types from any store without needing manual duplicate interface definitions.

#### ✅ Best Practice
```tsx
import { create, type ExtractState } from 'zustand'

export const useAppStore = create((set) => ({
  theme: 'dark',
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))

// Automatically extracts { theme: string; sidebarOpen: boolean; toggleSidebar: () => void; }
export type AppState = ExtractState<typeof useAppStore>

// Excellent for tests and utility functions
function logAppState(state: AppState) {
  console.log('Sidebar state:', state.sidebarOpen)
}
```

---

### Rule 3.3: Handle Dynamic `replace` Flags with `Parameters<typeof store.setState>`

**Why**: In Zustand 5, `setState` has strict overloads:
- `setState(partial: Partial<T>, replace?: false)`
- `setState(state: T, replace: true)`
If `replace` is a boolean variable calculated at runtime (e.g., `const shouldReplace = check()`), TypeScript cannot infer which overload is matched and throws an error.

#### ❌ Anti-Pattern (Passing dynamic boolean directly as second argument)
```ts
const shouldReplace = Math.random() > 0.5
// ❌ TypeScript Error in v5: Overload resolution failed!
store.setState({ count: 10 }, shouldReplace)
```

#### ✅ Best Practice (Tuple casting with Parameters helper)
```ts
const shouldReplace = Math.random() > 0.5

const args = [{ count: 10 }, shouldReplace] as Parameters<
  typeof store.setState
>
store.setState(...args)
```

---

## 4. Middleware Stacking & Ordering

### Rule 4.1: Maintain Strict Middleware Order: `devtools(persist(immer(...)))`

**Why**:
1. **`devtools` (Outermost)**: Must observe state changes produced by all other middlewares (including initial hydration from `persist` and mutations from `immer`).
2. **`persist` (Middle)**: Manages serializing and saving finalized immutable states.
3. **`immer` (Innermost)**: Must wrap the state creator function directly so that `set` receives an Immer draft rather than raw objects.

#### ❌ Anti-Pattern (Arbitrary middleware order)
```tsx
// ❌ Placing devtools inside persist prevents DevTools from inspecting rehydration events
const useStore = create(
  persist(
    devtools(
      (set) => ({ ... })
    ),
    { name: 'broken-store' }
  )
)
```

#### ✅ Best Practice (Standard middleware hierarchy)
```tsx
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface StoreState {
  todos: { id: string; text: string; done: boolean }[]
  addTodo: (text: string) => void
}

export const useTodoStore = create<StoreState>()(
  devtools(
    persist(
      immer((set) => ({
        todos: [],
        addTodo: (text) =>
          set((state) => {
            state.todos.push({ id: crypto.randomUUID(), text, done: false })
          }),
      })),
      { name: 'todo-storage' }
    ),
    { name: 'TodoStore' }
  )
)
```

---

### Rule 4.2: Always Use `createJSONStorage` and Guard Against SSR Storage Absence

**Why**: Referencing `window.localStorage` directly causes `ReferenceError: window is not defined` during SSR. `createJSONStorage` includes built-in exception handling for environments where storage is unavailable.

#### ❌ Anti-Pattern (Direct localStorage reference)
```tsx
// ❌ Throws ReferenceError on server during SSR!
const useStore = create(
  persist((set) => ({ count: 0 }), {
    name: 'counter',
    storage: window.localStorage as any,
  })
)
```

#### ✅ Best Practice (Using `createJSONStorage`)
```tsx
import { createJSONStorage, persist } from 'zustand/middleware'

export const useStore = create(
  persist((set) => ({ count: 0 }), {
    name: 'counter',
    storage: createJSONStorage(() => localStorage),
  })
)
```

---

## 5. Next.js, SSR, and Hydration

### Rule 5.1: In SSR / Next.js, NEVER Use Global Singleton Stores; Use Per-Request Stores via React Context

**Why**: In Next.js (App Router or Pages Router), a NodeJS server process handles multiple concurrent user requests. If a store is defined as a global module-level variable (`export const useStore = create(...)`), state is shared across all incoming requests, leaking user data and causing critical cross-request pollution.

#### ❌ Anti-Pattern (Global singleton in SSR / Next.js)
```tsx
// ❌ Dangerous in SSR! Shared across all incoming server requests and users
// src/stores/user-store.ts
export const useUserStore = create<UserState>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))
```

#### ✅ Best Practice (Vanilla store creator + React Context Provider)
```tsx
// 1. src/stores/counter-store.ts (Framework-agnostic store factory)
import { createStore } from 'zustand/vanilla'

export interface CounterState {
  count: number
  increment: () => void
}

export const createCounterStore = (initState: { count: number } = { count: 0 }) => {
  return createStore<CounterState>()((set) => ({
    count: initState.count,
    increment: () => set((state) => ({ count: state.count + 1 })),
  }))
}

export type CounterStoreApi = ReturnType<typeof createCounterStore>
```

```tsx
// 2. src/providers/counter-store-provider.tsx
'use client'

import { type ReactNode, createContext, useRef, useContext } from 'react'
import { useStore } from 'zustand'
import {
  type CounterState,
  type CounterStoreApi,
  createCounterStore,
} from '@/stores/counter-store'

export const CounterStoreContext = createContext<CounterStoreApi | null>(null)

export function CounterStoreProvider({
  children,
  initialCount = 0,
}: {
  children: ReactNode
  initialCount?: number
}) {
  // ✅ useRef ensures the store instance is created exactly once per component tree / request
  const storeRef = useRef<CounterStoreApi>(null)
  if (!storeRef.current) {
    storeRef.current = createCounterStore({ count: initialCount })
  }

  return (
    <CounterStoreContext.Provider value={storeRef.current}>
      {children}
    </CounterStoreContext.Provider>
  )
}

export function useCounter<T>(selector: (state: CounterState) => T): T {
  const store = useContext(CounterStoreContext)
  if (!store) {
    throw new Error('useCounter must be used within CounterStoreProvider')
  }
  return useStore(store, selector)
}
```

---

### Rule 5.2: Never Read or Write Zustand Stores in React Server Components (RSCs)

**Why**: React Server Components execute solely on the server, cannot use React hooks or Context, and are intended to be stateless rendering pipelines. Attempting to consume Zustand in RSCs violates Next.js architecture and produces hydration errors.

#### ❌ Anti-Pattern (Calling Zustand in a Server Component)
```tsx
// app/dashboard/page.tsx (Server Component)
import { useStore } from '@/stores/useStore'

export default function DashboardPage() {
  // ❌ Crash: React hooks cannot be used in Server Components!
  const user = useStore((s) => s.user)
  return <div>Welcome {user}</div>
}
```

#### ✅ Best Practice (Keep stores in Client Components marked `'use client'`)
```tsx
// app/dashboard/dashboard-content.tsx
'use client'

import { useCounter } from '@/providers/counter-store-provider'

export function DashboardContent() {
  const count = useCounter((s) => s.count)
  return <div>Count: {count}</div>
}
```

---

### Rule 5.3: Avoid Hydration Mismatches with Persisted Stores

**Why**: Server-rendered HTML uses the default initial state (`count: 0`). When the client mounts, `persist` reads from `localStorage` (`count: 42`). If the component immediately renders `42`, React throws a hydration mismatch warning (`Text content does not match server-rendered HTML`).

#### ❌ Anti-Pattern (Direct rendering of persisted state without hydration guard)
```tsx
function BadPersistedComponent() {
  // ❌ Causes hydration mismatch between SSR (initial state) and Client (localStorage state)
  const theme = useThemeStore((s) => s.theme)
  return <div className={`theme-${theme}`}>Content</div>
}
```

#### ✅ Best Practice (Using `hasHydrated` or `skipHydration: true`)
```tsx
import { useState, useEffect } from 'react'
import { useThemeStore } from '@/stores/theme-store'

export function SafePersistedComponent() {
  const [hydrated, setHydrated] = useState(false)
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    // Note: or use useThemeStore.persist.hasHydrated()
    setHydrated(true)
  }, [])

  if (!hydrated) {
    // Render skeleton or fallback matching server HTML
    return <div className="theme-light">Loading...</div>
  }

  return <div className={`theme-${theme}`}>Content</div>
}
```

---

### Rule 5.4: Use Experimental `ssrSafe` Middleware for SSR Mutation Safety

**Why**: Added in Zustand `v5.0.9`, `ssrSafe` detects if code attempts to call `setState` during Server-Side Rendering (where state mutations are prohibited) and throws an explicit error.

#### ✅ Best Practice
```tsx
import { create } from 'zustand'
import { ssrSafe } from 'zustand/middleware/ssrSafe'

export const useStore = create(
  ssrSafe((set) => ({
    count: 0,
    increment: () => set((s) => ({ count: s.count + 1 })),
  }))
)
```

---

## 6. Resetting State & Testing

### Rule 6.1: Reset Stores using `store.getInitialState()`

**Why**: In Zustand 5, all stores provide `store.getInitialState()` out of the box. Hardcoding initial values in a reset action leads to duplicate code and maintenance oversights.

#### ❌ Anti-Pattern (Hardcoded duplicate initial state in reset action)
```tsx
const useFilterStore = create((set) => ({
  search: '',
  category: 'all',
  page: 1,
  // ❌ Duplicate values must be manually maintained if defaults change
  reset: () => set({ search: '', category: 'all', page: 1 }),
}))
```

#### ✅ Best Practice (Using `getInitialState`)
```tsx
interface FilterState {
  search: string
  category: string
  page: number
  reset: () => void
}

export const useFilterStore = create<FilterState>()((set, _get, store) => ({
  search: '',
  category: 'all',
  page: 1,
  reset: () => set(store.getInitialState()),
}))
```

---

### Rule 6.2: Reset Stores Between Tests in Vitest & Jest

**Why**: Global stores retain their state across multiple test runs in the same test process. Without resetting, test state leaks, causing flaky and order-dependent tests.

#### ✅ Best Practice (Universal Mock Setup for Vitest / Jest)

```ts
// __mocks__/zustand.ts (Place in project root or test setup)
import { act } from '@testing-library/react'
import type * as ZustandTypes from 'zustand'
export * from 'zustand'

const { create: actualCreate, createStore: actualCreateStore } =
  await vi.importActual<typeof ZustandTypes>('zustand')

export const storeResetFns = new Set<() => void>()

const createUncurried = <T>(stateCreator: ZustandTypes.StateCreator<T>) => {
  const store = actualCreate(stateCreator)
  const initialState = store.getInitialState()
  storeResetFns.add(() => {
    store.setState(initialState, true)
  })
  return store
}

export const create = (<T>(stateCreator: ZustandTypes.StateCreator<T>) => {
  return typeof stateCreator === 'function'
    ? createUncurried(stateCreator)
    : createUncurried
}) as typeof ZustandTypes.create

// Reset all stores after every single test
afterEach(() => {
  act(() => {
    storeResetFns.forEach((resetFn) => resetFn())
  })
})
```

---

## 7. Migration Quick-Check: Upgrading v4 to v5

| v4 Pattern | v5 Replacement |
| :--- | :--- |
| `import create from 'zustand'` | `import { create } from 'zustand'` |
| `useStore(s => ({ a: s.a, b: s.b }), shallow)` | `useStore(useShallow(s => ({ a: s.a, b: s.b })))` |
| `create(creator, shallow)` | `createWithEqualityFn(creator, shallow)` from `zustand/traditional` |
| `store.setState({}, true)` | `store.setState(fullState, true)` (type-enforced) |
| Initial state saved in storage automatically | Must explicitly call `setState` to persist initial state |
| `store.destroy()` | Subscriptions cleaned up via unsubscribe callback returned by `subscribe` |
| React 17 / ES5 support | React 18+ and ES2015+ required |
