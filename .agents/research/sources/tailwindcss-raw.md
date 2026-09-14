# Tailwind CSS v4 (v4.3.3) Raw Research & Sources

## 1. Executive Summary & Version Overview

Tailwind CSS v4.0 is a ground-up reimagining of the utility-first CSS framework, rebuilt for modern browser standards and developer ergonomics. The core runtime was rewritten in Rust ("Oxide" engine) with Lightning CSS integration, removing the need for JavaScript-based configuration, `autoprefixer`, and `postcss-import`.

- **Current Stable Version Examined:** `v4.3.3` (Released July 16, 2026)
- **Framework Launch:** Tailwind CSS v4.0 (January 22, 2025)
- **Key Milestones:**
  - **v4.0 (Jan 2025):** Oxide Rust engine (up to 5x faster full builds, 100x faster HMR/incremental builds), CSS-first `@theme` configuration, native CSS variables, native cascade layers (`@layer`), removal of `tailwind.config.js` requirement.
  - **v4.1 (Apr 2025):** First-class text-shadow utilities, mask image utilities, enhanced interactive transitions.
  - **v4.2 (Early 2026):** Webpack plugin support, new neutral palettes (`mauve`, `olive`, `mist`, `taupe`).
  - **v4.3 (May 2026):** First-party scrollbar styling utilities, expanded logical properties (`inline-*`, `block-*`, `pbs-*`, `mbs-*`), zoom and `tab-size` utilities, improved `@variant` nesting.
  - **v4.3.3 (July 2026):** Added CLI `--watch --poll[=ms]` flag for non-standard file systems, case-insensitive arbitrary hex color canonicalization against theme tokens, default sans font CJK/Windows handling refinements, dependency pinning and upgrade tool fixes.

---

## 2. Official Documentation & Authoritative Links

### Primary Documentation
- **Official Documentation:** https://tailwindcss.com/docs
- **Upgrade Guide (v3 -> v4):** https://tailwindcss.com/docs/upgrade-guide
- **Functions and Directives Reference:** https://tailwindcss.com/docs/functions-and-directives
- **Theme Variables Reference:** https://tailwindcss.com/docs/theme
- **Detecting Classes in Source Files:** https://tailwindcss.com/docs/detecting-classes-in-source-files
- **Adding Custom Styles (Utilities & Variants):** https://tailwindcss.com/docs/adding-custom-styles
- **Browser Compatibility:** https://tailwindcss.com/docs/compatibility
- **Official Blog:** https://tailwindcss.com/blog

### GitHub Repositories & Release Feeds
- **Tailwind CSS Core Repository:** https://github.com/tailwindlabs/tailwindcss
- **Tailwind CSS Releases:** https://github.com/tailwindlabs/tailwindcss/releases
- **Tailwind CSS v4 Oxide Engine Source:** https://github.com/tailwindlabs/tailwindcss/tree/main/crates
- **Automated Upgrade CLI:** `npx @tailwindcss/upgrade`

---

## 3. Package Ecosystem in v4

In v4, Tailwind decoupled its CLI and PostCSS integrations into separate scoped packages:

| Package | Role & Status in v4 |
| :--- | :--- |
| `tailwindcss` | Core framework, theme definitions, and base compiler runtime. |
| `@tailwindcss/vite` | Official Vite plugin (First-class recommendation for Vite, replaces PostCSS). |
| `@tailwindcss/postcss` | Dedicated PostCSS plugin (Replaces `tailwindcss` as PostCSS plugin). |
| `@tailwindcss/cli` | Dedicated CLI tool (Replaces `tailwindcss` binary CLI). |
| `@tailwindcss/upgrade` | Automated code-mod and migration runner for v3 -> v4 transitions. |
| `@tailwindcss/typography` | Official typography plugin (Loaded in CSS via `@plugin "@tailwindcss/typography";`). |
| `@tailwindcss/forms` | Form resets (Deprecated/optional; native styling preferred in v4). |
| `@tailwindcss/container-queries` | **Obsolete in v4**: Container queries `@container`, `@min-*`, `@max-*` are now built into core! |
| `@tailwindcss/aspect-ratio` | **Obsolete in v4**: CSS `aspect-ratio` utility `aspect-*` is built into core. |

