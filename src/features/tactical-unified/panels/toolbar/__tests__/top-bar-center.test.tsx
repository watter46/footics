import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TopBarCenter } from '../top-bar-center';

const radio = (name: string) => screen.getByRole('radio', { name });

describe('TopBarCenter aspect ratio selector', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().setAspectRatio('16:9');
  });

  it('renders all 4 aspect ratio options (16:9, 9:16, 4:5, 1:1)', () => {
    render(<TopBarCenter />);

    for (const label of ['16:9', '9:16', '4:5', '1:1']) {
      expect(radio(label)).toBeDefined();
    }
  });

  it('defaults to 16:9 as active and allows switching to 9:16, 4:5, 1:1', () => {
    render(<TopBarCenter />);

    expect(radio('16:9').getAttribute('aria-checked')).toBe('true');
    expect(radio('9:16').getAttribute('aria-checked')).toBe('false');

    fireEvent.click(radio('9:16'));
    expect(useTacticalUnifiedStore.getState().project.aspectRatio).toBe('9:16');
    expect(radio('9:16').getAttribute('aria-checked')).toBe('true');
    expect(radio('16:9').getAttribute('aria-checked')).toBe('false');

    fireEvent.click(radio('4:5'));
    expect(useTacticalUnifiedStore.getState().project.aspectRatio).toBe('4:5');

    fireEvent.click(radio('1:1'));
    expect(useTacticalUnifiedStore.getState().project.aspectRatio).toBe('1:1');
  });

  it('allows toggling team visibility', () => {
    render(<TopBarCenter />);

    fireEvent.click(radio('Home'));
    expect(useTacticalUnifiedStore.getState().teamVisibility).toBe('home');

    fireEvent.click(radio('Away'));
    expect(useTacticalUnifiedStore.getState().teamVisibility).toBe('away');

    fireEvent.click(radio('Both'));
    expect(useTacticalUnifiedStore.getState().teamVisibility).toBe('both');
  });

  it('renders reset squad button and triggers resetSlideKeepSquad', () => {
    render(<TopBarCenter />);

    const resetBtn = screen.getByRole('button', {
      name: '配置・オブジェクトをリセット（メンバー維持）',
    });
    expect(resetBtn).toBeDefined();

    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const player0 = store.project.slides[0]?.players[0];
    expect(player0).toBeDefined();
    store.movePlayer(slideId, player0?.id ?? '', 99, 99);

    fireEvent.click(resetBtn);

    const updatedSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((sl) => sl.id === slideId);
    const updatedPlayer0 = updatedSlide?.players.find(
      (p) => p.id === player0?.id,
    );
    expect(updatedPlayer0?.x).not.toBe(99);
    expect(updatedPlayer0?.y).not.toBe(99);
  });

  it('renders Swap and Reset icon buttons with shrink-0', () => {
    render(<TopBarCenter />);

    const swapBtn = screen.getByRole('button', { name: 'Swap team sides' });
    expect(swapBtn).toBeDefined();
    expect(swapBtn.className).toContain('shrink-0');

    const resetBtn = screen.getByRole('button', {
      name: '配置・オブジェクトをリセット（メンバー維持）',
    });
    expect(resetBtn).toBeDefined();
    expect(resetBtn.className).toContain('shrink-0');
  });

  it('allows toggling workspace mode using Toggle Layout Mode button', () => {
    render(<TopBarCenter />);

    expect(screen.queryByRole('radio', { name: '作図' })).toBeNull();
    expect(screen.queryByRole('radio', { name: '演出' })).toBeNull();

    const toggleBtn = screen.getByRole('button', {
      name: 'Toggle Layout Mode',
    });
    expect(toggleBtn).toBeDefined();
    expect(useTacticalUnifiedStore.getState().workspaceMode).toBe('board');

    fireEvent.click(toggleBtn);
    expect(useTacticalUnifiedStore.getState().workspaceMode).toBe('director');

    fireEvent.click(toggleBtn);
    expect(useTacticalUnifiedStore.getState().workspaceMode).toBe('board');
  });
});
