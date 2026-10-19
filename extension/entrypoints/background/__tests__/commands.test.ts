import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../../constants';
import { CaptureCommand } from '../commands/capture-command';
import {
  EventMemoCommand,
  MatchMemoCommand,
  MemoCommand,
} from '../commands/memo-command';
import { MiniModeCommand } from '../commands/mini-mode-command';
import { CommandRegistry } from '../commands/registry';
import type {
  BackgroundCommandContext,
  CommandHandler,
} from '../commands/types';

function createMockTab(
  id = 1,
  url = 'https://example.com/video',
): Browser.tabs.Tab {
  return {
    id,
    index: 0,
    windowId: 1,
    highlighted: true,
    active: true,
    pinned: false,
    incognito: false,
    url,
    title: 'Sample Video',
  } as Browser.tabs.Tab;
}

function createMockContext(
  overrides?: Partial<BackgroundCommandContext>,
): BackgroundCommandContext {
  const storageData: Record<string, unknown> = {};

  return {
    activeTab: createMockTab(10),
    findFooticsTab: vi.fn().mockResolvedValue(undefined),
    sendBridgeMessage: vi.fn().mockResolvedValue(undefined),
    storage: {
      get: vi.fn(async (keys?: unknown) => {
        if (typeof keys === 'string') {
          return { [keys]: storageData[keys] };
        }
        return storageData;
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(storageData, items);
      }),
    } as unknown as typeof browser.storage.local,
    captureTab: vi.fn().mockResolvedValue('data:image/jpeg;base64,mock-data'),
    processCanvas: vi.fn().mockResolvedValue(undefined),
    nativeSendMessage: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('CommandRegistry', () => {
  it('ハンドラーを登録し、登録一覧を取得できる', () => {
    const registry = new CommandRegistry();
    const handler1: CommandHandler = {
      commandName: 'cmd-1',
      execute: vi.fn(),
    };
    const handler2: CommandHandler = {
      commandName: 'cmd-2',
      execute: vi.fn(),
    };

    registry.register(handler1).register(handler2);

    expect(registry.getRegisteredCommands()).toEqual(['cmd-1', 'cmd-2']);
  });

  it('登録されたハンドラーを正しくディスパッチする', async () => {
    const registry = new CommandRegistry();
    const handler: CommandHandler = {
      commandName: 'test-command',
      execute: vi.fn().mockResolvedValue(undefined),
    };
    registry.register(handler);

    const mockTab = createMockTab(1);
    const mockCtx = createMockContext();

    await registry.execute('test-command', mockTab, mockCtx);

    expect(handler.execute).toHaveBeenCalledTimes(1);
    expect(handler.execute).toHaveBeenCalledWith(mockTab, mockCtx);
  });

  it('未登録のコマンドが渡された場合、警告を出しつつ例外を投げずに終了する', async () => {
    const registry = new CommandRegistry();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const mockCtx = createMockContext();

    await expect(
      registry.execute('unknown-command', undefined, mockCtx),
    ).resolves.not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown command: unknown-command'),
    );
    warnSpy.mockRestore();
  });
});

describe('CaptureCommand', () => {
  const captureCommand = new CaptureCommand();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('activeTab が存在しない場合は処理を中断する', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = createMockContext({ activeTab: undefined });

    await captureCommand.execute(undefined, ctx);

    expect(ctx.sendBridgeMessage).not.toHaveBeenCalled();
    expect(ctx.captureTab).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No active tab found'),
    );
    warnSpy.mockRestore();
  });

  it('正常系: sendBridgeMessage が成功した場合、自律フォールバックは実行されない', async () => {
    const ctx = createMockContext();

    await captureCommand.execute(ctx.activeTab, ctx);

    expect(ctx.sendBridgeMessage).toHaveBeenCalledWith(
      'TRIGGER_CAPTURE',
      {},
      'content-script@10',
    );
    expect(ctx.nativeSendMessage).not.toHaveBeenCalled();
    expect(ctx.captureTab).not.toHaveBeenCalled();
    expect(ctx.processCanvas).not.toHaveBeenCalled();
  });

  it('フォールバック1: sendBridgeMessage が失敗し、nativeSendMessage が成功した場合', async () => {
    const ctx = createMockContext({
      sendBridgeMessage: vi.fn().mockRejectedValue(new Error('bridge failed')),
    });

    await captureCommand.execute(ctx.activeTab, ctx);

    expect(ctx.sendBridgeMessage).toHaveBeenCalled();
    expect(ctx.nativeSendMessage).toHaveBeenCalledWith(10, {
      type: 'TRIGGER_CAPTURE',
    });
    expect(ctx.captureTab).not.toHaveBeenCalled();
    expect(ctx.processCanvas).not.toHaveBeenCalled();
  });

  it('フォールバック2: bridge と native 送信の両方が失敗した場合、自律キャプチャと canvas 処理を行う', async () => {
    const ctx = createMockContext({
      sendBridgeMessage: vi.fn().mockRejectedValue(new Error('bridge failed')),
      nativeSendMessage: vi.fn().mockRejectedValue(new Error('native failed')),
      captureTab: vi.fn().mockResolvedValue('data:image/jpeg;base64,captured'),
    });

    await captureCommand.execute(ctx.activeTab, ctx);

    expect(ctx.captureTab).toHaveBeenCalledWith({
      format: 'jpeg',
      quality: 98,
    });
    expect(ctx.processCanvas).toHaveBeenCalledWith(
      'data:image/jpeg;base64,captured',
      ctx.activeTab,
    );
  });

  it('フォールバック2でキャプチャ失敗時もエラーログを記録して安全に終了する', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ctx = createMockContext({
      sendBridgeMessage: vi.fn().mockRejectedValue(new Error('bridge failed')),
      nativeSendMessage: vi.fn().mockRejectedValue(new Error('native failed')),
      captureTab: vi.fn().mockRejectedValue(new Error('capture tab failed')),
    });

    await captureCommand.execute(ctx.activeTab, ctx);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Direct background tab capture failed:'),
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });
});

