import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exportMultiSlideMp4Video } from '@/lib/tactical/export/tactical-video-exporter';
import ExportListPage from '../page';
import StandaloneExportSharePage from '../share/[shareId]/page';

vi.mock('@/lib/tactical/export/tactical-video-exporter', () => ({
  exportMultiSlideMp4Video: vi.fn(),
}));

vi.mock(
  '@/features/tactical-unified/panels/export/export-preview-player',
  () => ({
    ExportPreviewPlayer: ({
      slides,
      aspectRatio,
      boundaryBox,
      pitchTransform,
    }: {
      slides: unknown[];
      aspectRatio: string;
      boundaryBox?: unknown;
      pitchTransform?: unknown;
    }) => (
      <div
        data-testid="export-preview-player"
        data-aspect-ratio={aspectRatio}
        data-slide-count={slides?.length ?? 0}
        data-has-boundary={Boolean(boundaryBox)}
        data-has-transform={Boolean(pitchTransform)}
      >
        Preview Player
      </div>
    ),
  }),
);

const mockPush = vi.fn();
const mockParams = { shareId: 'test-share-123' };

vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('Export Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('ExportListPage', () => {
    it('fetches and displays shared export list, and allows deletion', async () => {
      const mockList = [
        {
          shareId: 'share-1',
          title: 'Counter Attack Drill',
          createdAt: Date.now() - 60000,
          sceneCount: 3,
          aspectRatio: '4:5',
          orientation: 'vertical',
          hasBoundaryCrop: true,
        },
        {
          shareId: 'share-2',
          title: 'High Press Defense',
          createdAt: Date.now() - 120000,
          sceneCount: 2,
          aspectRatio: '16:9',
          orientation: 'horizontal',
          hasBoundaryCrop: false,
        },
      ];

      const fetchMock = vi
        .fn()
        .mockImplementation((url: string, init?: RequestInit) => {
          if (
            url === '/api/tactical-export/share' &&
            (!init || init.method === 'GET' || !init.method)
          ) {
            return Promise.resolve({
              ok: true,
              json: async () => ({
                success: true,
                items: mockList,
              }),
            });
          }
          if (
            typeof url === 'string' &&
            url.startsWith('/api/tactical-export/share?id=') &&
            init?.method === 'DELETE'
          ) {
            return Promise.resolve({
              ok: true,
              json: async () => ({ success: true }),
            });
          }
          return Promise.reject(new Error(`Unhandled fetch: ${url}`));
        });
      vi.stubGlobal('fetch', fetchMock);

      render(<ExportListPage />);

      expect(await screen.findByText('Counter Attack Drill')).toBeDefined();
      expect(screen.getByText('High Press Defense')).toBeDefined();
      expect(screen.getByText('4:5')).toBeDefined();
      expect(screen.getByText('16:9')).toBeDefined();
      expect(screen.getByText('Cropped')).toBeDefined();

      const detailLinks = screen.getAllByRole('link', {
        name: /open|preview|detail|view/i,
      });
      expect(
        detailLinks.some(
          (a) => a.getAttribute('href') === '/export/share/share-1',
        ),
      ).toBe(true);

      const deleteButtons = screen.getAllByRole('button', {
        name: /delete|remove/i,
      });
      expect(deleteButtons.length).toBeGreaterThan(0);

      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining('/api/tactical-export/share?id=share-1'),
          expect.objectContaining({ method: 'DELETE' }),
        );
      });
    });

    it('shows empty state when no shared items exist', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, items: [] }),
        }),
      );

      render(<ExportListPage />);
      expect(
        await screen.findByText(/no export|no shared|empty/i),
      ).toBeDefined();
    });
  });

  describe('StandaloneExportSharePage', () => {
    it('loads share data with custom aspect ratio and passes correct parameters to exporter', async () => {
      const mockShareData = {
        version: 1,
        title: 'Tactical Analysis 4:5',
        orientation: 'vertical',
        aspectRatio: '4:5',
        scenes: [
          {
            id: 'slide-1',
            players: [],
            arrows: [],
            texts: [],
            duration: 2000,
          },
        ],
        boundaryBox: {
          enabled: true,
          visible: true,
          x: 10,
          y: 10,
          width: 80,
          height: 80,
          fitTarget: 'pitch',
        },
        pitchTransform: {
          panX: 50,
          panY: 30,
          zoom: 1.2,
          tilt: 25,
        },
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            success: true,
            data: mockShareData,
          }),
        }),
      );

      const mockBlob = new Blob(['video-data'], { type: 'video/mp4' });
      vi.mocked(exportMultiSlideMp4Video).mockResolvedValue(mockBlob);

      // Web Share API Mock
      const mockShare = vi.fn().mockResolvedValue(undefined);
      const mockCanShare = vi.fn().mockReturnValue(true);
      vi.stubGlobal('navigator', {
        ...globalThis.navigator,
        userAgent: 'iPhone OS 15_0',
        share: mockShare,
        canShare: mockCanShare,
      });

      render(<StandaloneExportSharePage />);

      // Preview Player should be rendered with aspectRatio 4:5 and boundaryBox
      const previewEl = await screen.findByTestId('export-preview-player');
      expect(previewEl.getAttribute('data-aspect-ratio')).toBe('4:5');
      expect(previewEl.getAttribute('data-has-boundary')).toBe('true');
      expect(previewEl.getAttribute('data-has-transform')).toBe('true');

      // Click export button
      const exportButton = screen.getByRole('button', {
        name: /export|start/i,
      });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(exportMultiSlideMp4Video).toHaveBeenCalledWith(
          expect.objectContaining({
            aspectRatio: '4:5',
            stageWidth: 1080,
            stageHeight: 1350,
            boundaryBox: expect.objectContaining({ enabled: true }),
            pitchTransform: expect.objectContaining({ tilt: 25 }),
            mvpMatrix: expect.any(Object),
          }),
        );
      });

      // Web Share button should appear and trigger navigator.share
      const shareButton = await screen.findByRole('button', { name: /share/i });
      fireEvent.click(shareButton);

      await waitFor(() => {
        expect(mockShare).toHaveBeenCalled();
      });
    });
  });
});
