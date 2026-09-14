# Konva 10 (10.3.0) & React-Konva (19.2.5) Raw Research & Source Documentation

**Research Date:** September 15, 2026  
**Target Packages:**  
- `konva@10.3.0` (Lineage: 10.0.0 -> 10.1.0 -> 10.2.0 -> 10.3.0 -> 10.3.1 -> 10.3.2 -> 10.3.3 -> 10.4.0)
- `react-konva@19.2.5` (Lineage: 19.0.0 -> 19.0.9 -> 19.0.10 -> 19.2.0 -> 19.2.1 -> 19.2.2 -> 19.2.3 -> 19.2.4 -> 19.2.5 -> 19.2.6 -> 19.2.7)

---

## 1. Package Metadata & Installation

### 1.1 `konva`
- **Current Major:** Konva 10
- **Version Referenced:** `10.3.0` (with 10.3.x/10.4.0 enhancements)
- **Author:** Anton Lavrenov
- **License:** MIT
- **Repository:** `https://github.com/konvajs/konva`
- **Official Docs:** `https://konvajs.org/`
- **Installation:**
  ```bash
  npm install konva
  ```
- **Module Format:** Pure ES Modules by default. CommonJS requires default import:
  ```javascript
  // CommonJS
  const Konva = require('konva').default;

  // ESM / TypeScript
  import Konva from 'konva';
  ```
- **Node.js Environment / Backends (Major Breaking Change in v10):**
  Konva v10 dropped default `canvas` dependency to avoid native binary compilation in SSR/Next.js environments.
  For Node.js backend rendering (headless canvas, image export):
  ```bash
  # Option A: Standard Node Canvas
  npm install canvas
  # In code:
  import Konva from 'konva';
  import 'konva/canvas-backend';

  # Option B: Skia Canvas (faster, modern)
  npm install skia-canvas
  # In code:
  import Konva from 'konva';
  import 'konva/skia-backend';
  ```

### 1.2 `react-konva`
- **Target Version:** `19.2.5`
- **React Compatibility:** React 19 (`^19.2.0`), React DOM (`^19.2.0`)
- **Author:** Anton Lavrenov
- **License:** MIT
- **Repository:** `https://github.com/konvajs/react-konva`
- **Installation:**
  ```bash
  npm install react-konva konva
  ```
- **Peer Dependencies:**
  - `react`: `^19.2.0`
  - `react-dom`: `^19.2.0`
  - `konva`: `>=9.0.0` (v10 recommended)

---

## 2. Official Documentation & Primary Reference URLs

- **Konva Official Website:**  
  `https://konvajs.org/`
- **Konva Overview & Core Architecture:**  
  `https://konvajs.org/docs/overview.html`
- **Konva Full API Reference:**  
  `https://konvajs.org/api/Konva.html`
- **Konva GitHub Changelog:**  
  `https://github.com/konvajs/konva/blob/master/CHANGELOG.md`
- **Konva GitHub Releases:**  
  `https://github.com/konvajs/konva/releases`
- **React-Konva Official Tutorial & Docs Hub:**  
  `https://konvajs.org/docs/react/index.html`
- **React-Konva GitHub Repository:**  
  `https://github.com/konvajs/react-konva`
- **React-Konva GitHub Releases:**  
  `https://github.com/konvajs/react-konva/releases`
- **Performance Guidelines:**
  - All Performance Tips: `https://konvajs.org/docs/performance/All_Performance_Tips.html`
  - Layer Management: `https://konvajs.org/docs/performance/Layer_Management.html`
  - Shape Caching: `https://konvajs.org/docs/performance/Shape_Caching.html`
  - Listening False Optimization: `https://konvajs.org/docs/performance/Listening_False.html`
  - Disable Perfect Draw: `https://konvajs.org/docs/performance/Disable_Perfect_Draw.html`
  - Optimize Strokes: `https://konvajs.org/docs/performance/Optimize_Strokes.html`
  - Avoid Memory Leaks: `https://konvajs.org/docs/performance/Avoid_Memory_Leaks.html`
- **Transformer & Selection:**  
  `https://konvajs.org/docs/react/Transformer.html`
  `https://konvajs.org/docs/select_and_transform/Basic_demo.html`
- **react-konva Utilities (`react-konva-utils`):**  
  `https://github.com/konvajs/react-konva-utils`

---

## 3. Konva 10 Release Highlights & Evolution

### Konva 10.0.0
- **Pure ESM Migration:** Dropped legacy CommonJS bundler patterns.
- **SSR/Next.js Decoupling:** Node.js native `canvas` dropped from default imports. SSR bundles no longer trigger node-gyp or canvas native build failures.
- **DOM-aligned Text Rendering:** Text position and bounding metrics reworked to match standard DOM/CSS layout. Legacy behavior available via `Konva.legacyTextRendering = true`.
- **Native CSS Filters:** `node.filters(['blur(10px)'])` uses GPU hardware acceleration directly in Chrome and Firefox with automated functional filter fallback for Safari.
- **`charRenderFunc` on `Konva.Text`:** Callback function `({ context, index }) => void` for per-character transformation and style overrides.
- **`Konva.Filters.Brightness`:** Replaced deprecated `Konva.Filters.Brighten` to align with CSS filter semantics.
- **`miterLimit` & `cornerRadius`:** Added `cornerRadius` support to `Konva.RegularPolygon` and `miterLimit` to `Konva.Shape`.
- **Canvas Farbling Mitigation:** Hit detection updated to handle canvas fingerprint protection in privacy-focused browsers (e.g., Brave).

