# Next.js 16 (16.3.1) Best Practices and Anti-Patterns

**Document Version:** 1.0.0  
**Target Next.js Release:** Next.js 16 (specifically 16.3.1 / 16.3.x)  
**Status:** Canonical Reference Guide

---

## Table of Contents
1. [Architecture & Configuration](#1-architecture--configuration)
2. [Data Fetching & Cache Components (`use cache`)](#2-data-fetching--cache-components-use-cache)
3. [Instant Navigations & Partial Prefetching (Next.js 16.3)](#3-instant-navigations--partial-prefetching-nextjs-163)
4. [Async Request APIs Migration](#4-async-request-apis-migration)
5. [Network Boundaries: `proxy.ts` vs Route Handlers vs Server Actions](#5-network-boundaries-proxyts-vs-route-handlers-vs-server-actions)
6. [Server Actions & Mutation Security](#6-server-actions--mutation-security)
7. [React 19 & Component Patterns](#7-react-19--component-patterns)
8. [Asset & Form Optimization](#8-asset--form-optimization)
9. [Next.js 16.3.1 Specific Issues & Mitigation](#9-nextjs-1631-specific-issues--mitigation)

---

## 1. Architecture & Configuration

### Best Practices

- **Use `next.config.ts` with explicit type safety:** Always write configurations using TypeScript with `import type { NextConfig } from 'next'`.
- **Top-level Turbopack configuration:** In Next.js 16, Turbopack is the default bundler for both dev and build. Place any custom Turbopack options at the root level of `nextConfig` rather than inside `experimental`.
- **Enable React Compiler:** Enable automatic memoization via `reactCompiler: true`. Install `babel-plugin-react-compiler` as a dev dependency.
- **Maintain AI Agent Context (`AGENTS.md` / `CLAUDE.md`):** Keep custom project guidelines outside the managed block delimiter (`<!-- BEGIN:nextjs-agent-rules --> ... <!-- END:nextjs-agent-rules -->`), so `next dev` can continuously update version-matched internal rules without overwriting custom instructions.

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopack options are top-level in v16
  turbopack: {
    // resolveAlias, rules, etc.
  },
  // React Compiler built-in integration
  reactCompiler: true,
  // Cache Components & Partial Prefetching (Instant Navigations)
  cacheComponents: true,
  partialPrefetching: true,
  // Strict remote patterns for images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.example.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
```

### Anti-Patterns

- **Nesting `turbopack` under `experimental`:** In Next.js 16, `experimental.turbopack` is deprecated.
- **Relying on Webpack-specific plugins without fallback planning:** Turbopack does not run arbitrary Webpack plugins. If legacy plugins are strictly required, explicitly run `next dev --webpack` or `next build --webpack` until replacements are found.
- **Overwriting the entire `AGENTS.md`:** Deleting the `BEGIN:nextjs-agent-rules` block causes Next.js to regenerate the file on subsequent runs, potentially discarding custom agent prompts.

---

## 2. Data Fetching & Cache Components (`use cache`)

Next.js 16 shifts from implicit caching to **"Caching by Consent"**. All dynamic queries are uncached by default until explicitly opted in with `'use cache'`.

### Best Practices

- **Use `'use cache'` for deterministic data reads:** Place the directive at the top of an async function, component, or file to cache expensive calculations or external DB reads.
- **Define cache lifetimes with `cacheLife`:** Always specify lifetime profiles (`'seconds'`, `'minutes'`, `'hours'`, `'days'`, `'weeks'`, `'max'`) or explicit `{ stale, revalidate, expire }`.
- **Tag cached entries with `cacheTag` for event-driven invalidation:** Pair cached data with tags and invalidate with `revalidateTag` in Server Actions.
- **Isolate private data with `'use cache: private'`:** For session-specific or user-personalized cached content, use the private cache scope to guarantee data is never shared across users.
- **Extract Cookies/Headers before caching:** Read `cookies()` or `headers()` outside the cached function in a Server Component, then pass only sanitized primitive values (like `userId` or `theme`) as arguments.

```typescript
// Example: Valid explicit cache component
import { cacheLife, cacheTag } from 'next/cache';

export async function getProductListing(category: string) {
  'use cache';
  cacheLife('hours');
  cacheTag(`category-${category}`);

  const res = await db.products.findMany({ where: { category } });
  return res;
}
```

```typescript
// Example: Private user session cache
export async function getUserPreferences(userId: string) {
  'use cache: private';
  cacheLife('days');
  cacheTag(`user-prefs-${userId}`);

  return await db.userPreferences.findUnique({ where: { userId } });
}
```

### Anti-Patterns

- **Reading `cookies()` or `headers()` inside `'use cache'`:**
  ```typescript
  // BAD: Dynamic request cookies/headers inside cached function cause runtime errors
  // or unintended cross-user cache leaking.
  export async function getProfile() {
    'use cache';
    const cookieStore = await cookies(); // ERROR / ANTI-PATTERN
    const token = cookieStore.get('token');
    return fetchProfile(token);
  }
  ```
- **Cache Flooding with unbounded inputs:** Passing arbitrary query objects (e.g. unvalidated `searchParams`) directly into a `'use cache'` function. An attacker can supply random query strings to flood the cache store and trigger cache stampedes.
- **Using legacy `unstable_cache`:** In Next.js 16, `unstable_cache` is legacy. All new code must use `'use cache'`.
- **Caching sensitive auth tokens or raw payment details:** Never place sensitive authorization tokens or secrets in cached responses.

---

## 3. Instant Navigations & Partial Prefetching (Next.js 16.3)

### Best Practices

- **Pair `cacheComponents: true` and `partialPrefetching: true`:** Enables Instant Navigations, creating a reusable static App Shell for every route.
- **Wrap every dynamic data-fetching component in `<Suspense>`:** Instant Navigations relies on streaming dynamic parts into the prefetched App Shell.
- **Provide meaningful skeleton fallback UI:** Ensure the `fallback` prop on `<Suspense>` mimics the loaded layout to avoid cumulative layout shift (CLS).
- **Use Instant Insights & Navigation Inspector in development:** Leverage the Dev Overlay in Next.js 16.3 to spot any slow or blocking navigations.

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';
import { MetricsSkeleton } from '@/components/skeletons';
import { DynamicMetrics } from '@/components/dynamic-metrics';
import { StaticSidebar } from '@/components/static-sidebar';

export default function DashboardPage() {
  return (
    <div className="flex">
      {/* Prerendered as part of the instant App Shell */}
      <StaticSidebar />

      <main className="flex-1 p-6">
        <h1>Dashboard Overview</h1>
        {/* Dynamic data streams inside Suspense */}
        <Suspense fallback={<MetricsSkeleton />}>
          <DynamicMetrics />
        </Suspense>
      </main>
    </div>
  );
}
```

### Anti-Patterns

- **Unenclosed dynamic calls in routes under Partial Prefetching:** Awaiting a dynamic database query directly in the top-level Page or Layout without `<Suspense>` destroys the static App Shell and forces full SSR blocking.
- **Root layout blocking waterfalls:** Placing blocking dynamic calls inside `app/layout.tsx` blocks every child route from rendering an instant shell.

---

## 4. Async Request APIs Migration

Next.js 16 completely removes synchronous access to request context. Any synchronous property access will throw a runtime error.

### Best Practices

- **Explicitly await `params` and `searchParams`:**
  ```tsx
  // app/blog/[slug]/page.tsx
  interface PageProps {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
  }

  export default async function BlogPost({ params, searchParams }: PageProps) {
    const { slug } = await params;
    const query = await searchParams;
    return <article>Post: {slug}</article>;
  }
  ```
- **Explicitly await `params` in `generateMetadata`:**
  ```tsx
  export async function generateMetadata({
    params,
  }: {
    params: Promise<{ slug: string }>;
  }) {
    const { slug } = await params;
    return { title: `Article: ${slug}` };
  }
  ```
- **Explicitly await `cookies()`, `headers()`, and `draftMode()`:**
  ```tsx
  import { cookies, headers } from 'next/headers';

  export default async function ProtectedPage() {
    const cookieStore = await cookies();
    const headerList = await headers();
    const token = cookieStore.get('auth-token')?.value;
    const userAgent = headerList.get('user-agent');
    return <div>User Agent: {userAgent}</div>;
  }
  ```
- **Run automated codemods during migration:**  
  `npx @next/codemod@latest next-async-request-api`

### Anti-Patterns

- **Synchronously destructuring props in component signatures:**
  ```tsx
  // BAD: Fatal error in Next.js 16
  export default function Page({ params }: { params: { slug: string } }) {
    return <h1>{params.slug}</h1>; // Crashes at runtime!
  }
  ```
- **Synchronous `cookies().get(...)`:**
  ```tsx
  // BAD: cookies() returns Promise<ReadonlyRequestCookies> in v16
  const token = cookies().get('session'); // Crashes or returns undefined method!
  ```

---

## 5. Network Boundaries: `proxy.ts` vs Route Handlers vs Server Actions

In Next.js 16, `middleware.ts` is renamed to **`proxy.ts`** and operates in the Node.js runtime.

### Best Practices

- **File & Function Naming:** Create `proxy.ts` (or `src/proxy.ts`) exporting a named function `proxy(request: NextRequest)`.
- **Use `proxy.ts` strictly as an edge/network traffic router:**
  - Fast redirects (e.g. unauthorized users directed to `/login`).
  - Security header injection (CSP, Permissions-Policy, HSTS).
  - Geolocation rewrites or A/B test path rewrites.
- **Use `config.matcher` to minimize proxy execution overhead:** Never run `proxy.ts` on static files, images, or assets.
- **Differentiate responsibility:**
  - **`proxy.ts`:** Network gatekeeper & HTTP header/path rewrite.
  - **Route Handlers (`app/api/.../route.ts`):** External REST/Webhook endpoints consumed by mobile apps or third-party webhooks.
  - **Server Actions:** Mutations invoked directly from the React UI.

```typescript
// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value;

  if (!token && request.nextUrl.pathname.startsWith('/protected')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  response.headers.set('x-proxy-version', '16.3');
  return response;
}

export const config = {
  matcher: ['/protected/:path*', '/api/secure/:path*'],
};
```

### Anti-Patterns

- **Executing database queries or ORM calls in `proxy.ts`:** Slows down every matching request and introduces connection pool saturation.
- **Using `proxy.ts` as the sole authorization layer:** Attackers can sometimes bypass proxy matching through malformed URLs or alternative paths. Authorization MUST be verified inside Server Components and Server Actions.
- **Retaining `export function middleware`:** Will emit deprecation warnings and may be stripped in future minor/major releases.
- **Using `skipMiddlewareUrlNormalize`:** Update to `skipProxyUrlNormalize` in `next.config.ts`.

---

## 6. Server Actions & Mutation Security

### Best Practices

- **Treat Server Actions as Public HTTP Endpoints:** Anyone can send a POST request with arbitrary JSON or form-data directly to the generated Action endpoint.
- **Mandatory Authentication & Authorization:** Check user session and verify permissions on every single Server Action execution.
- **Validate Input Payloads with Schema Validation (Zod):**
  ```typescript
  'use server';

  import { z } from 'zod';
  import { revalidateTag } from 'next/cache';
  import { auth } from '@/lib/auth';

  const UpdateSchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(3).max(100),
  });

  export async function updatePostAction(prevState: unknown, formData: FormData) {
    const session = await auth();
    if (!session || !session.user) {
      throw new Error('Unauthorized');
    }

    const validated = UpdateSchema.safeParse({
      id: formData.get('id'),
      title: formData.get('title'),
    });

    if (!validated.success) {
      return { errors: validated.error.flatten().fieldErrors };
    }

    await db.post.update({
      where: { id: validated.data.id, authorId: session.user.id },
      data: { title: validated.data.title },
    });

    revalidateTag(`post-${validated.data.id}`);
    return { success: true };
  }
  ```
- **Use `server-only` on internal utility modules:** Guard private database and cryptography helpers with `import 'server-only'`.
- **Use React 19 `useActionState` and `useOptimistic` in client components.**

### Anti-Patterns

- **Using Server Actions for Data Fetching (GET equivalent):** Server Actions run sequentially and do not leverage component-level caching. Use Server Components or Cache Components for data fetching.
- **Trusting client-supplied author/user IDs:** Never do `db.post.update({ where: { id }, data: { authorId: formData.get('userId') } })`. Extract identity strictly from verified server session cookies.
- **Passing sensitive objects back to the client:** Avoid returning entire database records that include password hashes or internal keys.

---

## 7. React 19 & Component Patterns

### Best Practices

- **Use `useActionState` for form status & action feedback:**
  ```tsx
  'use client';

  import { useActionState } from 'react';
  import { updatePostAction } from '@/actions/posts';

  export function EditPostForm({ postId }: { postId: string }) {
    const [state, formAction, isPending] = useActionState(updatePostAction, null);

    return (
      <form action={formAction}>
        <input type="hidden" name="id" value={postId} />
        <input name="title" required disabled={isPending} />
        <button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </button>
        {state?.errors?.title && <p className="text-red-500">{state.errors.title[0]}</p>}
      </form>
    );
  }
  ```
- **Use `useOptimistic` for instant feedback:** Optimistically update UI before server mutations respond.
- **Use `use(Promise)` in Client Components:** When passing a Promise from a Server Component to a Client Component, unwrap it cleanly using React's `use()`.

### Anti-Patterns

- **Over-using `'use client'`:** Pushing `'use client'` to the top of the component tree bloats the client bundle. Push client boundaries to leaf nodes (buttons, inputs, interactive toggles).
- **Manual memoization with React Compiler active:** When `reactCompiler: true` is active, manually adding `useMemo` and `useCallback` everywhere is redundant and can occasionally interfere with compiler heuristics.

---

## 8. Asset & Form Optimization

### Best Practices

- **Use `<Form>` from `next/form` for search & filter UI:**
  `<Form action="/search">` automatically handles query string serialization and client-side prefetching of search result page shells without full reload.
  ```tsx
  import Form from 'next/form';

  export function SearchBar() {
    return (
      <Form action="/search">
        <input name="q" placeholder="Search..." />
        <button type="submit">Search</button>
      </Form>
    );
  }
  ```
- **Migrate `next/image` to `preload={true}`:**
  Replace deprecated `priority` prop with `preload={true}`.
  ```tsx
  import Image from 'next/image';

  export function HeroBanner() {
    return (
      <Image
        src="/hero.webp"
        alt="Hero banner"
        width={1200}
        height={600}
        preload={true}
      />
    );
  }
  ```

### Anti-Patterns

- **Using deprecated `images.domains` in `next.config.ts`:** Use `images.remotePatterns` with explicit hostnames and paths.
- **Using raw `<img>` tags for above-the-fold content:** Causes layout shifts and misses automatic format optimization (AVIF/WebP).

---

## 9. Next.js 16.3.1 Specific Issues & Mitigation

Next.js **16.3.1** (released August 13, 2026) addressed early 16.3.0 regressions, but introduced specific build and packaging issues that developers should be prepared for:

### Issue A: `output: 'standalone'` SWC Helper Regression
- **Symptom:** In Docker builds with `output: 'standalone'`, Node fails at startup with `Cannot find module '@swc/helpers'`.
- **Cause:** Dependency packaging mismatch with `@swc/helpers: 0.5.23` in standalone tracing.
- **Mitigation:**
  1. Add `@swc/helpers` explicitly to `package.json` dependencies:
     ```bash
     npm install @swc/helpers@0.5.23
     ```
  2. Or upgrade to Next.js **16.3.2** (or the latest **16.3.5**), where the standalone tracer was resolved.

### Issue B: Build Errors with Unenclosed Dynamic Routes under Partial Prefetching
- **Symptom:** Build fails during static page generation with error: `Route /... couldn't be rendered statically because it used dynamic server usage without a Suspense boundary`.
- **Cause:** Enabling both `cacheComponents: true` and `partialPrefetching: true` enforces strict boundary verification during static generation.
- **Mitigation:**
  - Wrap any async server data access with `<Suspense fallback={<Loading />}>`.
  - For pages that must remain 100% dynamic without a shell, declare `export const dynamic = 'force-dynamic'`.

### Production Recommendation
For production deployments, bumping to **`next@16.3.5`** is recommended over remaining on `16.3.1`, as it resolves the standalone bundling bug and includes security and memory stability patches.
