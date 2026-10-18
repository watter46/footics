import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SidepanelView } from '../components/sidepanel-view';
import { useSidepanelStore } from '../stores/use-sidepanel-store';

describe('SidepanelView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSidepanelStore.setState({
      text: '',
      matchId: undefined,
      isSaving: false,
      errorMessage: undefined,
      toast: { visible: false, message: '' },
    });

    // browser mock
    const mockBrowser = {
      runtime: {
        getURL: vi.fn((path: string) => `chrome-extension://test-id${path}`),
      },
      tabs: {
        create: vi.fn(),
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    };
    (globalThis as unknown as { browser: typeof mockBrowser }).browser =
      mockBrowser;
  });

  it('renders dashboard open button in header and opens dashboard on click', () => {
    render(<SidepanelView />);

    const dashboardBtn = screen.getByTitle('Footics Dashboardを開く');
    expect(dashboardBtn).toBeInTheDocument();

    fireEvent.click(dashboardBtn);

    expect(browser.runtime.getURL).toHaveBeenCalledWith('/dashboard.html');
    expect(browser.tabs.create).toHaveBeenCalledWith({
      url: 'chrome-extension://test-id/dashboard.html',
    });
  });

  it('displays match id when available', () => {
    useSidepanelStore.setState({ matchId: 'match-123' });
    render(<SidepanelView />);

    expect(screen.getByText('Match: match-123')).toBeInTheDocument();
  });
});
