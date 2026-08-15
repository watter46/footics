import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importMatchJsonFile, importMatchesBatch } from './data-loader';
import { saveMatchUnified } from './db';

vi.mock('./db', () => ({
  saveMatchUnified: vi.fn(),
}));

vi.mock('./national-match-schema', () => ({
  NATIONAL_INFO_IDX: {
    DATE_FULL: 0,
    SCORE: 1,
    HOME_TEAM_ID: 2,
    HOME_TEAM_NAME: 3,
    AWAY_TEAM_ID: 4,
    AWAY_TEAM_NAME: 5,
  },
  parseNationalDate: vi.fn((date) => `parsed-${date}`),
}));

describe('data-loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockFile = (name: string, content: any): File => {
    return new File([JSON.stringify(content)], name, { type: 'application/json' });
  };

  it('imports club match json correctly', async () => {
    const clubMatchData = {
      matchId: 12345,
      matchCentreData: {
        startDate: '2023-01-01T15:00:00Z',
        score: '1 : 0',
        home: { teamId: 1, name: 'Home Team' },
        away: { teamId: 2, name: 'Away Team' },
        events: [
          {
            id: 1,
            eventId: 10,
            teamId: 1,
            playerId: 100,
            period: { value: 1 },
            minute: 10,
            second: 5,
            type: { value: 1, displayName: 'Pass' },
            outcomeType: { value: 1 },
            isTouch: true,
          }
        ]
      }
    };
    const file = createMockFile('club.json', clubMatchData);
    
    const result = await importMatchJsonFile(file);
    expect(result).toBe('12345');
    
    expect(saveMatchUnified).toHaveBeenCalledTimes(1);
    const [matchArgs, eventsArgs] = vi.mocked(saveMatchUnified).mock.calls[0];
    
    expect(matchArgs.id).toBe('12345');
    expect(matchArgs.matchType).toBe('club');
    expect(eventsArgs).toHaveLength(1);
    expect(eventsArgs[0].type_name).toBe('Pass');
  });

  it('imports national match json correctly', async () => {
    const infoArray = [];
    infoArray[0] = '2023-01-02';
    infoArray[1] = '2 : 1';
    infoArray[2] = 10;
    infoArray[3] = 'Nat Home';
    infoArray[4] = 20;
    infoArray[5] = 'Nat Away';

    const nationalMatchData = {
      matchId: 67890,
      initialMatchDataForScrappers: [
        [ infoArray ]
      ]
    };
    const file = createMockFile('national.json', nationalMatchData);
    
    const result = await importMatchJsonFile(file);
    expect(result).toBe('67890');
    
    expect(saveMatchUnified).toHaveBeenCalledTimes(1);
    const [matchArgs, eventsArgs] = vi.mocked(saveMatchUnified).mock.calls[0];
    
    expect(matchArgs.id).toBe('67890');
    expect(matchArgs.matchType).toBe('national');
    expect(matchArgs.date).toBe('parsed-2023-01-02');
    expect(matchArgs.score).toBe('2 : 1');
    expect(eventsArgs).toHaveLength(0); // National matches init with empty events
  });

  it('throws error for unsupported match format', async () => {
    const invalidData = { unsupported: true };
    const file = createMockFile('invalid.json', invalidData);
    
    await expect(importMatchJsonFile(file)).rejects.toThrow(/Unsupported match data format/);
  });

  it('imports batch matches', async () => {
    const validData = {
      matchId: 111,
      matchCentreData: { home: {}, away: {}, events: [] }
    };
    const invalidData = { invalid: true };

    const files = [
      createMockFile('valid.json', validData),
      createMockFile('invalid.json', invalidData)
    ];

    const result = await importMatchesBatch(files);
    
    expect(result.success).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].filename).toBe('invalid.json');
  });
});
