# Biome (2.5.8) Best Practices & Anti-Patterns

**Document Version:** 1.0.0  
**Target Release:** Biome 2.5.8 (Biome 2.x Series)  
**Status:** Canonical Engineering Reference  

---

## Table of Contents
1. [Architecture & Project Configuration](#1-architecture--project-configuration)
2. [Monorepo & Multi-Project Layout](#2-monorepo--multi-project-layout)
3. [Formatting Standards & Prettier Compatibility](#3-formatting-standards--prettier-compatibility)
4. [Assist & Import Organization](#4-assist--import-organization)
5. [Linter Domains & Rule Selection](#5-linter-domains--rule-selection)
6. [Type-Informed Linting ("Biotype")](#6-type-informed-linting-biotype)
7. [Custom Linter Plugins (GritQL)](#7-custom-linter-plugins-gritql)
8. [Code Suppression Governance](#8-code-suppression-governance)
9. [CI/CD & Git Hook Integration](#9-cicd--git-hook-integration)
10. [Biome 2.5.8 Specific Highlights](#10-biome-258-specific-highlights)
11. [Anti-Patterns & How to Avoid Them](#11-anti-patterns--how-to-avoid-them)

---

## 1. Architecture & Project Configuration

### Best Practices

- **Explicit Schema Declaration:** Always specify `$schema` pointing to the exact patch version URL (e.g. `https://biomejs.dev/schemas/2.5.8/schema.json`) to enable editor auto-completion, linting of `biome.json`, and immediate warning on obsolete fields.
- **Enable VCS Integration for Scoping:** Configure `vcs.enabled: true`, `vcs.clientKind: "git"`, and `vcs.useIgnoreFile: true`. This prevents Biome from processing build artifacts (`dist/`, `.next/`, `node_modules/`) by reusing `.gitignore` and `.git/info/exclude`.
- **Manage Scope via `files.includes` (Not CLI Globs):** In Biome 2.x, globs inside `biome.json` are evaluated relative to the configuration file. Do not rely on shell glob expansion (e.g. `biome check src/**`), because shells interpret globs differently across Linux, macOS, and Windows.
- **Set File Size Limits:** Large generated bundles can crash AST workers; maintain `files.maxSize: 1048576` (1MB) to protect daemon processes.

```jsonc
// biome.json
{
  "$schema": "https://biomejs.dev/schemas/2.5.8/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true,
    "defaultBranch": "main"
  },
  "files": {
    "includes": [
      "src/**",
      "tests/**",
      "*.config.ts",
      "package.json"
    ],
    "ignoreUnknown": true,
    "maxSize": 1048576
  }
}
```

---

## 2. Monorepo & Multi-Project Layout

### Best Practices

- **Use Root Base Configuration:** Create a root `biome.json` with project-wide defaults (shared formatter, VCS settings, recommended rules).
- **Inherit via Microsyntax (`extends: "//"`):** In nested package configuration files, use `"extends": "//"` to automatically inherit from the workspace root configuration without hardcoding relative path traversal (`../../biome.json`).
- **Explicitly Disable `root` in Nested Packages:** Child configs automatically treat `"root": false` when `"extends": "//"` is present, but declaring `"root": false` explicitly prevents daemon workspace confusion.
- **Package-Specific Overrides:** If a specific package has different lint requirements (e.g. CLI tools needing `console.log` or tests permitting `any`), apply rule overrides inside that package's `biome.json`.

```jsonc
// packages/cli/biome.json
{
  "$schema": "https://biomejs.dev/schemas/2.5.8/schema.json",
  "root": false,
  "extends": "//",
  "linter": {
    "rules": {
      "suspicious": {
        "noConsole": "off"
      }
    }
  }
}
```

---

## 3. Formatting Standards & Prettier Compatibility

Biome's formatter matches ~97% of Prettier's AST printing but operates orders of magnitude faster. However, Biome's defaults differ from Prettier:

### Best Practices

- **Explicitly Choose Indentation Style:** Biome defaults to tabs (`indentStyle: "tab"`). If migrating from Prettier or maintaining team standards of 2 spaces, configure `indentStyle: "space"` and `indentWidth: 2`.
- **Set `formatWithErrors: false`:** Never format syntactically invalid files in production/CI. Leaving this `false` prevents the formatter from corrupting partial or broken code.
- **Configure `package.json` Multi-line Formatting:** In Biome 2.x, `package.json` expands arrays and objects across multiple lines by default. To retain compact dependencies, add an override with `"expand": "auto"`.
- **Enable CSS & JSON Support:** Activate native formatters for CSS and JSON to standardize stylesheets and manifest files without external tools.

```jsonc
// Formatting configuration for Prettier parity
{
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 80,
    "lineEnding": "lf",
    "bracketSpacing": true,
    "attributePosition": "auto"
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
  "overrides": [
    {
      "includes": ["package.json"],
      "json": {
        "formatter": {
          "expand": "auto"
        }
      }
    }
  ]
}
```

---

## 4. Assist & Import Organization

In Biome 2.x, import sorting and AST transforms were decoupled from the formatter and moved to the **Assist** subsystem.

### Best Practices

- **Activate Assist for Imports:** Enable `assist.actions.source.organizeImports: "on"`.
- **Respect Protocol-Aware Import Ordering:** Biome 2.x standardizes module sorting:
  1. Built-in modules with protocols (`node:fs`, `node:path`)
  2. Protocol packages (`npm:*`, `jsr:*`)
  3. External third-party packages (`react`, `next`, `lucide-react`)
  4. Absolute imports & path aliases (`@/components/*`, `~/lib/*`, `#*`)
  5. Relative imports (`./utils`, `../types`)
- **Do Not Separate Imports with Blank Lines Expecting Custom Blocks:** Biome 2.x merges and reorganizes import statements uniformly across blank lines. Use custom groupings under `assist.actions.source.organizeImports.options.groups` if strict section separation is needed.

```jsonc
// biome.json
{
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  }
}
```

---

## 5. Linter Domains & Rule Selection

### Best Practices

- **Use Recommended Ruleset as Baseline:** Keep `linter.rules.recommended: true`. Recommended rules only flag verifiable bugs, severe anti-patterns, and critical security issues.
- **Opt into Framework Domains:** Instead of manually cherry-picking dozens of rules, activate framework-specific domain suites under `linter.domains`.
  - React projects: `"react": "recommended"`
  - Next.js projects: `"next": "recommended"`
  - Test files: `"test": "recommended"`
  - Monorepo workspace analysis: `"project": "recommended"`
- **Avoid Mutually Conflicting Domains:** Never enable both `"react": "all"` and `"solid": "all"` in the same scope, as their JSX lifecycles and reactivity primitives conflict.
- **Treat Style Rules as Warnings/Informational:** In Biome 2.x, style rules no longer trigger build errors by default. Enforce only specific high-value conventions (e.g. `useTemplate`, `noNonNullAssertion`) at `"error"` level when strictly necessary.

```jsonc
// Recommended Linter Configuration
{
  "linter": {
    "enabled": true,
    "domains": {
      "react": "recommended",
      "test": "recommended",
      "project": "recommended"
    },
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "useExhaustiveDependencies": "warn"
      },
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
      "suspicious": {
        "noExplicitAny": "warn",
        "noArrayIndexKey": "warn"
      }
    }
  }
}
```

---

## 6. Type-Informed Linting ("Biotype")

Biome 2.x introduces native type inference written in Rust.

### Best Practices

- **Enable Project Domain Rules for Async Safety:** Rules such as `noFloatingPromises` and `noMisusedPromises` prevent unhandled promise rejections without needing the multi-second overhead of TypeScript compiler type-checking.
- **Do Not Treat Biome as a Replacement for `tsc`:** Biome builds a lightweight semantic type model optimized for speed. Continue running `tsc --noEmit` or a scoped type checker in your CI verification pipeline to validate full TypeScript soundness.
- **Ensure Ignored Directories Do Not Block Module Graph Resolution:** Make sure internal workspace packages are visible to the project scanner so cross-module type resolution succeeds.

---

## 7. Custom Linter Plugins (GritQL)

Biome 2.x embeds GritQL as its native query and rewrite engine, replacing the need for bespoke JavaScript-based ESLint plugins.

### Best Practices

- **Use `.grit` File Extension:** Place custom rules in `.grit` files (e.g. `plugins/no-raw-query.grit`).
- **Always Provide Explicit Error Spans & Messages:** Use `register_diagnostic` to pinpoint the offending node and provide actionable guidance.
- **Mark Safe Rewrites with `fix_kind = "safe"`:** Only mark automated code fixes as `"safe"` if the rewrite is guaranteed to produce identical runtime semantics. Omission defaults to `"unsafe"`.
- **Scope Plugins to Target Files:** Restrict plugins using the `includes` key inside the plugin registration object to avoid running JS queries on CSS/JSON files.

```grit
// plugins/prefer-console-info.grit
`console.log($msg)` as $call where {
  register_diagnostic(
    span = $call,
    message = "Use `console.info` instead of `console.log` for structured logging.",
    severity = "warn",
    fix_kind = "safe"
  ),
  $call => `console.info($msg)`
}
```

```jsonc
// Registering plugins in biome.json
{
  "plugins": [
    {
      "path": "./plugins/prefer-console-info.grit",
      "includes": ["src/**/*.ts", "!src/**/*.test.ts"]
    }
  ]
}
```

---

## 8. Code Suppression Governance

### Best Practices

- **Follow Biome 2.x Suppression Grammar:**
  - Inline suppression: `// biome-ignore lint/<group>/<rule>: <mandatory explanation>`
  - File-wide suppression: `// biome-ignore-all lint/<group>/<rule>: <mandatory explanation>`
  - Range suppression: `// biome-ignore-start ...` and `// biome-ignore-end`
- **Mandatory Justification:** Every suppression comment MUST include a colon followed by a clear, human-readable justification (`: reason`). Suppression comments without explanations are treated as syntax errors.
- **Suppress the Most Specific Rule:** Never suppress entire rule groups (e.g. `// biome-ignore lint: reason` or `// biome-ignore lint/suspicious: reason`). Always target the exact rule (e.g. `// biome-ignore lint/suspicious/noExplicitAny: third-party untyped API`).
- **Use Native Language Comment Delimiters:**
  - JavaScript / TypeScript: `// biome-ignore ...`
  - CSS: `/* biome-ignore ... */`
  - HTML / JSX templates: `<!-- biome-ignore ... -->`

---

## 9. CI/CD & Git Hook Integration

### Best Practices

- **Use `biome ci` in Automated Pipelines:** Always use `biome ci .` in GitHub Actions or CI environments. Unlike `biome check`, `biome ci`:
  - Never mutates files (disallows `--write` / `--fix`).
  - Emits native GitHub Actions annotations.
  - Automatically respects CPU thread limits.
  - Returns a strict non-zero exit status on errors.
- **Stage-Aware Git Pre-Commit Hooks:** In pre-commit hooks, pass `--staged` and `--no-errors-on-unmatched`.
- **Fail Early on Unstaged Partial Diff (`MM` State):** When auto-formatting staged files, prevent git index corruption by checking if staged files also have unstaged changes before running `--write`.

```yaml
# .github/workflows/quality.yml
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
      - name: Run Biome CI
        run: biome ci .
```

---

## 10. Biome 2.5.8 Specific Highlights

When adopting or maintaining Biome version 2.5.8:

1. **React Compiler Linter Mode (`useReactCompiler`):**
   - Enable `linter.rules.nursery.useReactCompiler: "warn"` to catch React 19 memoization leaks and violations of React Rules (e.g. mutating state directly, reading ref values during render).
2. **Svelte 5 Runes Migration (`noSvelteLegacyConst`):**
   - In Svelte/SvelteKit codebases, this rule automatically flags legacy `{@const}` blocks and recommends `$derived(...)` declarations.
3. **TC39 Explicit Resource Management (`await using`):**
   - Biome 2.5.8 supports TC39 Disposable / AsyncDisposable resources. `useAwait` no longer produces false-positive warnings on functions containing `await using` declarations.
4. **CSS Custom Property Syntax Validation (`@property`):**
   - Biome 2.5.8 parses and checks `@property` declarations. Ensure `initial-value` matches the syntax descriptor (e.g., `<color>`, `<length>`).
5. **HTML Inline Styles:**
   - HTML and JSX `style="..."` attribute strings are now parsed as CSS. CSS rules (e.g. property naming, value validation) apply to inline styles.

---

## 11. Anti-Patterns & How to Avoid Them

### 1. Configuration Anti-Patterns

#### ❌ Running ESLint/Prettier alongside Biome without clear boundaries
*Problem:* Running Prettier and Biome Formatter concurrently on the same codebase leads to continuous git merge conflicts and thrashing in CI because their formatting choices (e.g. indentation, line wrapping, ES2015 unquoting) subtly diverge.  
*Solution:* Disable Prettier and ESLint formatting rules completely. If retaining ESLint for unsupported custom plugins, use `eslint-config-prettier` to disable all formatting in ESLint and let Biome handle 100% of formatting.

#### ❌ Relying on Shell Glob Expansion on CLI
*Problem:* Running `biome check src/**/*.ts` relies on the host shell to expand paths. In large projects, this exceeds the operating system argument buffer limit (`E2BIG`) and bypasses `biome.json` path relativity.  
*Solution:* Define globs in `files.includes` inside `biome.json` and invoke Biome on the workspace root:
```bash
# BAD
npx @biomejs/biome check src/**/*.ts

# GOOD
npx @biomejs/biome check .
```

#### ❌ Using Legacy Biome v1 Configuration Keys
*Problem:* Keys like `ignore`, `include`, top-level `organizeImports`, and `--config-path` were deprecated or removed in Biome v2.  
*Solution:* Run `biome migrate --write` to update to the new schema:
```jsonc
// BAD (v1 syntax)
{
  "files": {
    "ignore": ["dist/**"]
  },
  "organizeImports": {
    "enabled": true
  }
}

// GOOD (v2 syntax)
{
  "files": {
    "includes": ["src/**", "!dist/**"]
  },
  "assist": {
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  }
}
```

---

### 2. CLI & Execution Anti-Patterns

#### ❌ Running `biome check --write` in CI
*Problem:* Running `--write` in CI will modify files on the CI runner, leaving untracked git diffs without failing the build, masking formatting defects.  
*Solution:* Always run `biome ci .` in CI pipelines.

#### ❌ Blindly Applying Unsafe Fixes (`--write --unsafe`)
*Problem:* Safe fixes (`--write`) guarantee identical AST execution semantics. Unsafe fixes (`--unsafe`) can alter program runtime behavior (e.g. converting `let` to `const`, altering JSX fragments, or changing coercion). Blindly running `--unsafe` in automated scripts risks introducing production regressions.  
*Solution:* Only run `--write --unsafe` interactively with an active git status review:
```bash
# BAD (automated without review)
npx @biomejs/biome check --write --unsafe

# GOOD (standard automated fix)
npx @biomejs/biome check --write

# ACCEPTABLE (manual review workflow)
npx @biomejs/biome check --write --unsafe && git diff
```

---

### 3. Suppression Anti-Patterns

#### ❌ Unjustified or Overly Broad Suppressions
*Problem:* Blanket suppressions disable all linter rules and hide future bugs. Missing justification comments make code unmaintainable.

```typescript
// ❌ BAD: Overly broad, no explanation
// biome-ignore lint: bad

// ❌ BAD: Rome legacy syntax without colon explanation
// biome-ignore lint(suspicious/noExplicitAny)

// ✅ GOOD: Specific rule targeted with clear justification
// biome-ignore lint/suspicious/noExplicitAny: legacy payload requires dynamic deserialization
const payload: any = JSON.parse(raw);
```

#### ❌ Leaving Dangling Unused Suppressions
*Problem:* Suppressing a rule when no diagnostic is produced clutters the codebase and hides actual warnings.  
*Solution:* Keep `linter.rules.recommended: true`, which flags unneeded suppression comments as warnings.

---

### 4. Rule Misconfigurations

#### ❌ Enabling Mutually Incompatible Framework Domains
*Problem:* Activating contradictory frameworks (e.g. `react` and `solid`) causes impossible lint conflicts (e.g. React requires immutable props passing while Solid requires property access tracking).  
*Solution:* Only enable domains relevant to each package's actual runtime.

```jsonc
// ❌ BAD
{
  "linter": {
    "domains": {
      "react": "all",
      "solid": "all"
    }
  }
}

// ✅ GOOD
{
  "linter": {
    "domains": {
      "react": "recommended"
    }
  }
}
```

#### ❌ Disabling `vcs.useIgnoreFile` in Git Projects
*Problem:* When `vcs.useIgnoreFile` is `false`, Biome attempts to traverse `node_modules`, `.git`, temporary output folders, and cache directories, causing massive slowdowns and memory consumption.  
*Solution:* Always set `vcs.enabled: true` and `vcs.useIgnoreFile: true`.
