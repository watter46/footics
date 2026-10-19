import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Match } from '@/types';
import { useDashboard } from '../../hooks/use-dashboard';
import Dashboard from '../Dashboard';

const mockReset = vi.fn();
const mockSetModalOpen = vi.fn();

vi.mock('../../hooks/use-dashboard');

vi.mock('@/features/memo-overlay', () => ({
  MemoOverlayModal: vi.fn(({ matchId }: { matchId: string }) => (
    <div data-testid="memo-overlay-modal" data-match-id={matchId}>
      MemoOverlayModal
    </div>
  )),
  useMemoOverlayStore: vi.fn((selector) =>
    selector({ reset: mockReset, setModalOpen: mockSetModalOpen }),
  ),
}));

vi.mock('@/features/analysis', () => ({
  EventTimeline: vi.fn(
    ({ onEditMatchMemo }: { onEditMatchMemo: () => void }) => (
      <div data-testid="event-timeline">
        <button type="button" onClick={onEditMatchMemo}>
          Edit Match Memo
        </button>
      </div>
    ),
  ),
}));

vi.mock('@/features/sidebar', () => ({
  Sidebar: vi.fn(
    ({
      isOpenOnMobile,
      onClose,
    }: {
      isOpenOnMobile: boolean;
      onClose: () => void;
    }) => (
      <aside
        data-testid="sidebar"
        data-open-mobile={isOpenOnMobile ? 'true' : 'false'}
      >
        <button type="button" onClick={onClose}>
          Close Sidebar
        </button>
      </aside>
    ),
  ),
}));

vi.mock('@/features/management', () => ({
  DataManagementMenu: vi.fn(({ matchId }: { matchId: string }) => (
    <div data-testid="data-management-menu" data-match-id={matchId}>
      DataManagementMenu
    </div>
  )),
}));

const mockMetadata: Match = {
  id: 'match-123',
  date: '2026-10-19',
  score: '2 - 1',
  matchType: 'club',
  homeTeam: { id: 1, name: 'Arsenal' },
  awayTeam: { id: 2, name: 'Chelsea' },
  playerIdNameDictionary: {},
  teams: {
    home: { teamId: 1, name: 'Arsenal', players: [] },
    away: { teamId: 2, name: 'Chelsea', players: [] },
  },
};

function createMockDashboardReturn(
  overrides?: Partial<ReturnType<typeof useDashboard>>,
): ReturnType<typeof useDashboard> {
  return {
    metadata: mockMetadata,
    status: 'ready',
    error: null,
    cacheMissing: false,
    isLoading: false,
    isRestoring: false,
    restoreInputRef: { current: null },
    handleRestoreCache: vi.fn(),
    filters: {
      selectedPlayers: new Set<number>(),
      selectedTeam: 'all',
      outcomeFilter: 'all',
      activeStrategies: new Set<string>(),
      activeStrategyParams: {},
      timelineSource: 'all',
    },
    handleTeamChange: vi.fn(),
    handlePlayerToggle: vi.fn(),
    handlePlayersClear: vi.fn(),
    handleOutcomeChange: vi.fn(),
    handleStrategyToggle: vi.fn(),
    handleStrategyParamChange: vi.fn(),
    handleTimelineSourceChange: vi.fn(),
    refreshTrigger: 0,
    setRefreshTrigger: vi.fn(),
    handleRefreshCustomEvents: vi.fn(),
    handleEditCustomEvent: vi.fn(),
    handleDeleteCustomEvent: vi.fn(),
    events: [],
    totalCount: 0,
    isQuerying: false,
    ...overrides,
  };
}

describe('Dashboard - Loading States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading view when status is idle', () => {
    vi.mocked(useDashboard).mockReturnValue(
      createMockDashboardReturn({ status: 'idle', metadata: null }),
    );
    render(<Dashboard matchId="match-123" />);
    expect(screen.getByText('Loading match data...')).toBeInTheDocument();
  });

  it('renders loading view when status is initializing', () => {
    vi.mocked(useDashboard).mockReturnValue(
      createMockDashboardReturn({ status: 'initializing', metadata: null }),
    );
    render(<Dashboard matchId="match-123" />);
    expect(screen.getByText('Initializing DuckDB-WASM...')).toBeInTheDocument();
  });

  it('renders loading view when status is loading-data', () => {
    vi.mocked(useDashboard).mockReturnValue(
      createMockDashboardReturn({ status: 'loading-data', metadata: null }),
    );
    render(<Dashboard matchId="match-123" />);
    expect(screen.getByText('Loading match data...')).toBeInTheDocument();
  });
});

