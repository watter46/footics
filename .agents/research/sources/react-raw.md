# React 19 (19.0.0) Raw Research Data & Sources

## 1. Release Overview & Official Metadata

- **Package Name**: `react`, `react-dom`
- **Stable Version**: `19.0.0`
- **Release Date**: December 5, 2024
- **Previous Minor / Prep Version**: `react@18.3.1` (identical to 18.2 but adds deprecation warnings for React 19)
- **Official Release Announcement**: [https://react.dev/blog/2024/12/05/react-19](https://react.dev/blog/2024/12/05/react-19)
- **Official Upgrade Guide**: [https://react.dev/blog/2024/04/25/react-19-upgrade-guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- **GitHub Release Tag**: [https://github.com/facebook/react/releases/tag/v19.0.0](https://github.com/facebook/react/releases/tag/v19.0.0)
- **Official React Documentation**: [https://react.dev](https://react.dev)
- **Codemod Repository**: [https://github.com/reactjs/react-codemod](https://github.com/reactjs/react-codemod)
- **TypeScript Codemod Repository**: [https://github.com/eps1lon/types-react-codemod](https://github.com/eps1lon/types-react-codemod)

---

## 2. Core New Features & APIs

### 2.1. Actions & Async Transitions
- **Definition**: Async functions executed within a transition (via `startTransition` or `<form action={...}>`) are classified as "Actions".
- **Capabilities**:
  - Automatically manages `isPending` state from start of request until committed state updates.
  - Automatically handles optimistic rollbacks when an action throws or rejects.
  - Automatically captures unhandled exceptions in Error Boundaries.
  - Automatically resets uncontrolled `<form>` inputs upon successful action completion.
- **Form Props Integration**: Functions can now be passed directly to `action` and `formAction` on `<form>`, `<input type="submit">`, `<input type="image">`, and `<button type="submit">`.
- **Manual Reset**: New API `requestFormReset()` added to `react-dom` to reset forms programmatically.

### 2.2. New Hooks

#### `useActionState` (renamed from Canary's `useFormState`)
- **Package**: `react`
- **Signature**: `const [state, formAction, isPending] = useActionState(fn, initialState, permalink?)`
- **Arguments**:
  - `fn`: `async (previousState, formDataOrPayload) => nextState`
  - `initialState`: Initial state before action is triggered
  - `permalink` (optional): URL string for progressive enhancement in Server Components
- **Returns**: `[state, formAction, isPending]`
  - `state`: Current return value of the action
  - `formAction`: Dispatcher function or form action handler
  - `isPending`: Boolean transition pending flag

#### `useFormStatus`
- **Package**: `react-dom`
- **Signature**: `const { pending, data, method, action } = useFormStatus()`
- **Constraint**: Must be executed in a child/descendant component rendered inside a `<form>` element. Calling it in the same component rendering `<form>` returns `pending === false` and `data === null`.
- **Properties**:
  - `pending`: Boolean indicating if parent form is submitting
  - `data`: `FormData` object containing the data being submitted (or `null`)
  - `method`: HTTP method `'get' | 'post'` (or `null`)
  - `action`: Reference to the action function passed to parent `<form>`

#### `useOptimistic`
- **Package**: `react`
- **Signature**: `const [optimisticState, setOptimistic] = useOptimistic(passthroughState, updateFn?)`
  - Optional update function: `(currentState, optimisticValue) => nextOptimisticState`
- **Behavior**:
  - Updates UI optimistically while an async Action is in flight.
  - Automatically reverts to `passthroughState` once the transition finishes (whether successful or rejected).
  - Must be invoked inside a Transition / Action.

#### `use` API
- **Package**: `react`
- **Signature**: `const value = use(resource)`
- **Supported Resources**:
  - **Promises**: React suspends the component until the promise resolves. Throws to nearest Error Boundary if rejected.
  - **Context**: Reads context value dynamically (similar to `useContext(Context)`).
- **Distinguishing Hook vs API characteristics**:
  - Unlike regular hooks, `use` can be called conditionally (e.g. inside `if` statements, after early returns, inside loops).
  - Cannot be called inside a `try...catch` block (doing so intercepts the thrown Suspense promise).
  - Promises passed to `use()` must be cached or created outside of render (e.g., from Server Components, React `cache()`, or Suspense data fetching libraries). Creating a promise directly in the render body is forbidden and produces an error.

---

### 2.3. Direct `ref` as Prop & Ref Cleanup Functions
- **Direct `ref` Prop**: Function components receive `ref` directly as a prop (`function MyInput({ ref, ...props })`).
- **`forwardRef` Deprecated**: `React.forwardRef` is deprecated and will be removed in future versions.
- **Ref Cleanups**: Ref callbacks can now return a cleanup function:
  ```jsx
  <input ref={(node) => {
    // setup
    return () => {
      // cleanup when element unmounts or ref changes
    };
  }} />
  ```
- **Breaking TS / Runtime Change**: Previously, React called ref callbacks with `null` on unmount. If a cleanup function is returned, React skips calling with `null`. Returning anything other than `void` or `() => void` is rejected by TypeScript 19.

---

### 2.4. `<Context>` as Provider
- Can now render `<ThemeContext value="dark">` directly instead of `<ThemeContext.Provider value="dark">`.
- `<ThemeContext.Provider>` is deprecated and planned for future removal.

---

### 2.5. Document Metadata Support
- React natively hoists `<title>`, `<meta>`, and `<link rel="...">` placed anywhere in the component tree into the document `<head>`.
- Fully supported in client-only SPAs, streaming SSR, and Server Components.
- Deduplication and precedence rules are managed by React.

---

### 2.6. Stylesheet and Asset Preloading
- **Stylesheet Precedence**:
  ```jsx
  <link rel="stylesheet" href="/styles.css" precedence="default" />
  <link rel="stylesheet" href="/critical.css" precedence="high" />
  ```
  React coordinates insertion order in `<head>` based on `precedence` (`default`, `high`, `reset`, etc.) and suspends client rendering until stylesheets load.
- **Async Scripts**: `<script async src="...">` rendered in components is automatically hoisted and deduplicated.
- **Preloading APIs** (`react-dom`):
  - `preload(href, options)`: Preloads fonts, styles, scripts (`<link rel="preload">`)
  - `preinit(href, options)`: Eagerly downloads and executes scripts / appends stylesheets
  - `preconnect(href)`: Preconnects to origin (`<link rel="preconnect">`)
  - `prefetchDNS(href)`: Prefetches DNS (`<link rel="dns-prefetch">`)

---

### 2.7. Static Rendering APIs (`react-dom/static`)
- New APIs for static generation / prerendering:
  - `prerender(element, options)`: Returns a Promise resolving to `{ prelude }` stream after all data/promises have resolved.
  - `prerenderToNodeStream(element, options)`: Node.js stream equivalent.
- Designed to replace `renderToString` for Static Site Generation (SSG) with full Suspense support.

---

### 2.8. React Server Components (RSC) & Server Actions
- **RSC Specification**: Stable in React 19; libraries can target `react-server` export condition.
- **Directives**:
  - `"use client"`: Marks component boundary to be sent to and hydrated on the client.
  - `"use server"`: Defines **Server Actions** (callable async RPC endpoints).
  - *Note*: There is **no** `"use server"` directive for Server Components. Server Components are the default in RSC architectures.
- **Taint APIs**:
  - `experimental_taintUniqueValue`: Prevents leaking secret strings (tokens, API keys) to client.
  - `experimental_taintObjectReference`: Prevents leaking sensitive data objects (user records, DB entities) to client.

---

## 3. Breaking Changes & Removals in 19.0.0

| Removed Feature / API | Deprecated In | Replacement in React 19 |
| :--- | :--- | :--- |
| `ReactDOM.render(element, container)` | v18.0.0 | `createRoot(container).render(element)` from `react-dom/client` |
| `ReactDOM.hydrate(element, container)` | v18.0.0 | `hydrateRoot(container, element)` from `react-dom/client` |
| `unmountComponentAtNode(container)` | v18.0.0 | `root.unmount()` |
| `ReactDOM.findDOMNode(instance)` | v16.6.0 | Use DOM `useRef()` or callback refs |
| `propTypes` on function components | v15.5.0 | TypeScript type definitions |
| `defaultProps` on function components | v18.3.0 | ES6 default parameters: `function Comp({ name = 'default' })` |
| String refs (`ref="name"`) | v16.3.0 | Callback refs or `useRef()` |
| Legacy Context (`contextTypes`, `getChildContext`) | v16.6.0 | `React.createContext()` / `use(Context)` |
| `React.createFactory(type)` | v16.13.0 | JSX syntax: `<Component />` |
| Module pattern factories (`function Comp() { return { render() {} } }`) | v16.9.0 | Standard function components |
| `react-test-renderer/shallow` | v18.0.0 | Direct `react-shallow-renderer` or `@testing-library/react` |
| `react-dom/test-utils` (except `act`) | v18.3.0 | `import { act } from 'react'`; migrate to `@testing-library/react` |
| UMD builds | v19.0.0 | ESM builds via CDN (`esm.sh`) or bundlers |
| `javascript:` URLs in `src` / `href` | v19.0.0 | Blocked by `react-dom` as security vulnerability |
| Accessing `element.ref` | v19.0.0 (deprecated) | Access `element.props.ref` |
| `forwardRef` | v19.0.0 (deprecated) | Direct `ref` prop in function component parameters |
| `<Context.Provider>` | v19.0.0 (deprecated) | Render `<Context value={...}>` directly |
| `ReactDOM.useFormState` | v19.0.0 (deprecated) | `React.useActionState` |
| `react-test-renderer` | v19.0.0 (deprecated) | `@testing-library/react` |

---

## 4. TypeScript Changes (`@types/react@^19.0.0`)

1. **`useRef` Requires Initial Argument**:
   - `useRef()` with 0 arguments is a TypeScript compile error.
   - Must supply explicit initial value: `useRef<HTMLInputElement>(null)` or `useRef<string | undefined>(undefined)`.
2. **All Refs are Mutable**:
   - `MutableRefObject` is deprecated. `useRef` always returns `RefObject<T>` where `.current` is mutable.
3. **`ReactElement['props']` Defaults to `unknown`**:
   - Previously defaulted to `any`. Unsound element prop inspection requires explicit type casts or typing.
4. **Scoped JSX Namespace**:
   - Global `JSX` namespace is replaced by `React.JSX`.
   - Augmentation must be wrapped inside `declare module "react"` (or `react/jsx-runtime`).
5. **No Implicit Returns in Ref Callbacks**:
   - Arrow functions like `ref={el => (this.el = el)}` return the DOM element, which TS rejects as an invalid cleanup function.
   - Must use curly braces: `ref={el => { this.el = el; }}`.
6. **`useReducer` Type Argument Inference**:
   - Deprecated passing full reducer type parameter `useReducer<Reducer<State, Action>>(reducer)`.
   - Best practice: let TS infer automatically, or annotate reducer function parameters directly.

---

## 5. Official Codemods & Migration Commands

```bash
# 1. Install React 19 and types
npm install --save-exact react@^19.0.0 react-dom@^19.0.0
npm install --save-exact @types/react@^19.0.0 @types/react-dom@^19.0.0

# 2. Run all React 19 core codemods
npx codemod@latest react/19/migration-recipe

# Included sub-codemods:
# - react/19/replace-reactdom-render
# - react/19/replace-string-ref
# - react/19/replace-act-import
# - react/19/replace-use-form-state
# - react/prop-types-typescript

# 3. Run TypeScript-specific codemods
npx types-react-codemod@latest preset-19 ./path-to-src

# If encountering unsound element props access:
npx types-react-codemod@latest react-element-default-any-props ./path-to-src
```

---

## 6. Primary URL Sources
- React v19 Release Notes: `https://react.dev/blog/2024/12/05/react-19`
- React 19 Upgrade Guide: `https://react.dev/blog/2024/04/25/react-19-upgrade-guide`
- React GitHub Releases: `https://github.com/facebook/react/releases/tag/v19.0.0`
- React Changelog: `https://github.com/react/react/blob/main/CHANGELOG.md#1900-december-5-2024`
- React Reference: `useActionState`: `https://react.dev/reference/react/useActionState`
- React Reference: `useFormStatus`: `https://react.dev/reference/react-dom/hooks/useFormStatus`
- React Reference: `useOptimistic`: `https://react.dev/reference/react/useOptimistic`
- React Reference: `use`: `https://react.dev/reference/react/use`
- React Reference: Resource Preloading: `https://react.dev/reference/react-dom#resource-preloading-apis`
- React Reference: Directives: `https://react.dev/reference/rsc/directives`
- React Reference: Server Actions: `https://react.dev/reference/rsc/server-actions`
- Types React Codemod: `https://github.com/eps1lon/types-react-codemod`
