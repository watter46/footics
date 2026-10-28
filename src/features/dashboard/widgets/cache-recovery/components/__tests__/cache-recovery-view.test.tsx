import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CacheRecoveryView } from '../cache-recovery-view';

describe('CacheRecoveryView', () => {
  it('renders cache missing state with restore button', () => {
    const inputRef = createRef<HTMLInputElement>();
    const onRestoreCache = vi.fn();

    const { container } = render(
      <CacheRecoveryView
        cacheMissing={true}
        isRestoring={false}
        restoreInputRef={inputRef}
        onRestoreCache={onRestoreCache}
      />,
    );

    expect(screen.getByText('データの再構築が必要です')).toBeDefined();
    expect(
      screen.getByRole('button', { name: /JSONファイルを読み込む/i }),
    ).toBeDefined();
    expect(container.innerHTML).not.toContain('slate-');
    expect(container.innerHTML).not.toContain('zinc-');
  });

  it('renders error state without restore button when cache is not missing', () => {
    const inputRef = createRef<HTMLInputElement>();
    const { container } = render(
      <CacheRecoveryView
        cacheMissing={false}
        error="Network error"
        isRestoring={false}
        restoreInputRef={inputRef}
        onRestoreCache={vi.fn()}
      />,
    );

    expect(screen.getByText('接続エラー')).toBeDefined();
    expect(screen.getByText('Network error')).toBeDefined();
    expect(container.innerHTML).not.toContain('slate-');
    expect(container.innerHTML).not.toContain('zinc-');
  });
});
