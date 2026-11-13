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