---

## 4. Architectural Innovations

### 1. The Oxide Engine & Lightning CSS
- Built in Rust, the Oxide engine parses project files without JavaScript overhead.
- Integrates Lightning CSS for ultra-fast CSS parsing, bundling, downleveling, and vendor prefixing.
- External dependencies like `autoprefixer` and `postcss-import` are completely unnecessary and should be removed.

### 2. CSS-First Configuration
- Replaces `tailwind.config.js` with declarative CSS `@theme` blocks inside your stylesheet.
- All design tokens generate standard CSS variables in `:root` (e.g. `--color-blue-500: oklch(...)`), making them available directly to inline styles, vanilla CSS, and JavaScript.

### 3. Native Cascade Layers
- Built on modern browser `@layer` specifications:
  - `@layer theme`: Internal token registration.
  - `@layer base`: Preflight resets and foundational element styling.
  - `@layer components`: Reusable high-level abstractions.
  - `@layer utilities`: Generated atomic utility classes.

### 4. Browser Requirements
Tailwind CSS v4 requires modern browsers supporting modern CSS features (`@property`, `color-mix()`, cascade layers, container queries):
- **Chrome / Chromium:** 111+
- **Apple Safari:** 16.4+
- **Mozilla Firefox:** 128+
*Note:* Projects strictly requiring legacy browser support (e.g. IE11 or older Safari) must remain on Tailwind CSS v3.4.

---

## 5. CSS Directives & Functions Reference

### Directives
- **`@import "tailwindcss";`**
  Replaces all `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;`.
  Subpath imports available:
  - `@import "tailwindcss/theme";`
  - `@import "tailwindcss/preflight";`
  - `@import "tailwindcss/utilities";`

- **`@theme [inline | default]`**
  Defines or extends design tokens.
  - `@theme { --color-brand: #ff0055; }`: Extends the theme, generating tokens into CSS variables and utility classes.
  - `@theme inline { --color-primary: var(--primary); }`: Required when a theme token references another dynamic CSS variable at runtime.
  - `--*: initial;`: Inside `@theme`, completely purges all default tokens to start with a blank theme canvas.
  - `--color-*: initial;`: Resets only a single token namespace (e.g. colors).

- **`@source <path> | inline(<pattern>)`**
  Directs the scanner to include files outside the project root or safelist utilities.
  - `@source "../shared-ui";`
  - `@source inline("bg-red-500 text-center");`

- **`@utility <name>`**
  Registers a custom utility class that integrates with Tailwind variants (`hover:`, `md:`, etc.) and specificity ordering.
  - Functional utility syntax: `@utility tab-* { tab-size: --value(--tab-size-*); }`

- **`@custom-variant <name> (<selector>)`**
  Registers a custom variant selector.
  - Syntax: `@custom-variant dark (&:is(.dark *));`
  - Compound slot syntax:
    ```css
    @custom-variant theme-midnight {
      &:where([data-theme="midnight"] *) {
        @slot;
      }
    }
    ```

- **`@variant <name> { ... }`**
  Applies an existing or custom variant to raw CSS within your stylesheet.

- **`@apply <classes>`**
  Inlines utility declarations into custom CSS selectors.

- **`@reference <stylesheet-path>`**
  Imports theme variables, utilities, and custom variants for evaluation in scoped contexts (Vue `<style>`, Svelte `<style>`, CSS Modules) **without** emitting duplicate CSS output.

- **`@config <path>`** *(Compatibility mode)*
  Loads a legacy `tailwind.config.js` file into v4.

- **`@plugin <package-or-path>`** *(Compatibility mode)*
  Loads a JS-based plugin (e.g. `@plugin "@tailwindcss/typography";`).

### Build-Time Functions
- **`--alpha(<color> / <opacity>)`**: Dynamically adjusts alpha transparency in modern color spaces.
- **`--spacing(<value>)`**: Computes pixel/rem values based on the active theme spacing scale.
- **`theme(<variable>)`** *(Deprecated)*: Legacy theme lookup; replaced by native `var(--variable)`.

