import type { ChannelAdapter, InboundMessage } from './types';

/** In-memory adapter for tests and local demos: inject messages, read replies. */
export class FakeChannel implements ChannelAdapter {
  readonly name = 'fake' as const;
  sent: Array<{ chatId: string; text: string }> = [];
  private handler: ((msg: InboundMessage) => Promise<void>) | null = null;
  private counter = 0;

  async start(onMessage: (msg: InboundMessage) => Promise<void>): Promise<void> {
    this.handler = onMessage;
  }

  async stop(): Promise<void> {
    this.handler = null;
  }

  async send(chatId: string, text: string): Promise<void> {
    this.sent.push({ chatId, text });
  }

  /** Simulate an incoming message and return the replies it produced. */
  async receive(partial: Partial<InboundMessage> & { text?: string }, chatId = 'user-1'): Promise<string[]> {
    if (!this.handler) throw new Error('FakeChannel not started');
    const before = this.sent.length;
    await this.handler({
      channel: 'fake',
      chatId,
      senderId: chatId,
      messageId: `m${++this.counter}`,
      timestamp: Date.now(),
      ...partial,
    });
    return this.sent.slice(before).map((s) => s.text);
  }
}
