# Tailwind CSS v4 (v4.3.3) Best Practices & Anti-Patterns

This guide provides definitive rules, patterns, and anti-patterns for developing applications with Tailwind CSS v4 (tested and verified through version 4.3.3).

---

## 1. Architectural & Configuration Best Practices

### 1.1 Embrace CSS-First Configuration
- **Rule:** Configure themes, custom utilities, variants, and source directives directly in your CSS files using native at-rules (`@theme`, `@utility`, `@custom-variant`, `@source`).
- **Rationale:** Tailwind v4 moves away from JavaScript configuration files (`tailwind.config.js`). CSS-first configuration enables native CSS variable generation, lightning-fast Rust-based parsing, zero-runtime overhead, and direct interoperability with vanilla CSS and inline styles.
- **Implementation:**
  ```css
  /* app/globals.css */
  @import "tailwindcss";

  @theme {
    --font-display: "Inter", sans-serif;
    --color-brand-500: oklch(0.62 0.22 260);
    --color-brand-600: oklch(0.55 0.24 260);
  }
  ```

### 1.2 Use `@theme inline` for Dynamic Runtime Tokens
- **Rule:** When your theme tokens reference other dynamic CSS variables that are updated dynamically (such as theme toggles or shadcn/ui design tokens in `:root` and `.dark`), declare them inside `@theme inline`.
- **Rationale:** Standard `@theme` inlines literal values at build time. `@theme inline` preserves runtime CSS variable referencing without breaking Tailwind's generated utility mapping.
- **Example:**
  ```css
  @theme inline {
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-primary: var(--primary);
    --radius-lg: var(--radius);
  }

  :root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --radius: 0.625rem;
  }

  .dark {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --primary: oklch(0.922 0 0);
  }
  ```

### 1.3 Choose the Right Tooling Adapter
- **Vite Projects:** Use `@tailwindcss/vite`. It bypasses PostCSS entirely, leveraging Vite's internal AST pipeline for maximum HMR speed.
  ```ts
  // vite.config.ts
  import { defineConfig } from 'vite';
  import tailwindcss from '@tailwindcss/vite';

  export default defineConfig({
    plugins: [tailwindcss()],
  });
  ```
- **Next.js & PostCSS Frameworks:** Use `@tailwindcss/postcss`. Remove `autoprefixer` and `postcss-import` from `postcss.config.mjs` as Tailwind v4 handles these natively.
  ```javascript
  // postcss.config.mjs
  export default {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  };
  ```
- **CLI / Standalone:** Use `@tailwindcss/cli`. Use the `--watch --poll[=ms]` flag (introduced in v4.3.3) if operating inside Docker volumes or network filesystems where inotify events do not propagate.

---

## 2. Utility & Variant Implementation Best Practices

### 2.1 Extending vs. Overriding Tokens
- **Extending Tokens:** Add custom tokens directly inside `@theme`. They will become available alongside default Tailwind tokens.
  ```css
  @theme {
    --color-neon-coral: #ff5566;
  }
  /* Generates bg-neon-coral, text-neon-coral, border-neon-coral */
  ```
- **Overriding Specific Namespaces:** Reset a specific category to wipe out default presets while keeping others.
  ```css
  @theme {
    --color-*: initial; /* Clears all default colors */
    --color-primary: #1e40af;
    --color-secondary: #0f172a;
  }
  ```
- **Completely Blank Theme:** Use `--*: initial;` to clear all default fonts, colors, spacing, and breakpoints.

### 2.2 Register Custom Utilities with `@utility`
- **Rule:** Do not register custom utilities using `@layer utilities`. Use the dedicated `@utility` directive instead.
- **Rationale:** Utilities defined via `@utility` automatically participate in Tailwind's variant engine (e.g. `hover:tab-4`, `md:tab-4`, `focus:tab-4`) and are automatically sorted by property specificity.
- **Example:**
  ```css
  /* Simple utility */
  @utility content-auto {
    content-visibility: auto;
  }

  /* Functional utility mapped to theme */
  @utility tab-* {
    tab-size: --value(--tab-size-*);
  }

  /* Bare integer utility */
  @utility elevation-* {
    box-shadow: 0 var(--value(integer))px calc(var(--value(integer)) * 2px) rgba(0, 0, 0, 0.15);
  }
  ```

