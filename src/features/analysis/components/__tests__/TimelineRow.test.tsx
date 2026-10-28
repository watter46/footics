import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { EventRow, Match } from '@/types';
import { TimelineRow } from '../timeline/TimelineRow';

const mockMetadata: Match = {
  id: 'match-1',
  date: '2026-10-19',
  score: '2 - 1',
  matchType: 'club',
  homeTeam: { id: 1, name: 'Arsenal' },
  awayTeam: { id: 2, name: 'Chelsea' },
  playerIdNameDictionary: { '101': 'Bukayo Saka' },
  teams: {
    home: { teamId: 1, name: 'Arsenal', players: [] },
    away: { teamId: 2, name: 'Chelsea', players: [] },
  },
};

const mockEvent = {
  id: 1,
  match_id: 'match-1',
  team_id: 1,
  player_id: 101,
  type_name: 'Pass',
  minute: 12,
  second: 34,
  period: 1,
  x: 50,
  y: 50,
  outcome: true,
  source: 'whoscored',
} as unknown as EventRow;

describe('TimelineRow', () => {
  it('renders time with font-mono and play button with variant="play"', () => {
    const { container } = render(
      <TimelineRow
        event={mockEvent}
        index={0}
        virtualRow={{ size: 44, start: 0 }}
        metadata={mockMetadata}
        activeStrategyList={[]}
        activeStrategyParams={{}}
      />,
    );

    // 等幅時間
    const timeEl = screen.getByText(/12:34/);
    expect(timeEl.className).toContain('font-mono');

    // 再生アクションボタン
    const playButton = screen.getByRole('button', { name: /play/i });
    expect(playButton).toBeDefined();
    expect(playButton.className).toContain('btn-guideline-play');

    // ボーダーレス・ホバー時点灯 #18181B
    const rowEl = container.firstElementChild as HTMLElement;
    expect(rowEl.className).toContain('hover:bg-[#18181B]');
    expect(rowEl.className).toContain('border-white/[0.04]');
  });
});