### Konva 10.1.0 & 10.2.0
- **`rotateAnchorAngle` on `Transformer`:** Enables customizable positioning of the rotation handle around the bounding box.
- **Cache Memory Optimization:** Mitigated memory footprint on large node caches.
- **Text Annotation:** Underline offset option added.

### Konva 10.3.0
- **RTL Text Support on `TextPath`:** Added `direction` attribute to `TextPath` for right-to-left languages.

### Konva 10.3.1 – 10.3.3
- **CSS Color 4 & `hsla()`:** Added modern color syntax parsing.
- **Analytical Curve Solvers:** `Path.getSelfRect()` solves cubic and quadratic bezier curves analytically instead of 100-point sampling (9x calculation speedup with exact bounding boxes).
- **`listening: false` Memory Deallocation (10.3.2):** Layers with `listening: false` completely deallocate their stage-sized hit canvas buffer, saving tens of megabytes of RAM/VRAM.
- **Lazy Stage Buffer Canvas:** Buffer canvases created empty and only allocated when features like `perfectDraw` or `shape.intersects()` are invoked.
- **Pointer Capture:** `setPointerCapture()` correctly tracks pointers dragging beyond stage bounds.

### Konva 10.4.0+
- **`destroy` Lifecycle Event:** Emitted immediately when `node.destroy()` begins. `Transformer` automatically removes destroyed nodes from `nodes()`.
- **Grapheme-Aware Text:** Proper Unicode emoji flags and ZWJ (Zero Width Joiner) sequence handling for `letterSpacing`, wrapping, and `charRenderFunc`.
- **Direct Anchor Resolution:** Transformer resolves handles directly without selector lookups.
- **Thin Line Hit Detection:** Pixel-accurate hit detection for sub-2px lines.

---

## 4. React-Konva 19.x Release Highlights

### React 19 Alignment
- Major version numbering aligns directly with React (`react-konva@19` for `react@19`).
- Reconciler architecture updated to support React 19 reconciler (`react-reconciler`).
- Native context forwarding into `<Stage>` works out of the box (no context bridge needed).

### Key 19.x Changes & Fixes
- **v19.2.5:**
  - Flush pending reconciler work after Konva event handlers to ensure state consistency.
  - Test suite cleanup and production full-matrix test execution.
  - CI build order fix ensuring `es/` exists prior to SSR tests.
- **v19.2.4:**
  - Addressed MobX/state store race conditions via async `scheduleMicrotask` + `flushSyncWork`.
  - Removed redundant `flushSyncFromReconciler` wrapper.
- **v19.2.3:**
  - Corrected component unmount execution order for nested canvas nodes.
- **v19.2.2:**
  - Fixed render effects order.
- **v19.2.1:**
  - TypeScript interface fixes for `onTap` and `onDblTap` to use `TouchEvent`.
  - Fixed Stage re-ordering in React `StrictMode`.
  - Migrated test suite to Vitest.
- **v19.0.10:**
  - Added `bridge` into type definitions for explicit context bridging scenarios.

---

## 5. Architectural Raw Insights

### 5.1 Canvas Memory Footprint Calculation
- Each `Konva.Layer` creates:
  1. Scene Canvas: `stageWidth * pixelRatio * stageHeight * pixelRatio * 4 bytes`
  2. Hit Canvas: `stageWidth * 1 * stageHeight * 1 * 4 bytes`
- Example: 1920x1080 on 2x Retina Display:
  - Scene Canvas: `3840 * 2160 * 4 = 33.17 MB`
  - Hit Canvas: `1920 * 1080 * 4 = 8.29 MB`
  - Total per Layer: `~41.5 MB`
- Having 5 layers easily exceeds 200 MB memory before drawing any vectors.
- Mobile Safari enforces a 256MB–384MB total canvas limit, crashing/blanking when exceeded.
- `layer.listening(false)` in Konva 10.3.2+ frees the 8.29 MB hit canvas immediately.

### 5.2 Hit Detection Mechanism
- Konva uses a 2D color-hash lookup table.
- Each shape is drawn to an off-screen hit canvas with a unique randomized RGB color key.
- On mouse/touch interaction, `getImageData(x, y, 1, 1)` reads the pixel color and resolves the shape reference in $O(1)$ time.
- Disabling `listening` on shapes or layers bypasses hit graph drawing entirely.

### 5.3 React Reconciliation vs Konva Mutation
- Non-strict mode (default): React reconciles props only if the JSX prop value changed since the previous render. If Konva changed an attribute internally (e.g., drag move changing `x, y`), React will not re-apply the old JSX prop unless its value in state changes.
- Strict mode (`ReactKonva._setStrictMode(true)`): React re-applies all JSX props on every render, resetting any internal Konva modifications back to React state.
