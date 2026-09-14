# React 19 Best Practices & Anti-Patterns

This guide provides concrete, actionable best practices and anti-patterns for applications targeting **React 19 (19.0.0)**.

---

## 1. Actions & Form Handling

### Rule 1.1: Use Actions and `useActionState` for Async Mutations
**Why**: React 19 Actions automatically manage loading states (`isPending`), capture errors for Error Boundaries, support optimistic updates, and reset uncontrolled form fields on success. Hand-rolling these with multiple `useState` variables creates boilerplate and race conditions.

#### ❌ Anti-Pattern (React 18 style manual mutation state)
```tsx
function ProfileEditor() {
  const [name, setName] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    try {
      await updateProfile(name);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={e => setName(e.target.value)} />
      <button type="submit" disabled={isPending}>Save</button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

#### ✅ Best Practice (React 19 Actions)
```tsx
import { useActionState } from 'react';

interface FormState {
  error: string | null;
  success: boolean;
}

async function updateAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const name = formData.get('name') as string;
  const error = await updateProfile(name);
  if (error) {
    return { error, success: false };
  }
  return { error: null, success: true };
}

function ProfileEditor() {
  const [state, formAction, isPending] = useActionState(updateAction, {
    error: null,
    success: false,
  });

  return (
    <form action={formAction}>
      <input name="name" defaultValue="" />
      <button type="submit" disabled={isPending}>Save</button>
      {state.error && <p className="error">{state.error}</p>}
      {state.success && <p className="success">Updated successfully!</p>}
    </form>
  );
}
```

---

### Rule 1.2: Call `useFormStatus` Exclusively Inside Descendant Components of `<form>`
**Why**: `useFormStatus` reads status from the nearest ancestor `<form>`. Calling it in the component defining `<form>` will always return `{ pending: false, data: null }`.

#### ❌ Anti-Pattern (Calling `useFormStatus` in the parent form component)
```tsx
import { useFormStatus } from 'react-dom';

function BadForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  // ❌ BROKEN: useFormStatus cannot inspect the <form> rendered within its own return statement!
  const { pending } = useFormStatus();

  return (
    <form action={action}>
      <input name="query" />
      <button type="submit" disabled={pending}>Search</button>
    </form>
  );
}
```

#### ✅ Best Practice (Extracting submit buttons / status indicators into child components)
```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton({ label = 'Submit' }: { label?: string }) {
  // ✅ Correct: Component is rendered inside the <form>
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Saving...' : label}
    </button>
  );
}

function GoodForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action}>
      <input name="query" />
      <SubmitButton label="Search" />
    </form>
  );
}
```

---

### Rule 1.3: Use `useOptimistic` Only Inside Transitions / Actions
**Why**: Optimistic updates are scoped to the lifespan of an async transition. React automatically rolls back the optimistic state if the action errors or when the real state updates.

#### ❌ Anti-Pattern (Calling optimistic setter outside transitions)
```tsx
function TodoList({ todos, addTodo }: { todos: string[], addTodo: (text: string) => Promise<void> }) {
  const [optimisticTodos, setOptimisticTodos] = useOptimistic(todos, (state, newTodo: string) => [...state, newTodo]);

  const handleAdd = (text: string) => {
    // ❌ WRONG: setOptimisticTodos called outside a transition/action will warn or fail to reconcile.
    setOptimisticTodos(text);
    addTodo(text);
  };

  return <button onClick={() => handleAdd('New Todo')}>Add</button>;
}
```

#### ✅ Best Practice (Scoped within an Action or `startTransition`)
```tsx
import { useOptimistic, useTransition } from 'react';

function TodoList({ todos, addTodo }: { todos: string[], addTodo: (text: string) => Promise<void> }) {
  const [optimisticTodos, setOptimisticTodos] = useOptimistic(
    todos,
    (current, newTodo: string) => [...current, newTodo]
  );
  const [isPending, startTransition] = useTransition();

  const handleAction = async (formData: FormData) => {
    const text = formData.get('todo') as string;
    startTransition(async () => {
      setOptimisticTodos(text);
      await addTodo(text);
    });
  };

  return (
    <div>
      <ul>{optimisticTodos.map((t, idx) => <li key={idx}>{t}</li>)}</ul>
      <form action={handleAction}>
        <input name="todo" required />
        <button type="submit" disabled={isPending}>Add</button>
      </form>
    </div>
  );
}
```

---

## 2. Resource Reading with the `use()` API

### Rule 2.1: Never Call `use()` on Uncached Promises Created in Render
**Why**: If a promise is recreated on every render, calling `use(promise)` triggers an infinite re-render suspension loop because each render produces a new pending promise.

#### ❌ Anti-Pattern (Creating promise during render)
```tsx
import { use } from 'react';