---

## 6. Comprehensive Breaking Changes (v3 -> v4)

### 1. Directive Syntax
- **v3:**
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
  ```
- **v4:**
  ```css
  @import "tailwindcss";
  ```

### 2. Configuration File Removal & Detection
- `tailwind.config.js` is no longer automatically detected.
- If you have an existing config you cannot yet migrate to CSS, you must explicitly import it:
  ```css
  @config "../../tailwind.config.js";
  ```
- Unsupported keys in JS config under v4: `corePlugins`, `safelist`, `separator`.

### 3. Tooling and Build Integration
- **PostCSS:** Dependency changed from `tailwindcss` to `@tailwindcss/postcss`. Remove `autoprefixer` and `postcss-import`.
- **Vite:** Dedicated plugin `@tailwindcss/vite` replaces PostCSS entirely.
- **CLI:** Package changed from `tailwindcss` to `@tailwindcss/cli`.

### 4. Automatic Content Detection
- No `content: [...]` array needed in CSS.
- Automatically scans files in git tracking, skipping `.gitignore`, `node_modules`, binary files, CSS files, and lock files.
- Extra files registered via `@source "../packages/ui"`.

### 5. Renamed Default Utilities & Scale Alignment
- `shadow-sm` -> `shadow-xs`
- `shadow` -> `shadow-sm`
- `drop-shadow-sm` -> `drop-shadow-xs`
- `drop-shadow` -> `drop-shadow-sm`
- `blur-sm` -> `blur-xs`
- `blur` -> `blur-sm`
- `rounded-sm` -> `rounded-xs`
- `rounded` -> `rounded-sm`
- `outline-none` -> `outline-hidden` (preserves forced-colors accessibility mode; `outline-none` now strictly sets `outline: none;`)
- `ring` -> `ring-3` (default ring width changed from 3px to 1px)

### 6. Default Color Changes
- **Borders (`border-*`) & Dividers (`divide-*`):** In v3, default was `gray-200`. In v4, default is `currentColor`!
- **Rings (`ring`):** In v3, default was `blue-500` at 3px. In v4, default is `currentColor` at 1px.
- **Placeholders:** In v3, used configured `gray-400`. In v4, uses `currentColor` at 50% opacity.

### 7. Selector Mechanics
- **Space-between (`space-x-*`, `space-y-*`) & Divide (`divide-x-*`, `divide-y-*`):**
  Changed selector from child-combinator with sibling selector to `:where(& > :not(:last-child))`.
  Avoid using on inline elements or mixing with manual margins. Recommended alternative: `flex` or `grid` with `gap-*`.

### 8. Modifier Syntax Shifts
- **Important Modifier:** Postfix syntax.
  - v3: `!flex`, `!p-4`
  - v4: `flex!`, `p-4!` (v3 syntax deprecated).
- **Arbitrary CSS Variables:** Parentheses instead of square brackets.
  - v3: `bg-[var(--brand)]`
  - v4: `bg-(--brand)` (also supports `calc()` directly: `h-(--header-height)`).
- **Variant Stacking Direction:** Changed from Right-to-Left (v3) to Left-to-Right (v4).
  - e.g. `group-hover:focus:` evaluates in native CSS order.
- **Arbitrary Values in Grids/Object-Position:** Underscores replace spaces.
  - v3: `grid-cols-[100px,1fr]`
  - v4: `grid-cols-[100px_1fr]`

### 9. Preflight & Element Defaults
- **Buttons:** Use `cursor: default` (native browser behavior) instead of `cursor: pointer`.
- **Dialogs (`<dialog>`):** Margins are reset to `0` instead of auto-centered.
- **`hidden` Attribute:** The HTML `hidden` attribute takes precedence over utility display classes (e.g. `<div hidden class="flex">` will remain hidden).

### 10. Transforms & Gradients
- Transforms use native individual CSS properties: `translate`, `rotate`, `scale`.
  - `transform-none` no longer resets individual `rotate-*` or `scale-*` classes. Reset using `rotate-0`, `scale-100`, etc.
- Gradients retain multi-stop state across variants. Overriding a stop doesn't reset earlier stops to transparent.
