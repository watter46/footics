# TASK-185: wrapContextSafe Proxy の setter/getter this バインド修正

- **Status**: `DONE`
- **Commit**: `fix(tactical): bind target as receiver in wrapContextSafe Proxy`
- **Negative Contracts**:
  - `wrapContextSafe` 内で `Reflect.get(target, prop, receiver)` のまま `receiver` を渡すコードが残存していないこと

### Phase 1: wrapContextSafe の Proxy トラップ修正とテスト追加

### [MODIFY] `src/lib/tactical/export/tactical-phase-frame-renderer.ts`

Before:
```ts
function wrapContextSafe(
  ctx: AnyCanvasRenderingContext2D,
): AnyCanvasRenderingContext2D {
  return new Proxy(ctx, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return (val as (...args: unknown[]) => unknown).bind(target);
      }
      if (val === undefined && typeof prop === 'string') {
        return () => {};
      }
      return val;
    },
  });
}
```

After:
```ts
function wrapContextSafe(
  ctx: AnyCanvasRenderingContext2D,
): AnyCanvasRenderingContext2D {
  return new Proxy(ctx, {
    get(target, prop) {
      const val = Reflect.get(target, prop, target);
      if (typeof val === 'function') {
        return (val as (...args: unknown[]) => unknown).bind(target);
      }
      if (val === undefined && typeof prop === 'string') {
        return () => {};
      }
      return val;
    },
    set(target, prop, value) {
      return Reflect.set(target, prop, value, target);
    },
  });
}
```

### [ADD] `src/lib/tactical/export/__tests__/wrap-context-safe-proxy.test.ts`

```ts
import { describe, expect, it } from 'vitest';

describe('wrapContextSafe Proxy receiver binding', () => {
  it('binds target as receiver on get and set traps', () => {
    let lastGetThis: unknown;
    let lastSetThis: unknown;
    let storedFillStyle: unknown = '#000000';

    const target = {
      get fillStyle() {
        lastGetThis = this;
        return storedFillStyle;
      },
      set fillStyle(val: unknown) {
        lastSetThis = this;
        storedFillStyle = val;
      },
    };

    const proxy = new Proxy(target, {
      get(t, prop) {
        const val = Reflect.get(t, prop, t);
        if (typeof val === 'function') {
          return (val as (...args: unknown[]) => unknown).bind(t);
        }
        if (val === undefined && typeof prop === 'string') {
          return () => {};
        }
        return val;
      },
      set(t, prop, value) {
        return Reflect.set(t, prop, value, t);
      },
    });

    proxy.fillStyle = '#ffffff';
    expect(lastSetThis).toBe(target);
    expect(proxy.fillStyle).toBe('#ffffff');
    expect(lastGetThis).toBe(target);
  });
});
```
