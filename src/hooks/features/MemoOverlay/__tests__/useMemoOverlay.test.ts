import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { parseTimeStr } from '@/lib/features/MemoOverlay/utils';
import { useMemoOverlay } from '../useMemoOverlay';

// lib/event-definitions などの外部依存をモックする場合
vi.mock('@/lib/event-definitions', () => ({
  getFlattenedEvents: vi.fn(() => [
    { label: 'シュート', groupCode: 'ATTACK', keywords: ['shot'] },
    { label: 'パス', groupCode: 'ATTACK', keywords: ['pass'] },
    { label: 'タックル', groupCode: 'DEFENSE', keywords: ['tackle'] },
  ]),
}));

describe('parseTimeStr', () => {
  it('should parse empty string to --:--', () => {
    const res = parseTimeStr('');
    expect(res.display).toBe('--:--');
    expect(res.empty).toBe(true);
  });

  it('should parse "12" to 0:12', () => {
    const res = parseTimeStr('12');
    expect(res.display).toBe('0:12');
    expect(res.isInvalid).toBe(false);
  });

  it('should parse "123" to 1:23', () => {
    const res = parseTimeStr('123');
    expect(res.display).toBe('1:23');
  });

  it('should detect invalid seconds (>= 60)', () => {
    const res = parseTimeStr('60');
    expect(res.isInvalid).toBe(true);
    const res2 = parseTimeStr('165'); // 1:65
    expect(res2.isInvalid).toBe(true);
  });
});

describe('useMemoOverlay hook', () => {
  it('should initialize with correct default state (EVENT mode)', () => {
    const { result } = renderHook(() => useMemoOverlay('EVENT'));
    expect(result.current.state.mode).toBe('EVENT');
    expect(result.current.state.phase).toBe(0);
    expect(result.current.state.timeStr).toBe('');
    expect(result.current.state.selectedLabels).toEqual([]);
  });

  it('should handle time input and phase transition to LABEL', () => {
    const { result } = renderHook(() => useMemoOverlay('EVENT'));

    act(() => {
      result.current.actions.appendTimeDigit('1');
      result.current.actions.appendTimeDigit('2');
      result.current.actions.appendTimeDigit('3');
    });

    expect(result.current.state.timeStr).toBe('123');
    expect(result.current.state.formattedTime.display).toBe('1:23');

    act(() => {
      const res = result.current.actions.nextPhase();
      expect(res).toBe('OK');
    });

    expect(result.current.state.phase).toBe(1); // Moved to Label phase
  });

  it('should block transition if time is invalid', () => {
    const { result } = renderHook(() => useMemoOverlay('EVENT'));

    act(() => {
      result.current.actions.appendTimeDigit('6');
      result.current.actions.appendTimeDigit('5');
    });

    act(() => {
      const res = result.current.actions.nextPhase();
      expect(res).toBe('BLOCKED');
    });

    expect(result.current.state.phase).toBe(0);
    expect(result.current.state.error).toBeDefined();
  });

  it('should handle label suggestions and selection', () => {
    const { result } = renderHook(() => useMemoOverlay('EVENT'));

    // Move to label phase
    act(() => {
      result.current.actions.setTimeStr('100');
      result.current.actions.nextPhase();
    });

    act(() => {
      result.current.actions.setLabelInput('シュ');
    });

    expect(result.current.state.suggestions[0].label).toBe('シュート');

    act(() => {
      result.current.actions.confirmSuggestion();
    });

    expect(result.current.state.selectedLabels).toContain('シュート');
    expect(result.current.state.labelInput).toBe('');
  });

  it('should transition to MEMO phase after selecting labels', () => {
    const { result } = renderHook(() => useMemoOverlay('EVENT'));

    act(() => {
      result.current.actions.setTimeStr('100');
    });
    act(() => {
      result.current.actions.nextPhase();
    });
    act(() => {
      result.current.actions.addLabel('テスト');
    });

    let res: any;
    act(() => {
      res = result.current.actions.nextPhase();
    });

    expect(res).toBe('OK');
    expect(result.current.state.phase).toBe(2); // MEMO phase
  });

  it('should generate correct save payload (EVENT)', () => {
    const { result } = renderHook(() => useMemoOverlay('EVENT'));

    act(() => {
      result.current.actions.setTimeStr('123'); // 1:23
      result.current.actions.addLabel('Label1');
      result.current.actions.setMemo('This is a memo');
    });

    const payload = result.current.actions.getSavePayload();
    expect(payload).toEqual({
      type: 'EVENT',
      minute: 1,
      second: 23,
      labels: ['Label1'],
      memo: 'This is a memo',
    });
  });

  it('should generate correct save payload (MATCH)', () => {
    const { result } = renderHook(() => useMemoOverlay('MATCH'));

    act(() => {
      result.current.actions.setMemo('Game memo');
    });

    const payload = result.current.actions.getSavePayload();
    expect(payload).toEqual({
      type: 'MATCH',
      memo: 'Game memo',
    });
  });

  it('should reset all states', () => {
    const { result } = renderHook(() => useMemoOverlay('EVENT'));

    act(() => {
      result.current.actions.setTimeStr('123');
      result.current.actions.addLabel('L1');
      result.current.actions.reset();
    });

    expect(result.current.state.timeStr).toBe('');
    expect(result.current.state.selectedLabels).toEqual([]);
    expect(result.current.state.phase).toBe(0);
  });
});
