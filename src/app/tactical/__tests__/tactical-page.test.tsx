import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import TacticalError from '../error';
import TacticalPage, { dynamic } from '../page';
import { TacticalClientPage } from '../tactical-client-page';

const { MockTacticalUnifiedPage } = vi.hoisted(() => {
  return {
    MockTacticalUnifiedPage: ({
      initialMatchId,
      initialMinute,
    }: {
      initialMatchId?: string;
      initialMinute?: number;
    }) => (
      <div
        data-testid="tactical-page-mock"
        data-match-id={initialMatchId ?? 'none'}
        data-minute={
          initialMinute !== undefined ? String(initialMinute) : 'none'
        }
      />
    ),
  };
});

vi.mock('@/features/tactical-unified', () => ({
  TacticalUnifiedPage: MockTacticalUnifiedPage,
}));

describe('TacticalPage', () => {
  it('dynamic 設定が force-dynamic になっていること', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('searchParams が Promise 解決される場合に正常にパラメータが渡されること', async () => {
    const searchParams = Promise.resolve({
      matchId: '1983618',
      minute: '45',
    });

    const pageElement = await TacticalPage({ searchParams });
    render(pageElement);

    const mock = screen.getByTestId('tactical-page-mock');
    expect(mock.getAttribute('data-match-id')).toBe('1983618');
    expect(mock.getAttribute('data-minute')).toBe('45');
  });

  it('searchParams がプレーンオブジェクトの場合でも正常に動作すること', async () => {
    const searchParams = {
      matchId: '1983618',
      minute: '30',
    } as any;

    const pageElement = await TacticalPage({ searchParams });
    render(pageElement);

    const mock = screen.getByTestId('tactical-page-mock');
    expect(mock.getAttribute('data-match-id')).toBe('1983618');
    expect(mock.getAttribute('data-minute')).toBe('30');
  });

  it('searchParams が reject された場合でもクラッシュせずデフォルトで描画されること', async () => {
    const searchParams = Promise.reject(new Error('Rejected search params'));

    const pageElement = await TacticalPage({ searchParams });
    render(pageElement);

    const mock = screen.getByTestId('tactical-page-mock');
    expect(mock.getAttribute('data-match-id')).toBe('none');
    expect(mock.getAttribute('data-minute')).toBe('none');
  });

  it('不正な minute 文字列の場合は undefined として扱われること', async () => {
    const searchParams = Promise.resolve({
      matchId: '1983618',
      minute: 'invalid',
    });

    const pageElement = await TacticalPage({ searchParams });
    render(pageElement);

    const mock = screen.getByTestId('tactical-page-mock');
    expect(mock.getAttribute('data-match-id')).toBe('1983618');
    expect(mock.getAttribute('data-minute')).toBe('none');
  });
});

describe('TacticalClientPage', () => {
  it('TacticalUnifiedPage に initialMatchId と initialMinute を伝搬すること', () => {
    render(<TacticalClientPage initialMatchId="123" initialMinute={15} />);

    const mock = screen.getByTestId('tactical-page-mock');
    expect(mock.getAttribute('data-match-id')).toBe('123');
    expect(mock.getAttribute('data-minute')).toBe('15');
  });
});

describe('TacticalError', () => {
  it('エラーメッセージと再試行ボタンが正常に描画され、reset が呼ばれること', () => {
    const reset = vi.fn();
    const error = new Error('Test tactical error') as Error & {
      digest?: string;
    };
    error.digest = 'ERR_12345';

    const { container } = render(<TacticalError error={error} reset={reset} />);

    expect(
      screen.getByText('タクティカルキャンバスの読み込みに失敗しました'),
    ).toBeDefined();
    expect(screen.getByText('エラーコード: ERR_12345')).toBeDefined();

    const retryButton = screen.getByRole('button', { name: '再試行' });
    fireEvent.click(retryButton);
    expect(reset).toHaveBeenCalledTimes(1);

    expect(container.innerHTML).not.toMatch(/\bzinc-[a-z0-9]/);
    expect(container.innerHTML).not.toMatch(/\bslate-[a-z0-9]/);
  });
});
