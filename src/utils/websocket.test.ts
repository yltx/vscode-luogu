import { beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (...args: unknown[]) => void;

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  readonly listeners = new Map<string, Listener[]>();
  readonly send = vi.fn((_data: string, callback?: (error?: Error) => void) =>
    callback?.()
  );
  readonly close = vi.fn();

  constructor() {
    FakeWebSocket.instances.push(this);
  }

  on(event: string, listener: Listener) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    for (const listener of this.listeners.get(event) ?? []) listener(...args);
  }
}

class EventEmitter<T> {
  private readonly listeners = new Set<(event: T) => void>();
  readonly event = (listener: (event: T) => void) => {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  };
  fire(event: T) {
    for (const listener of this.listeners) listener(event);
  }
  dispose() {
    this.listeners.clear();
  }
}

vi.mock('ws', () => ({ default: FakeWebSocket }));
vi.mock('vscode', () => ({ EventEmitter }));
vi.mock('./uiUtils', () => ({ needLogin: vi.fn() }));

const { createWebsocket } = await import('./websocket');

describe('createWebsocket', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.useFakeTimers();
    globalThis.luogu = {
      authProvider: {
        cookie: vi.fn(() =>
          Promise.resolve({ uid: 123, clientID: 'client-id' })
        )
      }
    } as never;
  });

  it('clears the handshake timeout after joining', async () => {
    const pending = createWebsocket('record.track', '42');
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    const socket = FakeWebSocket.instances[0];
    socket.emit('open');
    socket.emit(
      'message',
      Buffer.from(
        JSON.stringify({
          _ws_type: 'join_result',
          welcome_message: { status: 0 }
        })
      )
    );

    const connection = await pending;
    await vi.advanceTimersByTimeAsync(6000);

    expect(socket.close).not.toHaveBeenCalled();
    connection.dispose();
    expect(socket.close).toHaveBeenCalledTimes(1);
  });

  it('closes the socket when the handshake times out', async () => {
    const pending = createWebsocket('record.track', '42');
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    const socket = FakeWebSocket.instances[0];

    const rejection = expect(pending).rejects.toThrow(
      'Websocket did not receive handshake response'
    );
    await vi.advanceTimersByTimeAsync(6000);
    await rejection;

    expect(socket.close).toHaveBeenCalledTimes(1);
  });

  it('disposes a resolved connection only once', async () => {
    const pending = createWebsocket('record.track', '42');
    await vi.waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
    const socket = FakeWebSocket.instances[0];
    socket.emit(
      'message',
      Buffer.from(
        JSON.stringify({
          _ws_type: 'join_result',
          welcome_message: { status: 2 }
        })
      )
    );
    const connection = await pending;

    connection.dispose();
    connection.dispose();

    expect(socket.close).toHaveBeenCalledTimes(1);
  });
});
