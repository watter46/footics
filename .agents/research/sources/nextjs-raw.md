# Next.js 16 (16.3.1) Raw Research & Source Documentation

**Research Date:** September 15, 2026  
**Target Package:** `next@16.3.1` (Release Date: August 13, 2026)  
**Lineage:** Next.js 16.0.0 (October 21, 2025) -> Next.js 16.3.0 (August 3, 2026) -> Next.js 16.3.1 (August 13, 2026) -> Latest Stable in 16.x branch: 16.3.5 (September 11, 2026)

---

## 1. NPM Registry & Package Metadata

From npm registry metadata for `next@16.3.1`:
- **Version:** `16.3.1`
- **Release Timestamp:** `2026-08-13T22:45:02.025Z`
- **License:** MIT
- **Homepage:** https://nextjs.org
- **Repository:** git+https://github.com/vercel/next.js.git
- **Node Engine Requirement:** `>=20.9.0`
- **Dependencies:**
  - `@next/env`: `16.3.1`
  - `@swc/helpers`: `0.5.23`
  - `postcss`: `8.5.23`
  - `styled-jsx`: `5.1.6`
  - `caniuse-lite`: `^1.0.30001579`
  - `baseline-browser-mapping`: `^2.9.19`
- **Peer Dependencies:**
  - `react`: `^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0`
  - `react-dom`: `^18.2.0 || 19.0.0-rc-de68d2f4-20241204 || ^19.0.0`
  - `sass`: `^1.3.0` (optional)
  - `@playwright/test`: `^1.51.1` (optional)
  - `@opentelemetry/api`: `^1.1.0` (optional)
  - `babel-plugin-react-compiler`: `*` (optional)
- **Optional Native SWC Binaries:**
  - `@next/swc-darwin-arm64`: `16.3.1`
  - `@next/swc-darwin-x64`: `16.3.1`
  - `@next/swc-linux-arm64-gnu`: `16.3.1`
  - `@next/swc-linux-arm64-musl`: `16.3.1`
  - `@next/swc-linux-x64-gnu`: `16.3.1`
  - `@next/swc-linux-x64-musl`: `16.3.1`
  - `@next/swc-win32-arm64-msvc`: `16.3.1`
  - `@next/swc-win32-x64-msvc`: `16.3.1`
  - `sharp`: `^0.35.3`

---

## 2. Primary URLs & Documentation Sources

- **Official Upgrading Guide (v16):**  
  `https://nextjs.org/docs/app/building-your-application/upgrading/version-16`
- **Official Release Announcement (Next.js 16):**  
  `https://nextjs.org/blog/next-16`
- **Official Release Announcement (Next.js 16.3 - Instant Navigations & Agent DX):**  
  `https://nextjs.org/blog/next-16-3`
- **GitHub Repository & Releases:**  
  `https://github.com/vercel/next.js`  
  `https://github.com/vercel/next.js/releases`
- **Official Codemod CLI Documentation:**  
  `https://nextjs.org/docs/app/building-your-application/upgrading/codemods`
- **Cache Components Specification (`use cache`):**  
  `https://nextjs.org/docs/app/api-reference/directives/use-cache`
- **Proxy Architecture Documentation (`proxy.ts`):**  
  `https://nextjs.org/docs/app/building-your-application/routing/proxy`
- **Turbopack Configuration & Integration:**  
  `https://nextjs.org/docs/app/api-reference/next-config-js/turbopack`
- **Bundled Agent Docs (local inside package):**  
  `node_modules/next/dist/docs/`

---

## 3. Major Architectural Pillars of Next.js 16

### A. Cache Components (`use cache`, `cacheLife`, `cacheTag`)
Next.js 16 departs from implicit "caching everything by default" in favor of **explicit opt-in caching ("Caching by Consent")**.
- **`cacheComponents: true`** in `next.config.ts` activates the new cache engine.
- Replaces legacy and experimental `unstable_cache`.
- **`'use cache'` directive:** Can be placed at the top of a file, component, or async function.
- **`cacheLife(profile | options)`:** Sets TTL profiles (e.g. `'seconds'`, `'minutes'`, `'hours'`, `'days'`, `'weeks'`, `'max'`) or explicit `{ stale, revalidate, expire }`.
- **`cacheTag(...tags)`:** Tags cached items for on-demand invalidation via `revalidateTag(tag)`.
- **Private Caching:** `'use cache: private'` restricts cache access to the session/user boundary.

