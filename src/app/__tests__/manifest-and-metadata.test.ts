import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}));

import { metadata } from '../layout';
import manifest from '../manifest';

describe('manifest & metadata icons', () => {
  describe('manifest icons', () => {
    it('contains apple-touch-icon.png with 180x180 size', () => {
      const manifestData = manifest();
      const appleTouchIcon = manifestData.icons?.find(
        (icon) => icon.src === '/apple-touch-icon.png',
      );
      expect(appleTouchIcon).toBeDefined();
      expect(appleTouchIcon).toEqual({
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      });
    });

    it('contains logo.png and favicon.ico', () => {
      const manifestData = manifest();
      const logoIcon = manifestData.icons?.find(
        (icon) => icon.src === '/logo.png',
      );
      const favicon = manifestData.icons?.find(
        (icon) => icon.src === '/favicon.ico',
      );

      expect(logoIcon).toBeDefined();
      expect(favicon).toBeDefined();
    });
  });

  describe('layout metadata icons', () => {
    it('defines icons with apple and icon entries', () => {
      expect(metadata.icons).toBeDefined();

      const icons = metadata.icons as {
        apple?: Array<{ url: string; sizes?: string; type?: string }> | string;
        icon?: Array<{ url: string; sizes?: string; type?: string }> | string;
      };

      expect(icons.apple).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            url: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
          }),
        ]),
      );

      expect(icons.icon).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            url: '/favicon.ico',
          }),
          expect.objectContaining({
            url: '/logo.png',
          }),
        ]),
      );
    });
  });
});
