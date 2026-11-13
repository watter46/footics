# TASK-184: 背景グラデーションキャッシュの描画コンテキスト分離

- **Status**: `DONE`
- **Commit**: `fix(tactical): isolate pitch radial gradient cache per canvas context`
- **Negative Contracts**:
  - `radialGradientCache` がグローバル単一の `Map<string, CanvasGradient>` のまま残存していないこと（`WeakMap<FrameRenderContext['ctx'], Map<string, CanvasGradient>>` に置換済みであること）

### Phase 1: 背景グラデーションキャッシュの ctx 分離とテスト追加

### [MODIFY] `src/lib/tactical/export/renderers/pitch-renderer.ts`

Before:
```ts
export { renderPitchMarkings2D } from './pitch-markings-2d';
export { renderPitchMarkings3D } from './pitch-markings-3d';

const radialGradientCache = new Map<string, CanvasGradient>();

/**
 * Clears the cached radial gradients used by pitch renderer.
 */
export function clearPitchRendererCache(): void {
  radialGradientCache.clear();
}

/**
 * Draws screen background (cinematic radial gradient or dark solid).
 */
export function renderScreenBackground(
  ctx: FrameRenderContext['ctx'],
  w: number,
  h: number,
  screenBackground?: ScreenBackgroundConfig,
): void {
  if (screenBackground?.type === 'dark') {
    ctx.fillStyle = '#0D0D0E';
    ctx.fillRect(0, 0, w, h);
    return;
  }

  // cinematic (or default)
  const key = `${w}x${h}`;
  let gradient = radialGradientCache.get(key);
  if (!gradient && typeof ctx.createRadialGradient === 'function') {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.max(w, h) / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    if (grad && typeof grad.addColorStop === 'function') {
      grad.addColorStop(0, '#2B2B2B');
      grad.addColorStop(1, '#050505');
      radialGradientCache.set(key, grad);
      gradient = grad;
    }
  }

  if (gradient) {
```

After:
```ts
export { renderPitchMarkings2D } from './pitch-markings-2d';
export { renderPitchMarkings3D } from './pitch-markings-3d';

let radialGradientCache = new WeakMap<
  FrameRenderContext['ctx'],
  Map<string, CanvasGradient>
>();

/**
 * Clears the cached radial gradients used by pitch renderer.
 */
export function clearPitchRendererCache(): void {
  radialGradientCache = new WeakMap<
    FrameRenderContext['ctx'],
    Map<string, CanvasGradient>
  >();
}

/**
 * Draws screen background (cinematic radial gradient or dark solid).
 */
export function renderScreenBackground(
  ctx: FrameRenderContext['ctx'],
  w: number,
  h: number,
  screenBackground?: ScreenBackgroundConfig,
): void {
  if (screenBackground?.type === 'dark') {
    ctx.fillStyle = '#0D0D0E';
    ctx.fillRect(0, 0, w, h);
    return;
  }

  // cinematic (or default)
  const key = `${w}x${h}`;
  let ctxCache = radialGradientCache.get(ctx);
  if (!ctxCache) {
    ctxCache = new Map<string, CanvasGradient>();
    radialGradientCache.set(ctx, ctxCache);
  }

  let gradient = ctxCache.get(key);
  if (!gradient && typeof ctx.createRadialGradient === 'function') {
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.max(w, h) / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    if (grad && typeof grad.addColorStop === 'function') {
      grad.addColorStop(0, '#2B2B2B');
      grad.addColorStop(1, '#050505');
      ctxCache.set(key, grad);
      gradient = grad;
    }
  }

  if (gradient) {
```

### [MODIFY] `src/lib/tactical/export/__tests__/pitch-renderer-cinematic.test.ts`

Before:
```ts
    expect(ctx.createRadialGradient).toHaveBeenLastCalledWith(
      640,
      360,
      0,
      640,
      360,
      640,
    );
  });

  it('renders solid dark background (#0D0D0E) without creating gradient when screenBackground is dark', () => {
```

After:
```ts
    expect(ctx.createRadialGradient).toHaveBeenLastCalledWith(
      640,
      360,
      0,
      640,
      360,
      640,
    );
  });

  it('isolates cached gradient per canvas context to avoid cross-context reuse', () => {
    const ctx1 = createMockContext();
    const ctx2 = createMockContext();
    const frameCtx1 = createMockFrameContext(ctx1, 1920, 1080);
    const frameCtx2 = createMockFrameContext(ctx2, 1920, 1080);

    renderPitch(frameCtx1, '16:9', false);
    expect(ctx1.createRadialGradient).toHaveBeenCalledTimes(1);
    expect(ctx2.createRadialGradient).toHaveBeenCalledTimes(0);

    // Different ctx with same size must create its own gradient
    renderPitch(frameCtx2, '16:9', false);
    expect(ctx2.createRadialGradient).toHaveBeenCalledTimes(1);
  });

  it('renders solid dark background (#0D0D0E) without creating gradient when screenBackground is dark', () => {
```
