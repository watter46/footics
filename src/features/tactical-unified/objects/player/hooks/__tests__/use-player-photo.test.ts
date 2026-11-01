import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as playerPhotos from '@/lib/db/player-photos';
import * as queries from '@/lib/db/queries';
import { usePlayerPhoto } from '../use-player-photo';

describe('usePlayerPhoto', () => {
  let originalImage: typeof Image;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    originalImage = globalThis.Image;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = vi
      .fn()
      .mockReturnValue('blob:http://localhost/test-uuid');
    URL.revokeObjectURL = vi.fn();

    // Mock Image
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';

      set src(value: string) {
        this._src = value;
        // 同期で act 内から発火できるように queueMicrotask または setTimeout
        setTimeout(() => {
          act(() => {
            if (value === 'invalid-url') {
              this.onerror?.();
            } else {
              this.onload?.();
            }
          });
        }, 10);
      }

      get src() {
        return this._src;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.Image = MockImage as any;
  });

  afterEach(() => {
    globalThis.Image = originalImage;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('enabled が false のときは null を返し、クエリや Image ロードを行わない', async () => {
    const getPhotosBatchSpy = vi.spyOn(playerPhotos, 'getPlayerPhotosBatch');
    const getMasterBatchSpy = vi.spyOn(queries, 'getPlayersMasterBatch');
    const findByNameSpy = vi.spyOn(queries, 'findPlayerPhotosByNames');
    const { result } = renderHook(() =>
      usePlayerPhoto('123', 'https://example.com/photo.jpg', false),
    );

    expect(result.current).toBeNull();
    expect(getPhotosBatchSpy).not.toHaveBeenCalled();
    expect(getMasterBatchSpy).not.toHaveBeenCalled();
    expect(findByNameSpy).not.toHaveBeenCalled();
  });

  it('playerId があり DB に写真 Blob がある場合、createObjectURL で画像をロードし、アンマウント時に revokeObjectURL を呼ぶ', async () => {
    const blob = new Blob(['fake image data'], { type: 'image/webp' });
    vi.spyOn(playerPhotos, 'getPlayerPhotosBatch').mockResolvedValue(
      new Map([[123, blob]]),
    );

    const { result, unmount } = renderHook(() =>
      usePlayerPhoto('123', undefined, true),
    );

    expect(result.current).toBeNull();

    await vi.waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(result.current?.src).toBe('blob:http://localhost/test-uuid');

    // アンマウント時の RAII クリーンアップ検証
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      'blob:http://localhost/test-uuid',
    );
  });

  it('playerId がなく photoUrl のみある場合、外部 URL からロードする', async () => {
    const getPhotosBatchSpy = vi.spyOn(playerPhotos, 'getPlayerPhotosBatch');
    const { result } = renderHook(() =>
      usePlayerPhoto(undefined, 'https://example.com/saka.png', true),
    );

    expect(getPhotosBatchSpy).not.toHaveBeenCalled();

    await vi.waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current?.src).toBe('https://example.com/saka.png');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('playerId に写真がなく photoUrl もないが playerName がある場合、findPlayerPhotosByNames で写真Blobを取得して画像をロードし、アンマウント時に revokeObjectURL を呼ぶ', async () => {
    const blob = new Blob(['fallback fake image data'], { type: 'image/webp' });
    vi.spyOn(playerPhotos, 'getPlayerPhotosBatch').mockResolvedValue(new Map());
    vi.spyOn(queries, 'getPlayersMasterBatch').mockResolvedValue(new Map());
    const findPhotosByNamesSpy = vi
      .spyOn(queries, 'findPlayerPhotosByNames')
      .mockResolvedValue(new Map([['Cole Palmer', blob]]));

    const { result, unmount } = renderHook(() =>
      usePlayerPhoto('345001', undefined, true, 'Cole Palmer'),
    );

    expect(result.current).toBeNull();

    await vi.waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(findPhotosByNamesSpy).toHaveBeenCalledWith(['Cole Palmer']);
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(result.current?.src).toBe('blob:http://localhost/test-uuid');

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(
      'blob:http://localhost/test-uuid',
    );
  });

  it('画像ロード失敗時は null を返す', async () => {
    const { result } = renderHook(() =>
      usePlayerPhoto(undefined, 'invalid-url', true),
    );

    await vi.waitFor(() => {
      expect(result.current).toBeNull();
    });
  });
});
