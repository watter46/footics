import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importMatchesBatch } from '@/lib/data-loader';
import { useMatchDataImport } from '../use-match-data-import';

vi.mock('@/lib/data-loader', () => ({
  importMatchesBatch: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    loading: vi.fn(),
  },
}));

describe('useMatchDataImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('初期状態が正しくセットアップされていること', () => {
    const { result } = renderHook(() => useMatchDataImport());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.progress).toBeNull();
    expect(result.current.fileInputRef).toBeDefined();
    expect(typeof result.current.openFileDialog).toBe('function');
    expect(typeof result.current.handleFileChange).toBe('function');
  });

  it('openFileDialog を呼ぶと input の click が発火すること', () => {
    const { result } = renderHook(() => useMatchDataImport());
    const mockInput = document.createElement('input');
    const clickSpy = vi.spyOn(mockInput, 'click');
    result.current.fileInputRef.current = mockInput;

    act(() => {
      result.current.openFileDialog();
    });

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('ファイル未選択時は何も処理しないこと', async () => {
    const { result } = renderHook(() => useMatchDataImport());
    const event = {
      target: { files: [] as unknown as FileList },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleFileChange(event);
    });

    expect(importMatchesBatch).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('インポートが成功した場合に onSuccess コールバックと toast.success が発火すること', async () => {
    const onSuccess = vi.fn();
    const mockResult = {
      success: 3,
      failed: 0,
      errors: [],
    };
    vi.mocked(importMatchesBatch).mockImplementation(
      async (_files, onProgress) => {
        onProgress?.(1, 3);
        onProgress?.(3, 3);
        return mockResult;
      },
    );

    const { result } = renderHook(() => useMatchDataImport({ onSuccess }));
    const dummyFile = new File(['{}'], 'match.json', {
      type: 'application/json',
    });
    const mockInput = document.createElement('input');
    mockInput.value = 'dummy.json';
    result.current.fileInputRef.current = mockInput;

    const event = {
      target: { files: [dummyFile] as unknown as FileList },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleFileChange(event);
    });

    expect(importMatchesBatch).toHaveBeenCalledWith(
      [dummyFile],
      expect.any(Function),
    );
    expect(onSuccess).toHaveBeenCalledWith(3);
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('3 matches'),
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.progress).toBeNull();
    expect(mockInput.value).toBe('');
  });

  it('失敗が含まれる場合に toast.error が発火すること', async () => {
    const mockResult = {
      success: 1,
      failed: 1,
      errors: [{ filename: 'bad.json', message: 'Invalid format' }],
    };
    vi.mocked(importMatchesBatch).mockResolvedValue(mockResult);

    const { result } = renderHook(() => useMatchDataImport());
    const dummyFile = new File(['{}'], 'bad.json', {
      type: 'application/json',
    });

    const event = {
      target: { files: [dummyFile] as unknown as FileList },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleFileChange(event);
    });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to import 1 matches'),
      expect.any(Object),
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('例外が発生した場合にエラーハンドリングされ状態がリセットされること', async () => {
    vi.mocked(importMatchesBatch).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMatchDataImport());
    const dummyFile = new File(['{}'], 'match.json', {
      type: 'application/json',
    });

    const event = {
      target: { files: [dummyFile] as unknown as FileList },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => {
      await result.current.handleFileChange(event);
    });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Network error'),
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.progress).toBeNull();
  });
});
