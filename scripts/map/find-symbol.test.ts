import { describe, expect, it } from 'bun:test';
import { findSymbolsInMap } from './find-symbol';

describe('findSymbolsInMap', () => {
  const dummyMap = [
    'src/features/teams/hooks/use-chelsea-squad.ts: exports: CHELSEA_TACTICS_MATCH_ID, useChelseaSquad',
    'src/features/teams/hooks/use-player-master.ts: exports: usePlayerMaster, usePlayersMasterBatch',
    'src/lib/agents/runtime.ts: exports: TurnExecutionParams, TurnExecutionResult, AgentRuntime',
    'src/lib/agents/types.ts: exports: AgentStep, AgentStatus, Action',
    'src/lib/utils.ts: exports: cn',
  ].join('\n');

  it('matches keyword case-insensitively', () => {
    const results = findSymbolsInMap(dummyMap, 'chelsea');
    expect(results).toHaveLength(1);
    expect(results[0]).toContain('use-chelsea-squad.ts');
  });

  it('finds multiple matches across files', () => {
    const results = findSymbolsInMap(dummyMap, 'Agent');
    expect(results).toHaveLength(2);
    expect(results[0]).toContain('src/lib/agents/runtime.ts');
    expect(results[1]).toContain('src/lib/agents/types.ts');
  });

  it('returns empty array when no matches found', () => {
    const results = findSymbolsInMap(dummyMap, 'NonExistentSymbol123');
    expect(results).toHaveLength(0);
  });

  it('prioritizes exact export matches if multiple hits', () => {
    const mapWithVariants = [
      'src/a.ts: exports: usePlayerMasterExtended',
      'src/b.ts: exports: usePlayerMaster',
    ].join('\n');

    const results = findSymbolsInMap(mapWithVariants, 'usePlayerMaster');
    expect(results).toHaveLength(2);
    expect(results[0]).toContain('src/b.ts');
  });

  it('handles empty query gracefully', () => {
    const results = findSymbolsInMap(dummyMap, '');
    expect(results).toHaveLength(0);
  });
});
