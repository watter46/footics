import { beforeEach, describe, expect, it, vi } from 'vitest';
import { processAndOpenCanvas } from '../capture-pipeline';
import { getScreenshotById, screenshotDb } from '../db/screenshot-db';

describe('capture-pipeline', () => {
  beforeEach(async () => {
    await screenshotDb.capturedScreenshots.clear();
    vi.restoreAllMocks();

    // browser.tabs and browser.runtime mock
    (globalThis as any).browser = {
      runtime: {
        getURL: vi.fn(
          (path: string) =>
            `chrome-extension://mock-id${path.startsWith('/') ? path : `/${path}`}`,
        ),
      },
      tabs: {
        create: vi.fn(
          async (createProperties: { url: string; active?: boolean }) => ({
            id: 999,
            url: createProperties.url,
            active: createProperties.active ?? true,
          }),
        ),
      },
    };
  });

  it('saves screenshot to DB and opens canvas.html with generated id', async () => {
    const result = await processAndOpenCanvas({
      imageDataUrl: 'data:image/jpeg;base64,mock-captured-data',
      videoUrl: 'https://www.youtube.com/watch?v=pipelineTest',
      videoTitle: 'Arsenal vs Chelsea 2026',
      videoTime: 180,
    });

    expect(result.id).toBeDefined();
    expect(result.tabId).toBe(999);

    // Verify DB record
    const saved = await getScreenshotById(result.id);
    expect(saved).toBeDefined();
    expect(saved?.videoUrl).toBe(
      'https://www.youtube.com/watch?v=pipelineTest',
    );
    expect(saved?.videoTitle).toBe('Arsenal vs Chelsea 2026');
    expect(saved?.videoTime).toBe(180);
    expect(saved?.imageDataUrl).toBe(
      'data:image/jpeg;base64,mock-captured-data',
    );

    // Verify browser.tabs.create call
    expect(browser.tabs.create).toHaveBeenCalledWith({
      url: `chrome-extension://mock-id/canvas.html?id=${result.id}`,
      active: true,
    });
  });
});
