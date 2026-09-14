# Biome (2.5.8) Raw Research & Source Documentation

**Research Date:** September 15, 2026  
**Target Package:** `@biomejs/biome@2.5.8` (Release Date: August 11, 2026)  
**Lineage:** Rome -> Biome 1.0.0 (September 2023) -> Biome 2.0.0 "Biotype" (June 2025) -> Biome 2.5.0 (July 2026) -> Biome 2.5.8 (August 11, 2026) -> Current Branch: 2.5.13 (September 2026)  
**License:** MIT / Apache-2.0  
**Repository:** https://github.com/biomejs/biome  
**Official Website:** https://biomejs.dev  

---

## 1. Package Metadata & Architecture

### NPM Package Ecosystem
- **Core CLI / Wrapper Package:** `@biomejs/biome`
- **Native Platform Binaries (Architecture-specific downloads):**
  - `@biomejs/cli-darwin-arm64`
  - `@biomejs/cli-darwin-x64`
  - `@biomejs/cli-linux-arm64-gnu`
  - `@biomejs/cli-linux-arm64-musl`
  - `@biomejs/cli-linux-x64-gnu`
  - `@biomejs/cli-linux-x64-musl`
  - `@biomejs/cli-win32-arm64-msvc`
  - `@biomejs/cli-win32-x64-msvc`
  - `@biomejs/wasm-web` (WebAssembly build for browsers)
  - `@biomejs/wasm-nodejs` (WebAssembly build for headless JS runtimes)
- **Supported JavaScript Runtimes:**
  - Node.js: `>=18.18.0` (Recommended: Node 20.x or 22.x LTS)
  - Deno: `>=1.40.0`
  - Bun: `>=1.1.0`
  - Package Managers Supported: `pnpm`, `npm`, `yarn`, `bun`

### Core Pillars
1. **Unified Toolchain:** Single fast Rust binary replacing ESLint, Prettier, and import sorting tools.
2. **Speed & Efficiency:** Multi-threaded architecture processing tens of thousands of lines of code in milliseconds.
3. **Biotype Engine (Introduced in Biome 2.0):** Native Rust type-inference and multi-file project analysis module allowing type-informed linting (e.g. `noFloatingPromises`, `noMisusedPromises`) without requiring the TypeScript compiler (`tsc`).
4. **Extensibility via GritQL Plugins:** AST-based pattern matching and safe/unsafe rewrite rules written in declarative `.grit` files.
5. **Actionable Diagnostics:** Informative error output showing exactly why a violation occurred and providing one-click code fixes.

---

## 2. Primary Documentation & Official Sources

| Document / Topic | Canonical URL | Description |
| :--- | :--- | :--- |
| **Official Documentation Home** | https://biomejs.dev | Entry point for guides, API references, and philosophy |
| **Upgrade to Biome v2** | https://biomejs.dev/guides/upgrade-to-biome-v2/ | Migration guide detailing breaking changes from v1 to v2 |
| **Migrate from ESLint & Prettier** | https://biomejs.dev/guides/migrate-eslint-prettier/ | Automated migration subcommands (`biome migrate eslint`, `biome migrate prettier`) |
| **Configuration Reference** | https://biomejs.dev/reference/configuration/ | Comprehensive reference for `biome.json` and `biome.jsonc` schema |
| **CLI Reference** | https://biomejs.dev/reference/cli/ | CLI commands, subcommands, and operational flags |
| **Version History / Changelog** | https://biomejs.dev/internals/changelog/ | Patch-by-patch release notes across all releases including 2.5.8 |
| **Release 2.5.8 Specific Log** | https://biomejs.dev/internals/changelog/version/2-5-8/ | Direct changelog breakdown for version 2.5.8 |
| **Analyzer Suppressions** | https://biomejs.dev/analyzer/suppressions/ | Comment suppression syntax (`// biome-ignore`, `// biome-ignore-all`, etc.) |
| **Linter Plugins & GritQL** | https://biomejs.dev/linter/plugins/ | Creating custom rules using GritQL patterns and diagnostics |
| **GritQL Pattern Reference** | https://biomejs.dev/reference/gritql/ | Syntax reference for GritQL AST pattern matching |
| **VCS Integration** | https://biomejs.dev/guides/integrate-in-vcs/ | Integrating git ignore files and checking `--changed` / `--staged` files |
| **Continuous Integration** | https://biomejs.dev/recipes/continuous-integration/ | Setting up GitHub Actions, GitLab CI, and `biome ci` workflows |
| **Git Hooks** | https://biomejs.dev/recipes/git-hooks/ | Integrating with Lefthook, Husky, lint-staged, and shell hooks |
| **Big Projects & Monorepos** | https://biomejs.dev/guides/big-projects/ | Root configs, nested configs with `"extends": "//"`, and overrides |
| **Differences with Prettier** | https://biomejs.dev/formatter/differences-with-prettier/ | Intentional divergences between Biome Formatter and Prettier |
| **Linter Domains** | https://biomejs.dev/linter/domains/ | Framework/environment rule groups (`react`, `astro`, `vue`, `test`, etc.) |

