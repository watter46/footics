import type { BackgroundCommandContext, CommandHandler } from './types';

export class CommandRegistry {
  private handlers = new Map<string, CommandHandler>();

  register(handler: CommandHandler): this {
    this.handlers.set(handler.commandName, handler);
    return this;
  }

  async execute(
    commandName: string,
    tab: Browser.tabs.Tab | undefined,
    ctx: BackgroundCommandContext,
  ): Promise<void> {
    const handler = this.handlers.get(commandName);
    if (!handler) {
      console.warn(`[Footics BG] Unknown command: ${commandName}`);
      return;
    }
    await handler.execute(tab, ctx);
  }

  getRegisteredCommands(): string[] {
    return Array.from(this.handlers.keys());
  }
}
