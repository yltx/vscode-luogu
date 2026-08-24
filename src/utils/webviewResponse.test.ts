import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({ default: {} }));

const { default: useWebviewResponseHandle } = await import('./webviewResponse');

class FakeWebview {
  listener?: (message: unknown) => Promise<void>;
  readonly postMessage = vi.fn(() => Promise.resolve(true));

  onDidReceiveMessage(listener: (message: unknown) => Promise<void>) {
    this.listener = listener;
    return { dispose: () => {} };
  }

  receive(message: unknown) {
    if (!this.listener) throw new Error('Message listener not registered');
    return this.listener(message);
  }
}

const uuid = '1a37c560-0549-4cf5-b785-ec52d5e4c01f';

describe('useWebviewResponseHandle', () => {
  it('dispatches a valid request and returns its result', async () => {
    const webview = new FakeWebview();
    const handler = vi.fn((data: { page: number }) => {
      expect(data.page).toBe(2);
      return [];
    });
    useWebviewResponseHandle(webview as never, { BenbenUpdate: handler });

    await webview.receive({ type: 'BenbenUpdate', data: { page: 2 }, uuid });

    expect(handler).toHaveBeenCalledWith({ page: 2 });
    expect(webview.postMessage).toHaveBeenCalledWith({
      data: [],
      uuid
    });
  });

  it('rejects invalid payloads before invoking a handler', async () => {
    const webview = new FakeWebview();
    const handler = vi.fn();
    useWebviewResponseHandle(webview as never, { BenbenUpdate: handler });

    await webview.receive({
      type: 'BenbenUpdate',
      data: { page: 'not-a-number' },
      uuid
    });

    expect(handler).not.toHaveBeenCalled();
    expect(webview.postMessage).toHaveBeenCalledWith({
      error: 'Invalid data for Webview message: BenbenUpdate',
      uuid
    });
  });

  it('validates testcase download IDs', async () => {
    const webview = new FakeWebview();
    const handler = vi.fn();
    useWebviewResponseHandle(webview as never, { DownloadTestcase: handler });

    await webview.receive({
      type: 'DownloadTestcase',
      data: { testcaseId: '4' },
      uuid
    });

    expect(handler).not.toHaveBeenCalled();
    expect(webview.postMessage).toHaveBeenCalledWith({
      error: 'Invalid data for Webview message: DownloadTestcase',
      uuid
    });

    await webview.receive({
      type: 'DownloadTestcase',
      data: { testcaseId: -1 },
      uuid
    });
    expect(handler).not.toHaveBeenCalled();
  });

  it('responds to unknown message types instead of leaving requests pending', async () => {
    const webview = new FakeWebview();
    useWebviewResponseHandle(webview as never, {});

    await webview.receive({ type: 'UnknownMessage', data: {}, uuid });

    expect(webview.postMessage).toHaveBeenCalledWith({
      error: 'Unsupported Webview message type: UnknownMessage',
      uuid
    });
  });

  it('does not accept message types inherited from object prototypes', async () => {
    const webview = new FakeWebview();
    useWebviewResponseHandle(webview as never, {});

    await webview.receive({ type: 'toString', data: undefined, uuid });

    expect(webview.postMessage).toHaveBeenCalledWith({
      error: 'Unsupported Webview message type: toString',
      uuid
    });
  });

  it('serializes thrown errors as messages', async () => {
    const webview = new FakeWebview();
    useWebviewResponseHandle(webview as never, {
      BenbenSend: () => {
        throw new Error('request failed');
      }
    });

    await webview.receive({
      type: 'BenbenSend',
      data: { comment: 'hello' },
      uuid
    });

    expect(webview.postMessage).toHaveBeenCalledWith({
      error: 'request failed',
      uuid
    });
  });

  it('ignores malformed envelopes that cannot be correlated', async () => {
    const webview = new FakeWebview();
    const handler = vi.fn();
    useWebviewResponseHandle(webview as never, { BenbenSend: handler });

    await webview.receive({
      type: 'BenbenSend',
      data: { comment: 'hello' },
      uuid: 'invalid'
    });

    expect(handler).not.toHaveBeenCalled();
    expect(webview.postMessage).not.toHaveBeenCalled();
  });
});