---

## 3. Biome 2.5.8 Release Specifics (August 11, 2026)

The release of Biome 2.5.8 included significant enhancements across JavaScript, TypeScript, CSS, HTML, and Svelte language analyzers:

### New Rules Added
- **`useReactCompiler` (Nursery):**
  - *PR:* [#10710](https://github.com/biomejs/biome/pull/10710) | *Commit:* `0a0fbc1` | *Author:* `@dyc3`
  - *Function:* Integrates React Compiler diagnostics directly into Biome's lint mode, catching component memoization anti-patterns and rules of React violations.
- **`noSvelteLegacyConst` (Nursery):**
  - *PR:* [#11247](https://github.com/biomejs/biome/pull/11247) | *Commit:* `52b44d6` | *Author:* `@dyc3`
  - *Function:* Disallows legacy Svelte `{@const}` tags in template blocks in favor of Svelte 5 rune declaration tags using `$derived()`.
- **`noInvalidPropertyInitValue` (Nursery):**
  - *PR:* [#11187](https://github.com/biomejs/biome/pull/11187) | *Commit:* `23c0369` | *Author:* `@ematipico`
  - *Function:* Validates that `@property` CSS declarations have an `initial-value` that strictly conforms to their specified `syntax` descriptor (e.g., flags `@property --size { syntax: "<length>"; initial-value: red; }`).

### Rule Fixes & Performance Enhancements
- **`noImportCycles` Performance:**
  - *PR:* [#11251](https://github.com/biomejs/biome/pull/11251) | *Commit:* `ea9dd8a` | *Author:* `@dyc3`
  - *Improvement:* Optimized cycle-detection graph traversal algorithm, mitigating memory spikes and slow checks in deep module graphs.
- **`useAwait` Explicit Resource Management Support:**
  - *PR:* [#11252](https://github.com/biomejs/biome/pull/11252) | *Commit:* `d5f5704` | *Author:* `@Turtle-Hwan`
  - *Fix:* Resolves issue #11250; no longer incorrectly flags `async` functions that contain TC39 `await using` declarations without direct `await` expressions.
- **`noUselessUndefined` Return Type Annotations:**
  - *PR:* [#11143](https://github.com/biomejs/biome/pull/11143) | *Commit:* `6be7be1` | *Author:* `@vznh`
  - *Fix:* Resolves issue #11017; no longer flags `return undefined` when the enclosing function declares an explicit return type other than `undefined` or `void`.
- **`noMisusedPromises` Optimization:**
  - *PR:* [#11240](https://github.com/biomejs/biome/pull/11240) | *Commit:* `bd0b68d` | *Author:* `@ematipico`
  - *Fix:* Resolves issue #11223; addresses latency and CPU bottlenecks when analyzing async class methods that invoke sibling methods via `this`.
- **`noUselessFragments` Panic Fix:**
  - *PR:* [#11172](https://github.com/biomejs/biome/pull/11172) | *Commit:* `4a0bc5c` | *Author:* `@saberoueslati`
  - *Fix:* Resolves issue #10806; prevents linter panic when an unsafe auto-fix strips a fragment used directly as a JSX attribute value.
- **`noUndeclaredVariables` Vue Compatibility:**
  - *PR:* [#11227](https://github.com/biomejs/biome/pull/11227) | *Commit:* `4d603b0` | *Author:* `@saberoueslati`
  - *Fix:* Resolves issue #11178; whitelists Vue template built-in instance properties (`$slots`, `$attrs`, `$event` in inline handlers) while continuing to flag them correctly if used erroneously in `<script setup>`.
- **`noRootType` Diagnostic Clarification:**
  - *PR:* [#11272](https://github.com/biomejs/biome/pull/11272) | *Commit:* `73896e6` | *Author:* `@ematipico`
  - *Improvement:* Enhanced clarity and suggestion messages in emitted diagnostics.

### Parser & Formatter Enhancements
- **HTML `style` Attribute CSS Parsing:**
  - *PR:* [#11080](https://github.com/biomejs/biome/pull/11080) | *Commit:* `af16a0b` | *Author:* `@dyc3`
  - *Feature:* Values inside HTML/JSX inline `style="..."` attributes are parsed through Biome's CSS parser, allowing full CSS lint rules and formatting to run on inline styles.
- **CSS Comment Indentation & Placement:**
  - *PR:* [#11234](https://github.com/biomejs/biome/pull/11234) (`caefe39`): Block comments between CSS property colons and values now preserve their source indentation.
  - *PR:* [#11285](https://github.com/biomejs/biome/pull/11285) (`bca1f73`): CSS formatting now retains comments inside functional pseudo-classes and pseudo-elements (e.g., `:where(/* comment */ div)`).
- **CSS `@property` Syntax Descriptors:**
  - *PR:* [#11187](https://github.com/biomejs/biome/pull/11187) (`23c0369`): Parser correctly parses and validates CSS `@property` syntax descriptor strings.
- **Svelte Expression Object Literals:**
  - *PR:* [#11195](https://github.com/biomejs/biome/pull/11195) (`6a85588`): Fixed parser failure where expressions beginning with object literals inside Svelte templates (e.g. `<div class={{ active: isActive }}>`) caused grammar errors.
- **GritQL WASM Metavariable Matcher:**
  - *PR:* [#11173](https://github.com/biomejs/biome/pull/11173) (`481d008`): Fixed issue #10242 where GritQL queries with multiple metavariables had inconsistent pattern evaluation in WASM execution environments.

---

## 4. Biome 2.x Architectural Evolution & Breaking Changes

### 1. The "Biotype" Multi-File Analysis System
Prior to Biome v2, Biome operated purely as an isolated, single-file AST processor. Version 2.0 introduced project-wide indexing:
- **Module Graph Construction:** Traverses imported dependencies across workspaces.
- **Type Inference:** Biome builds a lightweight, high-performance semantic type model in Rust without spinning up the TypeScript Language Service (`tsserver`) or `tsc`.
- **Project Rules Domain (`linter.domains.project`):** Powers rules like `noFloatingPromises` and `noMisusedPromises`.
- **Opt-in Scoping:** Controlled via configuration to ensure minimal scanning overhead on massive codebases.

### 2. Migration from Biome v1 (Breaking Changes)
Upgrading from v1 to v2 is automated via `biome migrate --write`, but introduces key architectural adjustments:
1. **`--config-path` Removed:**
   - Removed from `biome lsp-proxy` and `biome start`.
   - *Reason:* Caused configuration collision when multiple projects were opened in editors. Editors must now use standard LSP `workspace/configuration`.
2. **`ignore` and `include` Merged into `includes`:**
   - The flawed legacy glob matcher that auto-prepended `**/` and allowed `*` to match path separators `/` was completely replaced.
   - All glob patterns in `files.includes`, `formatter.includes`, `linter.includes`, and `overrides[].includes` are now **relative to the configuration file** (not current working directory!).
   - `*` matches within a single path segment; `**` matches recursively across path segments. Negations are written with `!`.
3. **`linter.rules.all` Removed:**
   - Because Biome grew beyond 300+ rules (some mutually conflicting, e.g. React vs Solid), `all` was completely removed.
   - Recommended setup is `recommended: true` plus targeted framework domains (`react`, `test`, etc.).
4. **Style Group Rules No Longer Fail as Errors by Default:**
   - Rules under `linter.rules.style.*` emit diagnostics with warning/info severity unless explicitly set to `"error"` by the user.
5. **Import Organizer Relocated to `assist`:**
   - The top-level `organizeImports` key is replaced by `assist.actions.source.organizeImports: "on"`.
   - Import sorting defaults now follow modern standards: `node:` protocol imports are kept grouped, and exports are sorted consistently.
6. **Default `package.json` Multi-Line Formatting:**
   - Biome v2 formats objects and arrays in `package.json` across multiple lines by default. To preserve compact auto-expansion, users must add an override with `"expand": "auto"`.
7. **`assert` Syntax Deprecated in Favor of `with`:**
   - Import assertions (`import data from "./foo.json" assert { type: "json" }`) are replaced by import attributes (`with { type: "json" }`).
8. **Rome Legacy Cleaned Up:**
   - All references to `rome.json`, `// rome-ignore`, and `ROME_BINARY` are completely dropped.
   - Suppression syntax `// biome-ignore lint(group/rule)` is deprecated in favor of `// biome-ignore lint/group/rule: <explanation>`.

---

## 5. Migration Tools: ESLint & Prettier

### Automated ESLint Migration
Biome provides an automated converter:
```bash
npx @biomejs/biome migrate eslint --write
# To include rules inspired by ESLint plugins:
npx @biomejs/biome migrate eslint --write --include-inspired
```
- **Capabilities:** Reads both legacy (`.eslintrc.*`) and modern Flat Config (`eslint.config.js/mjs/cjs`).
- **Dependencies:** Requires Node.js in the environment to execute and resolve ESLint plugins (`@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-unicorn`, `eslint-plugin-jsx-a11y`).
- **Caveat:** Cyclic references in ESLint config plugins can cause migration failures; problematic plugins should be temporarily commented out during migration.

### Automated Prettier Migration
```bash
npx @biomejs/biome migrate prettier --write
```
- Reads `.prettierrc`, `.prettierrc.json`, `.prettierrc.js`.
- Translates settings (`singleQuote`, `tabWidth`, `useTabs`, `trailingComma`, `arrowParens`, `printWidth`, file overrides) directly into `formatter` and `javascript.formatter` sections of `biome.json`.

---

## 6. Full `biome.json` Configuration Schema Breakdown

```jsonc
{
  "$schema": "https://biomejs.dev/schemas/2.5.8/schema.json",
  "root": true, // Set to false in monorepo child packages
  "extends": ["//"], // Used in monorepo child packages to inherit from root
  
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true,
    "defaultBranch": "main",
    "root": "."
  },
  
  "files": {
    "includes": [
      "src/**",
      "tests/**",
      "*.config.ts",
      "!**/dist/**",
      "!**/node_modules/**"
    ],
    "ignoreUnknown": true,
    "maxSize": 1048576 // 1MB limit before skipping large files
  },
  
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space", // Default is "tab"
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 80,
    "attributePosition": "auto",
    "bracketSpacing": true,
    "useEditorconfig": true
  },
  
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  },
  
  "linter": {
    "enabled": true,
    "domains": {
      "react": "recommended",
      "test": "recommended",
      "project": "recommended"
    },
    "rules": {
      "recommended": true,
      "style": {
        "useTemplate": "error",
        "noNonNullAssertion": "warn"
      },
      "complexity": {
        "noExcessiveCognitiveComplexity": {
          "level": "warn",
          "options": { "maxAllowedComplexity": 15 }
        }
      },
      "correctness": {
        "noUnusedVariables": "error",
        "useExhaustiveDependencies": "warn"
      },
      "nursery": {
        "useReactCompiler": "warn"
      }
    }
  },
  
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "trailingCommas": "all",
      "semicolons": "always",
      "arrowParentheses": "always"
    }
  },
  
  "css": {
    "parser": {
      "tailwindDirectives": true,
      "cssModules": true
    },
    "formatter": {
      "enabled": true,
      "quoteStyle": "double"
    }
  },
  
  "json": {
    "parser": {
      "allowComments": true,
      "allowTrailingCommas": false
    },
    "formatter": {
      "enabled": true
    }
  },
  
  "plugins": [
    "./plugins/custom-no-raw-query.grit"
  ],
  
  "overrides": [
    {
      "includes": ["package.json"],
      "json": {
        "formatter": {
          "expand": "auto"
        }
      }
    },
    {
      "includes": ["tests/**"],
      "linter": {
        "rules": {
          "suspicious": {
            "noExplicitAny": "off"
          }
        }
      }
    }
  ]
}
```

---

## 7. CLI Command Surface & Operational Flags

| Command | Primary Use Case | Key Flags |
| :--- | :--- | :--- |
| `biome check <files>` | Unified check: formats, lints, organizes imports | `--write`, `--unsafe`, `--staged`, `--changed`, `--since=<branch>` |
| `biome lint <files>` | Linter only; checks and reports rule diagnostics | `--write`, `--unsafe`, `--only=<rule>`, `--skip=<rule>` |
| `biome format <files>` | Formatter only; checks code layout and indentation | `--write`, `--stdin-file-path=<path>` |
| `biome ci <files>` | CI runner: read-only, strict exit code, formats output | Controls thread pool, emits GitHub Actions / GitLab annotations |
| `biome init` | Bootstraps initial `biome.json` | `--jsonc` (generates JSON with comments) |
| `biome migrate` | Upgrades configuration across versions or tools | `--write`, `eslint`, `prettier`, `--include-inspired` |
| `biome search <query>` | AST code search across files via GritQL | `--lang=<js\|ts\|css\|json>`, `<pattern>` |
| `biome explain <rule>` | Terminal explanation of a diagnostic or rule | E.g. `biome explain noExplicitAny` |
| `biome rage` | Diagnostics dump for debugging system/daemon issues | Prints OS, CPU, memory, config resolution paths |
| `biome start` / `stop` | Controls local background daemon server | Used by IDE LSP clients for sub-millisecond response |
| `biome clean` | Cleans up daemon socket, logs, and temporary caches | Useful if daemon enters a stale state |

---

## 8. Git Hooks & Continuous Integration

### First-Party GitHub Action
```yaml
name: Code Quality
on: [push, pull_request]

jobs:
  biome:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v5
        with:
          persist-credentials: false
      - uses: biomejs/setup-biome@v2
        with:
          version: "2.5.8"
      - run: biome ci .
```

### Lefthook (`lefthook.yml`)
```yaml
pre-commit:
  commands:
    check:
      glob: "*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc,css}"
      run: npx @biomejs/biome check --write --no-errors-on-unmatched --files-ignore-unknown=true {staged_files}
      stage_fixed: true
```

### Native Git Hook (`.git/hooks/pre-commit`)
```bash
#!/bin/sh
set -eu

# Guard against partial staging changes
if git status --short | grep --quiet '^MM'; then
  printf '%s\n' "ERROR: Some staged files have unstaged changes" >&2
  exit 1
fi

npx @biomejs/biome check --write --staged --files-ignore-unknown=true --no-errors-on-unmatched
git update-index --again
```
