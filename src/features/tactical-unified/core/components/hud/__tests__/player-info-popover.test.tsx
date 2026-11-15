import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlayerInfoPopover } from '@/features/tactical-unified/core/components/hud/player-info-popover';
import { createDefaultDomainPlayers } from '@/lib/tactical/domain/default-players';

describe('PlayerInfoPopover', () => {
  it('Popover を開くと背番号・選手名・Bottom Label切替・背景塗り切替が表示され、操作できること', () => {
    const updateMarker = vi.fn();
    const basePlayer = createDefaultDomainPlayers('#38bdf8')[0];
    const player = {
      ...basePlayer,
      id: 'p1',
      shirtNo: '7',
      name: 'Saka',
      style: {
        ...basePlayer.style,
        bottomLabel: 'name' as const,
        transparentBackground: false,
      },
    };

    render(
      <PlayerInfoPopover
        player={player}
        isRing={false}
        updateMarker={updateMarker}
      />,
    );

    // ポップオーバーを開くボタンをクリック
    const triggerBtn = screen.getByRole('button', { name: '選手情報変更' });
    fireEvent.click(triggerBtn);

    // ポップオーバーダイアログが開いていること
    expect(
      screen.getByRole('dialog', { name: '選手情報変更フォーム' }),
    ).toBeDefined();

    // 1. 背番号入力
    const shirtNoInput = screen.getByRole('textbox', { name: '背番号' });
    expect(shirtNoInput).toBeDefined();
    fireEvent.change(shirtNoInput, { target: { value: '11' } });
    expect(updateMarker).toHaveBeenCalledWith('p1', { shirtNo: '11' });

    // 2. 選手名入力
    const nameInput = screen.getByRole('textbox', { name: '選手名' });
    expect(nameInput).toBeDefined();
    fireEvent.change(nameInput, { target: { value: 'Martinelli' } });
    expect(updateMarker).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ name: 'Martinelli' }),
    );

    // 3. Bottom Label トグル (Name / Num / None)
    const noneLabelBtn = screen.getByRole('button', { name: 'ラベル None' });
    expect(noneLabelBtn).toBeDefined();
    fireEvent.click(noneLabelBtn);
    expect(updateMarker).toHaveBeenCalledWith('p1', {
      style: expect.objectContaining({ bottomLabel: 'none' }),
    });

    const numLabelBtn = screen.getByRole('button', { name: 'ラベル Num' });
    expect(numLabelBtn).toBeDefined();
    fireEvent.click(numLabelBtn);
    expect(updateMarker).toHaveBeenCalledWith('p1', {
      style: expect.objectContaining({ bottomLabel: 'number' }),
    });

    // 4. 背景塗り切替 (塗りあり / 背景なし)
    const transparentBgBtn = screen.getByRole('button', {
      name: '背景塗り切替',
    });
    expect(transparentBgBtn).toBeDefined();
    fireEvent.click(transparentBgBtn);
    expect(updateMarker).toHaveBeenCalledWith('p1', {
      style: expect.objectContaining({ transparentBackground: true }),
    });
  });
});
