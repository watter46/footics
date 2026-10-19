export interface BackgroundCommandContext {
  activeTab?: Browser.tabs.Tab;
  findFooticsTab: () => Promise<Browser.tabs.Tab | undefined>;
  sendBridgeMessage: <T = unknown>(
    message: string,
    data: unknown,
    destination: string,
  ) => Promise<T>;
  storage: typeof browser.storage.local;
  captureTab: (options: {
    format: 'jpeg';
    quality: number;
  }) => Promise<string | undefined>;
  processCanvas: (dataUrl: string, tab?: Browser.tabs.Tab) => Promise<void>;
  nativeSendMessage?: (tabId: number, message: unknown) => Promise<unknown>;
}

export interface CommandHandler {
  readonly commandName: string;
  execute(
    tab: Browser.tabs.Tab | undefined,
    ctx: BackgroundCommandContext,
  ): Promise<void>;
}