describe('MiniModeCommand', () => {
  const miniModeCommand = new MiniModeCommand();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('activeTab が存在しない場合は処理を中断する', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = createMockContext({ activeTab: undefined });

    await miniModeCommand.execute(undefined, ctx);

    expect(ctx.sendBridgeMessage).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('No active tab found'),
    );
    warnSpy.mockRestore();
  });

  it('正常系: TOGGLE_MINI_MODE を activeTab に送信する', async () => {
    const ctx = createMockContext();

    await miniModeCommand.execute(ctx.activeTab, ctx);

    expect(ctx.sendBridgeMessage).toHaveBeenCalledWith(
      'TOGGLE_MINI_MODE',
      {},
      'content-script@10',
    );
  });

  it('送信失敗時も警告を出力して例外を投げない', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = createMockContext({
      sendBridgeMessage: vi.fn().mockRejectedValue(new Error('Failed')),
    });

    await expect(
      miniModeCommand.execute(ctx.activeTab, ctx),
    ).resolves.not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send TOGGLE_MINI_MODE:'),
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });
});

describe('MemoCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('storage に matchId が保存されている場合、MATCH モードでキャッシュメモとともに OPEN_OVERLAY を開く', async () => {
    const matchMemoCommand = new MatchMemoCommand();
    const ctx = createMockContext({
      storage: {
        get: vi.fn(async (key: string) => {
          if (key === STORAGE_KEYS.LAST_ACTIVE_MATCH_ID) {
            return { [STORAGE_KEYS.LAST_ACTIVE_MATCH_ID]: 'match-123' };
          }
          if (key === `${STORAGE_KEYS.MATCH_MEMO_CACHE_PREFIX}match-123`) {
            return {
              [`${STORAGE_KEYS.MATCH_MEMO_CACHE_PREFIX}match-123`]:
                '保存済みメモ内容',
            };
          }
          return {};
        }),
      } as unknown as typeof browser.storage.local,
    });

    await matchMemoCommand.execute(ctx.activeTab, ctx);

    expect(ctx.sendBridgeMessage).toHaveBeenCalledWith(
      'OPEN_OVERLAY',
      {
        mode: 'MATCH',
        matchId: 'match-123',
        initialData: { memo: '保存済みメモ内容' },
      },
      'content-script@10',
    );
  });

  it('storage に matchId がないが Footics タブが存在する場合、GET_ACTIVE_MATCH_INFO で matchId を特定する', async () => {
    const matchMemoCommand = new MatchMemoCommand();
    const footicsTab = createMockTab(99, 'https://footics.app');
    const ctx = createMockContext({
      findFooticsTab: vi.fn().mockResolvedValue(footicsTab),
      sendBridgeMessage: vi.fn().mockImplementation(async (message: string) => {
        if (message === 'GET_ACTIVE_MATCH_INFO') {
          return { matchId: 'match-from-tab' };
        }
        return undefined;
      }),
    });

    await matchMemoCommand.execute(ctx.activeTab, ctx);

    expect(ctx.sendBridgeMessage).toHaveBeenCalledWith(
      'GET_ACTIVE_MATCH_INFO',
      {},
      'content-script@99',
    );
    expect(ctx.sendBridgeMessage).toHaveBeenCalledWith(
      'OPEN_OVERLAY',
      {
        mode: 'MATCH',
        matchId: 'match-from-tab',
        initialData: { memo: '' },
      },
      'content-script@10',
    );
  });

  it('storage にも Footics タブにも matchId がない場合、エラーメッセージ付きで OPEN_OVERLAY を開く', async () => {
    const matchMemoCommand = new MatchMemoCommand();
    const ctx = createMockContext({
      findFooticsTab: vi.fn().mockResolvedValue(undefined),
    });

    await matchMemoCommand.execute(ctx.activeTab, ctx);

    expect(ctx.sendBridgeMessage).toHaveBeenCalledWith(
      'OPEN_OVERLAY',
      {
        mode: 'MATCH',
        error: 'Footics本体のタブを開いて試合を特定してください',
      },
      'content-script@10',
    );
  });

  it('EVENT モードの場合、メモキャッシュは参照せず OPEN_OVERLAY (mode: EVENT) を開く', async () => {
    const eventMemoCommand = new EventMemoCommand();
    const ctx = createMockContext({
      storage: {
        get: vi.fn(async (key: string) => {
          if (key === STORAGE_KEYS.LAST_ACTIVE_MATCH_ID) {
            return { [STORAGE_KEYS.LAST_ACTIVE_MATCH_ID]: 'match-456' };
          }
          return {};
        }),
      } as unknown as typeof browser.storage.local,
    });

    await eventMemoCommand.execute(ctx.activeTab, ctx);

    expect(ctx.sendBridgeMessage).toHaveBeenCalledWith(
      'OPEN_OVERLAY',
      {
        mode: 'EVENT',
        matchId: 'match-456',
        initialData: undefined,
      },
      'content-script@10',
    );
  });

  it('MemoCommand に直接 commandName を渡してインスタンス化できる', () => {
    const cmd = new MemoCommand('toggle-match-memo');
    expect(cmd.commandName).toBe('toggle-match-memo');
    expect(cmd.mode).toBe('MATCH');

    const cmd2 = new MemoCommand('toggle-event-memo');
    expect(cmd2.commandName).toBe('toggle-event-memo');
    expect(cmd2.mode).toBe('EVENT');
  });
});