describe('Dashboard - Error and Cache Recovery States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cache recovery view when status is error', () => {
    vi.mocked(useDashboard).mockReturnValue(
      createMockDashboardReturn({
        status: 'error',
        error: 'Database connection failed',
        cacheMissing: false,
        metadata: null,
      }),
    );
    render(<Dashboard matchId="match-123" />);
    expect(screen.getByText('接続エラー')).toBeInTheDocument();
    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
  });

  it('renders cache recovery view when cache is missing even if status is ready', () => {
    vi.mocked(useDashboard).mockReturnValue(
      createMockDashboardReturn({
        status: 'ready',
        cacheMissing: true,
        metadata: null,
      }),
    );
    render(<Dashboard matchId="match-123" />);
    expect(screen.getByText('データの再構築が必要です')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /jsonファイルを読み込む/i }),
    ).toBeInTheDocument();
  });

  it('renders nothing if metadata is null when status is ready without error or cacheMissing', () => {
    vi.mocked(useDashboard).mockReturnValue(
      createMockDashboardReturn({
        status: 'ready',
        cacheMissing: false,
        metadata: null,
      }),
    );
    const { container } = render(<Dashboard matchId="match-123" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Dashboard - Ready State (Normal Display)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header, timeline, sidebar, and modals when ready with metadata', () => {
    vi.mocked(useDashboard).mockReturnValue(createMockDashboardReturn());
    render(<Dashboard matchId="match-123" />);

    expect(screen.getByText('Arsenal')).toBeInTheDocument();
    expect(screen.getByText('Chelsea')).toBeInTheDocument();
    expect(screen.getByText('2 - 1')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('event-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('data-management-menu')).toBeInTheDocument();
    expect(screen.getByTestId('memo-overlay-modal')).toBeInTheDocument();
  });

  it('calculates active filter count and passes it to header', () => {
    vi.mocked(useDashboard).mockReturnValue(
      createMockDashboardReturn({
        filters: {
          selectedPlayers: new Set([10, 11]),
          selectedTeam: '1',
          outcomeFilter: 'success',
          activeStrategies: new Set(['strategy-a', 'strategy-b']),
          activeStrategyParams: {},
          timelineSource: 'all',
        },
      }),
    );
    render(<Dashboard matchId="match-123" />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('opens and closes mobile sidebar upon user actions', () => {
    vi.mocked(useDashboard).mockReturnValue(createMockDashboardReturn());
    render(<Dashboard matchId="match-123" />);

    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar.getAttribute('data-open-mobile')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: /open filters/i }));
    expect(sidebar.getAttribute('data-open-mobile')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /close sidebar/i }));
    expect(sidebar.getAttribute('data-open-mobile')).toBe('false');
  });

  it('opens memo overlay with EVENT mode when add event button is clicked', () => {
    vi.mocked(useDashboard).mockReturnValue(createMockDashboardReturn());
    render(<Dashboard matchId="match-123" />);

    fireEvent.click(screen.getByRole('button', { name: /add event/i }));
    expect(mockReset).toHaveBeenCalledWith('EVENT');
    expect(mockSetModalOpen).toHaveBeenCalledWith(true);
  });

  it('opens memo overlay with MATCH mode when edit match memo is clicked in timeline', () => {
    vi.mocked(useDashboard).mockReturnValue(createMockDashboardReturn());
    render(<Dashboard matchId="match-123" />);

    fireEvent.click(screen.getByRole('button', { name: /edit match memo/i }));
    expect(mockReset).toHaveBeenCalledWith('MATCH');
    expect(mockSetModalOpen).toHaveBeenCalledWith(true);
  });
});