function UserProfile({ userId }: { userId: string }) {
  // ❌ FATAL: Fresh promise created on every render -> infinite suspension loop!
  const promise = fetch(`/api/user/${userId}`).then(res => res.json());
  const user = use(promise);

  return <div>{user.name}</div>;
}
```

#### ✅ Best Practice (Passing pre-created cached promises or using Server Components)
```tsx
import { use, Suspense } from 'react';

// Promise created outside or passed from Server Component / data-loader cache
function UserProfile({ userPromise }: { userPromise: Promise<{ name: string }> }) {
  const user = use(userPromise);
  return <div>{user.name}</div>;
}

export function App({ userPromise }: { userPromise: Promise<{ name: string }> }) {
  return (
    <Suspense fallback={<div>Loading user profile...</div>}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

---

### Rule 2.2: Never Wrap `use(promise)` in `try...catch` Blocks
**Why**: React handles Suspense by throwing promises under the hood. Wrapping `use(promise)` in `try...catch` intercepts the thrown promise, breaking React's ability to trigger `<Suspense>`.

#### ❌ Anti-Pattern (`try...catch` around `use`)
```tsx
function BadDataViewer({ dataPromise }: { dataPromise: Promise<string> }) {
  try {
    // ❌ BROKEN: Swallows React's internal suspension signal!
    const data = use(dataPromise);
    return <div>{data}</div>;
  } catch (err) {
    return <div>Failed to load</div>;
  }
}
```

#### ✅ Best Practice (Use `<ErrorBoundary>` for error states, `<Suspense>` for pending states)
```tsx
import { use, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

function DataViewer({ dataPromise }: { dataPromise: Promise<string> }) {
  // ✅ Happy path only; errors propagate to Error Boundary
  const data = use(dataPromise);
  return <div>{data}</div>;
}

export function SafeDataViewer({ dataPromise }: { dataPromise: Promise<string> }) {
  return (
    <ErrorBoundary fallback={<div>Failed to load data.</div>}>
      <Suspense fallback={<div>Loading...</div>}>
        <DataViewer dataPromise={dataPromise} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

### Rule 2.3: Use `use(Context)` for Conditional Context Reading
**Why**: Traditional `useContext` violates the Rules of Hooks if called conditionally or after early returns. `use(Context)` can safely be executed inside conditions, loops, or early returns.

#### ✅ Best Practice
```tsx
import { use } from 'react';
import { ThemeContext } from './ThemeContext';

function DynamicCard({ showTheme, children }: { showTheme: boolean; children: React.ReactNode }) {
  if (!showTheme) {
    return <div className="plain-card">{children}</div>;
  }

  // ✅ Allowed in React 19!
  const theme = use(ThemeContext);
  return <div style={{ color: theme.color }}>{children}</div>;
}
```

---

## 3. Refs and DOM Manipulation

### Rule 3.1: Pass `ref` as a Standard Prop; Stop Using `forwardRef`
**Why**: React 19 natively treats `ref` as a prop in function components. `forwardRef` is deprecated and will be removed.

#### ❌ Anti-Pattern (Legacy `forwardRef`)
```tsx
// ❌ Deprecated in React 19
const CustomInput = React.forwardRef<HTMLInputElement, { placeholder: string }>((props, ref) => {
  return <input ref={ref} placeholder={props.placeholder} />;
});
```

#### ✅ Best Practice (Direct `ref` prop)
```tsx
interface CustomInputProps {
  placeholder: string;
  ref?: React.Ref<HTMLInputElement>;
}

// ✅ Clean and idiomatic React 19
export function CustomInput({ placeholder, ref }: CustomInputProps) {
  return <input ref={ref} placeholder={placeholder} />;
}
```

---

### Rule 3.2: Use Ref Cleanup Functions and Avoid Implicit Returns in Arrow Callbacks
**Why**: React 19 supports cleanup functions returned by ref callbacks (invoked when the element unmounts). An implicit return in TypeScript (e.g. `ref={el => (ref.current = el)}`) returns the DOM node, which TypeScript rejects because it expects a cleanup function or `void`.

#### ❌ Anti-Pattern (Implicit return in ref callback)
```tsx
function BadRef() {
  let element: HTMLDivElement | null = null;
  // ❌ TS Error in React 19: Type 'HTMLDivElement' is not assignable to 'void | (() => void)'
  return <div ref={node => (element = node)} />;
}
```

#### ✅ Best Practice (Explicit block statement or explicit cleanup function)
```tsx
function GoodRef() {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={node => {
        // ✅ Block body ensures no return value (void)
        ref.current = node;
      }}
    />
  );
}

// Or with real cleanup logic:
function MeasuredElement({ onResize }: { onResize: () => void }) {
  return (
    <div
      ref={node => {
        if (!node) return;
        const observer = new ResizeObserver(onResize);
        observer.observe(node);

        // ✅ Return cleanup function
        return () => {
          observer.disconnect();
        };
      }}
    />
  );
}
```

---

### Rule 3.3: Always Supply an Argument to `useRef`
**Why**: `@types/react@^19.0.0` requires an explicit argument to `useRef()`. All refs returned are mutable `RefObject<T>`.

#### ❌ Anti-Pattern
```ts
// ❌ TypeScript Error: Expected 1 argument, but got 0
const inputRef = useRef<HTMLInputElement>();
```

#### ✅ Best Practice
```ts
// ✅ Explicit null or undefined
const inputRef = useRef<HTMLInputElement>(null);
const countRef = useRef<number>(0);
const optionalRef = useRef<string | undefined>(undefined);
```

---

## 4. Context Providers

### Rule 4.1: Render `<Context>` Directly Instead of `<Context.Provider>`
**Why**: `<Context.Provider>` is deprecated in React 19. Rendering `<Context value={...}>` is cleaner and standardized.

#### ❌ Anti-Pattern
```tsx
// ❌ Deprecated in React 19
<ThemeContext.Provider value="dark">
  {children}
</ThemeContext.Provider>
```

#### ✅ Best Practice
```tsx
// ✅ Idiomatic React 19
<ThemeContext value="dark">
  {children}
</ThemeContext>
```

---

## 5. Document Metadata & Stylesheets

### Rule 5.1: Declare `<title>`, `<meta>`, and `<link>` Natively Inside Components
**Why**: React 19 automatically hoists document metadata tags to `<head>` across client rendering, streaming SSR, and Server Components. Third-party libraries like `react-helmet` are no longer required for standard metadata.

#### ✅ Best Practice
```tsx
export function ArticlePage({ title, description, canonicalUrl }: { title: string; description: string; canonicalUrl: string }) {
  return (
    <article>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <h1>{title}</h1>
      <p>{description}</p>
    </article>
  );
}
```

---

### Rule 5.2: Always Specify `precedence` on Component-Level Stylesheets
**Why**: Providing `precedence` tells React how to sort stylesheets in `<head>` and instructs React to suspend rendering until the stylesheet finishes loading, preventing Flash of Unstyled Content (FOUC).

#### ✅ Best Practice
```tsx
export function StyledWidget() {
  return (
    <div>
      <link rel="stylesheet" href="/widget.css" precedence="high" />
      <div className="widget-box">Widget Content</div>
    </div>
  );
}
```

---

## 6. Server Actions & Security in Full-Stack Architectures

### Rule 6.1: Never Assume `"use server"` is Secure by Default
**Why**: Functions marked with `"use server"` are exposed as public HTTP POST endpoints reachable by anyone. Hiding a button in the UI does NOT protect the endpoint.

#### ❌ Anti-Pattern (Unprotected Server Action)
```ts
// ❌ VULNERABLE: Any client can POST with arbitrary userId and delete any account!
"use server";

export async function deleteUser(userId: string) {
  await db.user.delete({ where: { id: userId } });
}
```

#### ✅ Best Practice (Authentication, Authorization & Input Validation)
```ts
"use server";

import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';

const DeleteSchema = z.object({
  userId: z.string().uuid(),
});

export async function deleteUser(rawData: unknown) {
  // 1. Authenticate
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    throw new Error('Unauthorized');
  }

  // 2. Validate input schema
  const parsed = DeleteSchema.safeParse(rawData);
  if (!parsed.success) {
    throw new Error('Invalid input');
  }

  // 3. Authorize ownership / permissions
  if (sessionUser.role !== 'admin' && sessionUser.id !== parsed.data.userId) {
    throw new Error('Forbidden: Cannot delete other accounts');
  }

  // 4. Perform mutation
  await db.user.delete({ where: { id: parsed.data.userId } });
}
```

---

### Rule 6.2: Never Pass Sensitive Objects or Secrets to Client Components
**Why**: Props passed across the Server-to-Client boundary are serialized into the HTML / RSC flight response. Secrets can be extracted by inspect tools.
- Use `server-only` to ensure server utility files cannot be imported into Client Components:
  ```bash
  npm install server-only
  ```
  ```ts
  import 'server-only';
  export const DB_SECRET = process.env.DB_PASSWORD;
  ```
- Use React's experimental taint APIs (`experimental_taintUniqueValue`, `experimental_taintObjectReference`) to trigger build/runtime errors if sensitive tokens or objects reach the client.

---

## 7. Memoization & The React Compiler

### Rule 7.1: Do Not Prematurely Add `useMemo`, `useCallback`, and `React.memo`
**Why**: When the React Compiler is enabled, it automatically optimizes re-renders and memoizes JSX elements and expensive computations. Manual memoization clutters code and often has incorrect dependency arrays.

#### ❌ Anti-Pattern (Excessive manual memoization)
```tsx
// ❌ Unnecessary boilerplate when React Compiler is active
const MemoizedItem = React.memo(Item);

