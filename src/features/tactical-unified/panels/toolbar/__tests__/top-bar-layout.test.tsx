import { fireEvent, render, screen } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TopBar } from '../top-bar';

const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    back: mockBack,
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn().mockReturnValue(null),
  })),
}));

describe('TopBar 3-column layout robustness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
    (useSearchParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    });
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('applies responsive min-w-0 and shrink constraints to header columns', () => {
    const { container } = render(<TopBar />);

    const header = container.querySelector('header');
    expect(header).toBeDefined();

    // 3 direct children in header
    const columns = header?.children;
    expect(columns?.length).toBeGreaterThanOrEqual(3);

    const leftCol = columns?.[0] as HTMLElement;
    const centerCol = columns?.[1] as HTMLElement;
    const rightCol = columns?.[2] as HTMLElement;

    // Left column
    expect(leftCol.className).toContain('shrink-0');
    expect(leftCol.className).toContain('min-w-0');

    // Center column
    expect(centerCol.className).toContain('min-w-0');
    expect(centerCol.className).toContain('shrink');
    expect(centerCol.className).toContain('overflow-hidden');

    // Right column
    expect(rightCol.className).toContain('shrink-0');
  });

  it('does not render Focus mode button even when onToggleFocusMode is passed', () => {
    const { queryByText, queryByTitle } = render(
      <TopBar onToggleFocusMode={() => {}} />,
    );

    expect(queryByText('Focus')).toBeNull();
    expect(queryByTitle(/Focus Mode/i)).toBeNull();
  });

  describe('Back button navigation', () => {
    it('renders back button and navigates back using router.back() when no matchId is present', () => {
      render(<TopBar />);

      const backButton = screen.getByRole('button', { name: /戻る|Back/i });
      expect(backButton).toBeDefined();

      fireEvent.click(backButton);
      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('navigates to /match/${matchId} when matchId is present in searchParams', () => {
      (useSearchParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        get: vi.fn((key: string) => (key === 'matchId' ? 'm-456' : null)),
      });

      render(<TopBar />);

      const backButton = screen.getByRole('button', { name: /戻る|Back/i });
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/match/m-456');
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('navigates to /match/${matchId} when matchId is present in store project', () => {
      useTacticalUnifiedStore.setState((s) => ({
        ...s,
        project: {
          ...s.project,
          matchId: 'm-789',
        },
      }));

      render(<TopBar />);

      const backButton = screen.getByRole('button', { name: /戻る|Back/i });
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/match/m-789');
      expect(mockBack).not.toHaveBeenCalled();
    });
  });
});