### B. Turbopack as Default Bundler
- Stable and enabled by default for both development (`next dev`) and production builds (`next build`).
- Flags `--turbopack` are no longer needed.
- Configuration moved from `experimental.turbopack` to top-level `turbopack` in `next.config.ts`.
- Fallback flag to Webpack available for legacy plugins: `next dev --webpack` or `next build --webpack`.
- Experimental filesystem caching for dev: `experimental.turbopackFileSystemCacheForDev: true`.

### C. Proxy Layer (`proxy.ts` replaces `middleware.ts`)
- Renamed from `middleware.ts` to `proxy.ts` to reflect its true nature as a network request boundary and avoid confusion with Express-style middleware.
- Function name exported is `proxy(request: NextRequest)` instead of `middleware(request)`.
- Runs within the Node.js runtime environment (rather than pure Edge runtime restrictions), providing a clearer boundary.
- Config key renamed: `skipMiddlewareUrlNormalize` -> `skipProxyUrlNormalize`.
- Codemod migration: `npx @next/codemod@canary middleware-to-proxy`.

### D. Async Request APIs (Breaking Change Enforced)
In Next.js 15, synchronous access to request context was deprecated with runtime warnings. In Next.js 16, **synchronous access is completely removed and throws a hard error**.
- `params`: Returns `Promise<SegmentParams>` (must be awaited in Page, Layout, `generateMetadata`, etc.).
- `searchParams`: Returns `Promise<SearchParams>` (must be awaited in Page).
- `cookies()`: Returns `Promise<ReadonlyRequestCookies>` (must be awaited).
- `headers()`: Returns `Promise<ReadonlyHeaders>` (must be awaited).
- `draftMode()`: Returns `Promise<DraftMode>` (must be awaited).

### E. Next.js 16.3 Feature Set: Instant Navigations & AI Integration
Released August 3, 2026:
1. **Instant Navigations:**
   - Combines `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts`.
   - Generates a reusable, prerendered "App Shell" per route pattern. Links sharing a shell do not duplicate shell prefetches.
   - Dynamic content streams into the shell behind React `<Suspense>` boundaries.
   - New Devtools: **Instant Insights** in the Next.js Dev Overlay (alerts when navigations block instead of loading instantly) and **Navigation Inspector** (pause navigation to inspect prefetched shells).
   - Automated testing helper: Playwright `instant()` helper for regression detection.
2. **AI Agent Tooling (`AGENTS.md` / `CLAUDE.md`):**
   - Automatically created/updated on `next dev`.
   - References local bundled documentation at `node_modules/next/dist/docs/`.
   - Uses managed delimiter block `<!-- BEGIN:nextjs-agent-rules --> ... <!-- END:nextjs-agent-rules -->`.
   - Actionable terminal/overlay errors with structured context for LLMs.

### F. React Compiler Integration
- Stable integration. Built-in memoization compiler.
- Enabled via `reactCompiler: true` (or `{ mode: 'annotation' }`) in `next.config.ts`.
- Requires `babel-plugin-react-compiler` peer dependency.

### G. `next/image` Breaking Changes
- `priority` prop is deprecated in favor of `preload={true}`.
- `images.domains` deprecated in favor of `images.remotePatterns` with strict matching.

---

## 4. Next.js 16.3.1 Specific Changelog & Known Issues

- **Release Date:** August 13, 2026.
- **Fixes:** Addressed initial regression bugs from 16.3.0 in Turbopack watch-mode, Dev Overlay layout metrics, and fast refresh under large dependency graphs.
- **Identified Regressions / Issues in 16.3.1:**
  1. **`output: 'standalone'` regression:** Certain standalone Docker container builds reported module resolution failures regarding `@swc/helpers` (specifically version 0.5.23) when bundling server output.
  2. **Build failures with Partial Prefetching flags:** When `cacheComponents: true` and `partialPrefetching: true` were enabled on routes missing explicit `<Suspense>` boundaries around dynamic data fetches, builds in 16.3.1 could fail during static generation phase.
- **Subsequent Releases:**
  - `16.3.2` (August 21, 2026): Fixed standalone output SWC helper packaging.
  - `16.3.3` (August 25, 2026) & `16.3.4` (August 31, 2026): Turbopack edge cases and route prefetch improvements.
  - `16.3.5` (September 11, 2026): Current stable release in the 16.3 branch containing security patches and full standalone build stability.

---

## 5. Migration CLI & Codemod Commands

```bash
# Full automated upgrade to latest Next.js 16:
npx @next/codemod@canary upgrade latest

# Migrate middleware.ts to proxy.ts:
npx @next/codemod@canary middleware-to-proxy

# Migrate synchronous request-time APIs (cookies, headers, params):
npx @next/codemod@latest next-async-request-api

# Generate/refresh AGENTS.md documentation:
npx @next/codemod@canary agents-md
```