function ItemList({ items, onItemClick }: Props) {
  const sortedItems = useMemo(() => items.slice().sort(), [items]);
  const handleClick = useCallback((id: string) => {
    onItemClick(id);
  }, [onItemClick]);

  return (
    <div>
      {sortedItems.map(item => (
        <MemoizedItem key={item.id} item={item} onClick={handleClick} />
      ))}
    </div>
  );
}
```

#### ✅ Best Practice (Idiomatic, clean React code conforming to Rules of React)
```tsx
function ItemList({ items, onItemClick }: Props) {
  const sortedItems = items.toSorted();

  return (
    <div>
      {sortedItems.map(item => (
        <Item key={item.id} item={item} onClick={onItemClick} />
      ))}
    </div>
  );
}
```

*Note: For the React Compiler to work safely, components must strictly adhere to the Rules of React: pure render functions, immutable state/props, and no side-effects during render.*

---

## 8. Summary Checklist for React 19 Migrations

| Area | Legacy / Anti-Pattern | React 19 Standard |
| :--- | :--- | :--- |
| **Mounting** | `ReactDOM.render` / `ReactDOM.hydrate` | `createRoot` / `hydrateRoot` from `react-dom/client` |
| **Component Refs** | `React.forwardRef((props, ref) => ...)` | Standard prop `function Comp({ ref, ...props })` |
| **Ref Cleanup** | Callback returning element instance implicitly | Explicit `{ ref.current = el; }` or cleanup `return () => {}` |
| **Ref Typing** | `useRef()` with no args (`MutableRefObject`) | `useRef(null)` / `useRef(undefined)` (`RefObject<T>`) |
| **Context** | `<ThemeContext.Provider value="...">` | `<ThemeContext value="...">` |
| **Conditional Context** | Nesting `useContext` or props | `const val = use(ThemeContext)` |
| **Form Mutations** | `onSubmit` with manual `isPending` state | `<form action={action}>` with `useActionState` |
| **Form Status** | `useFormStatus` in the form container | `useFormStatus` in child submit button components |
| **Optimistic State** | Ad-hoc state rollback in `catch` blocks | `useOptimistic` inside transition |
| **Data Fetching** | `useEffect` fetch waterfalls | `use(promise)` with `<Suspense>` or RSC |
| **Metadata** | `react-helmet` or effect-based DOM manipulation | Native `<title>`, `<meta>`, `<link>` in JSX |
| **Testing** | `react-dom/test-utils` / `react-test-renderer` | `@testing-library/react` and `act` from `'react'` |
| **Server Actions** | Implicitly trusting client data | Zod validation + explicit auth checks in every action |