### 2.3 Custom Variants with `@custom-variant`
- **Rule:** Define custom states or theme selectors using `@custom-variant`.
- **Example:**
  ```css
  /* Class-based dark mode */
  @custom-variant dark (&:is(.dark *));

  /* Complex compound variant with slot */
  @custom-variant theme-midnight {
    &:where([data-theme="midnight"] *) {
      @slot;
    }
  }
  ```

### 2.4 Use Modern Color Spaces (OKLCH)
- **Rule:** Define color systems using `oklch(...)`.
- **Rationale:** OKLCH guarantees perceptual uniformity (lightness remains identical across different hues) and access to wide-gamut P3 displays. Tailwind v4's internal color interpolation algorithms are optimized for OKLCH.

### 2.5 Scoped CSS & CSS Modules via `@reference`
- **Rule:** In Vue, Svelte, Astro, or CSS Modules where `<style>` blocks are compiled separately, import your main stylesheet using `@reference` rather than `@import`.
- **Rationale:** `@reference` exposes theme variables and utility classes to `@apply` without re-emitting the compiled Tailwind bundle into each component chunk.
- **Example:**
  ```vue
  <!-- Button.vue -->
  <template>
    <button class="btn-custom">Submit</button>
  </template>

  <style scoped>
  @reference "@/app/globals.css";

  .btn-custom {
    @apply inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground;
  }
  </style>
  ```

---

## 3. Class Usage & Modern Styling Rules

### 3.1 Use Native Container Queries
- Container queries are built into core in v4. Do not install `@tailwindcss/container-queries`.
  ```html
  <div class="@container">
    <div class="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3">
      <!-- Cards -->
    </div>
  </div>
  ```

### 3.2 Prefer Flex/Grid `gap-*` Over `space-x-*` / `space-y-*`
- In v4, `space-*` selectors use `:where(& > :not(:last-child))`, which can produce layout side-effects when child elements have margins or display changes.
- **Best Practice:** Use `flex flex-col gap-4` or `grid gap-4`.

### 3.3 Explicit Colors on Borders and Rings
- Because default borders and rings use `currentColor` in v4, always declare both the width and color utility if you do not want to inherit text color.
  ```html
  <!-- Preferred -->
  <div class="border border-border">...</div>
  <button class="focus:ring-2 focus:ring-ring">...</button>
  ```

### 3.4 New Arbitrary CSS Variable Syntax
- Use the modern shorthand syntax `property-(--variable)` instead of `property-[var(--variable)]`:
  ```html
  <!-- v4 Preferred -->
  <div class="bg-(--brand-color) text-(--brand-text)">...</div>
  ```

---

## 4. Critical Anti-Patterns & Pitfalls

### Anti-Pattern 1: Dynamic Class Name Interpolation
- **Bad:**
  ```tsx
  // Broken: Tailwind scanner cannot evaluate runtime JavaScript strings!
  function Badge({ color }: { color: "red" | "blue" }) {
    return <span class={`bg-${color}-500 text-white`}>Badge</span>;
  }
  ```
- **Good:**
  ```tsx
  // Correct: Full literal strings remain visible to the scanner
  const colorMap = {
    red: "bg-red-500",
    blue: "bg-blue-500",
  } as const;

  function Badge({ color }: { color: "red" | "blue" }) {
    return <span class={`${colorMap[color]} text-white`}>Badge</span>;
  }
  ```

---

### Anti-Pattern 2: Mixing Preprocessors (Sass/SCSS/Less) with Tailwind v4
- **Bad:**
  ```scss
  /* main.scss */
  @import "tailwindcss";
  .card {
    $padding: 16px;
    padding: $padding;
  }
  ```
- **Why it's bad:** Tailwind CSS v4 acts as its own compiler pipeline (via Lightning CSS). Running Sass or Less ahead of or behind Tailwind causes syntax conflicts with `@theme`, `@utility`, `@variant`, and `@reference`.
- **Good:** Write vanilla CSS with native CSS variables and nesting.

