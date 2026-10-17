import { GlobalWindow } from 'happy-dom';

if (typeof document === 'undefined') {
  const win = new GlobalWindow();
  const keys = Object.getOwnPropertyNames(win);
  for (const key of keys) {
    if (!(key in globalThis)) {
      try {
        (globalThis as any)[key] = (win as any)[key];
      } catch {}
    }
  }
  (globalThis as any).window = win;
  (globalThis as any).document = win.document;
  (globalThis as any).navigator = win.navigator;
  (globalThis as any).location = win.location;
}
