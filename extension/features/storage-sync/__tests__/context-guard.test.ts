import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isExtensionContextValid } from '../../../utils/context';
import { isFooticsAppHost, setupFooticsAppBridge } from '../footics-app-bridge';
import { syncOfflineQueueToStorage } from '../offline-queue';
import { addToSaveQueue, processSaveQueue } from '../save-queue';

describe('context-guard & host-guard', () => {
  const createMockBrowser = (id: string | null) => ({
    runtime: {
      id: id === null ? undefined : id,
      connect: () => ({
        onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
        onDisconnect: { addListener: vi.fn(), removeListener: vi.fn() },
        postMessage: vi.fn(),
        disconnect: vi.fn(),
      }),
      onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
      sendMessage: vi.fn().mockResolvedValue(undefined),
    },
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  });

  let originalBrowser: unknown;
  let originalChrome: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    originalBrowser = (globalThis as any).browser;
    originalChrome = (globalThis as any).chrome;
    (globalThis as any).browser = createMockBrowser('test-extension-id');
    (globalThis as any).chrome = createMockBrowser('test-extension-id');
  });

  afterEach(() => {
    (globalThis as any).browser = originalBrowser;
    (globalThis as any).chrome = originalChrome;
  });

  describe('isExtensionContextValid', () => {
    it('returns true when browser.runtime.id is a valid string', () => {
      (globalThis as any).browser = createMockBrowser('test-extension-id');
      expect(isExtensionContextValid()).toBe(true);
    });

    it('returns false when browser.runtime.id is undefined (context invalidated)', () => {
      (globalThis as any).browser = createMockBrowser(null);
      (globalThis as any).chrome = createMockBrowser(null);
      expect(isExtensionContextValid()).toBe(false);
    });

    it('returns false when accessing runtime throws (Extension context invalidated)', () => {
      (globalThis as any).browser = {
        get runtime() {
          throw new Error('Extension context invalidated.');
        },
      };
      (globalThis as any).chrome = {
        get runtime() {
          throw new Error('Extension context invalidated.');
        },
      };
      expect(isExtensionContextValid()).toBe(false);
    });

    it('returns true when chrome.runtime.id is valid and browser is absent', () => {
      delete (globalThis as any).browser;
      (globalThis as any).chrome = {
        runtime: { id: 'chrome-ext-id' },
      };
      expect(isExtensionContextValid()).toBe(true);
    });
  });

  describe('isFooticsAppHost', () => {
    it('recognizes Footics App hostnames', () => {
      expect(isFooticsAppHost('localhost')).toBe(true);
      expect(isFooticsAppHost('127.0.0.1')).toBe(true);
      expect(isFooticsAppHost('footics.app')).toBe(true);
      expect(isFooticsAppHost('staging.footics.app')).toBe(true);
      expect(isFooticsAppHost('footics.com')).toBe(true);
      expect(isFooticsAppHost('footics-preview.pages.dev')).toBe(true);
      expect(isFooticsAppHost('footics.watool.workers.dev')).toBe(true);
    });

    it('rejects third-party hostnames like YouTube and X', () => {
      expect(isFooticsAppHost('www.youtube.com')).toBe(false);
      expect(isFooticsAppHost('youtube.com')).toBe(false);
      expect(isFooticsAppHost('twitter.com')).toBe(false);
      expect(isFooticsAppHost('x.com')).toBe(false);
      expect(isFooticsAppHost('example.com')).toBe(false);
    });
  });

  describe('setupFooticsAppBridge host guard & cleanup', () => {
    it('skips setup on non-Footics host and returns noop cleanup', () => {
      const origLocation =
        typeof window !== 'undefined' ? window.location : undefined;
      if (typeof window === 'undefined') {
        (globalThis as any).window = {};
      }
      Object.defineProperty(window, 'location', {
        value: { hostname: 'www.youtube.com' },
        writable: true,
        configurable: true,
      });

      const cleanup = setupFooticsAppBridge();
      expect(typeof cleanup).toBe('function');
      cleanup();

      if (origLocation) {
        Object.defineProperty(window, 'location', {
          value: origLocation,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  describe('storage access guard when context is invalidated', () => {
    beforeEach(() => {
      // Simulate invalidated context across both browser and chrome
      (globalThis as any).browser = createMockBrowser(null);
      (globalThis as any).chrome = createMockBrowser(null);
    });

    it('syncOfflineQueueToStorage safely returns without throwing or accessing storage', async () => {
      await expect(syncOfflineQueueToStorage()).resolves.toBeUndefined();
      expect(
        (globalThis as any).browser.storage.local.set,
      ).not.toHaveBeenCalled();
    });

    it('addToSaveQueue safely returns without throwing or accessing storage', async () => {
      await expect(
        addToSaveQueue({
          mode: 'MATCH',
          matchId: 'm1',
          memo: 'test memo',
        }),
      ).resolves.toBeUndefined();
      expect(
        (globalThis as any).browser.storage.local.set,
      ).not.toHaveBeenCalled();
    });

    it('processSaveQueue safely returns without throwing or accessing storage', async () => {
      await expect(processSaveQueue()).resolves.toBeUndefined();
      expect(
        (globalThis as any).browser.storage.local.get,
      ).not.toHaveBeenCalled();
    });
  });
});