---

### Anti-Pattern 3: Retaining Legacy v3 Config & Build Artifacts
- **Bad:**
  ```js
  // postcss.config.js with v3 dependencies
  module.exports = {
    plugins: {
      'postcss-import': {},
      tailwindcss: {},
      autoprefixer: {},
    },
  };
  ```
- **Why it's bad:** Causes double-compilation, duplicate vendor prefixing, and build slowdowns.
- **Good:**
  ```javascript
  // postcss.config.mjs
  export default {
    plugins: {
      '@tailwindcss/postcss': {},
    },
  };
  ```

---

### Anti-Pattern 4: Overusing `@apply` for Component Abstraction
- **Bad:**
  ```css
  /* Bloats CSS bundle and destroys utility-first maintainability */
  .card-header-title {
    @apply text-lg font-semibold tracking-tight text-foreground pb-2;
  }
  ```
- **Good:** Create UI components in your template layer (React, Vue, Svelte, or Web Components) using utility classes directly.

---

### Anti-Pattern 5: Using Prefix `!` Instead of Postfix `!`
- **Bad (Deprecated in v4):**
  ```html
  <div class="!flex !p-4">...</div>
  ```
- **Good (v4 Syntax):**
  ```html
  <div class="flex! p-4!">...</div>
  ```

---

### Anti-Pattern 6: Assuming Right-to-Left Variant Stacking
- **Bad:**
  Assuming `hover:focus:bg-blue-500` behaves like v3 (where evaluation was right-to-left).
- **Good:**
  In v4, stacked variants evaluate Left-to-Right matching native CSS. Ensure order-sensitive variants (like direct children `*:` or typography `prose-headings:`) are ordered logically from left to right.

---

### Anti-Pattern 7: Relying on `transform` Utility to Reset Individual Transforms
- **Bad:**
  ```html
  <!-- Will NOT reset rotate-45 in v4! -->
  <div class="rotate-45 md:transform-none">...</div>
  ```
- **Good:**
  ```html
  <!-- Reset the individual property -->
  <div class="rotate-45 md:rotate-0">...</div>
  ```

---

### Anti-Pattern 8: Commas in Arbitrary Grid/Positioning Values
- **Bad:**
  ```html
  <!-- Commas are no longer automatically converted to spaces in v4! -->
  <div class="grid-cols-[200px,1fr]">...</div>
  ```
- **Good:**
  ```html
  <div class="grid-cols-[200px_1fr]">...</div>
  ```

---

### Anti-Pattern 9: Using `:root` for Design Tokens Intended as Utility Generators
- **Bad:**
  ```css
  :root {
    --color-accent-teal: #14b8a6;
  }
  /* Does NOT generate bg-accent-teal or text-accent-teal utility classes! */
  ```
- **Good:**
  ```css
  @theme {
    --color-accent-teal: #14b8a6;
  }
  /* Automatically generates bg-accent-teal, text-accent-teal, etc. */
  ```

---

### Anti-Pattern 10: Relying on Mobile Hover States
- In v4, `hover:` is wrapped in `@media (hover: hover)`. Touch devices that tap elements will not trigger `hover:` classes.
- **Best Practice:** Use `active:`, `focus:`, or explicit JavaScript state toggles for touch interactions.

---

## 5. Summary Checklist for Code Reviews

- [ ] Is configuration written in CSS via `@theme` or `@theme inline`?
- [ ] Are custom utilities defined using `@utility` rather than `@layer utilities`?
- [ ] Are custom variants defined using `@custom-variant`?
- [ ] Are modern arbitrary values using parenthesis syntax: `var-(--token)`?
- [ ] Are borders and rings styled with an explicit color (preventing accidental `currentColor`)?
- [ ] Are PostCSS configs clean of redundant `autoprefixer` and `postcss-import`?
- [ ] Are scoped component `<style>` blocks using `@reference`?
- [ ] Are important modifiers placed at the end (`class!`) rather than at the start (`!class`)?
