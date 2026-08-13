import { beforeEach, describe, expect, it, vi } from 'vitest';

type SecretChangeListener = (event: { key: string }) => void;

class FakeSecretStorage {
  private readonly values = new Map<string, string>();
  private readonly listeners = new Set<SecretChangeListener>();

  constructor(initial?: string) {
    if (initial !== undefined) this.values.set('luogu-auth', initial);
  }

  get(key: string) {
    return Promise.resolve(this.values.get(key));
  }

  async store(key: string, value: string) {
    this.values.set(key, value);
    this.fire(key);
  }

  async delete(key: string) {
    this.values.delete(key);
    this.fire(key);
  }

  onDidChange(listener: SecretChangeListener) {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  }

  fire(key: string) {
    for (const listener of this.listeners) listener({ key });
  }
}

const executeCommand = vi.fn(() => Promise.resolve());
const checkCookie = vi.fn(() => Promise.resolve(true));
const genClientID = vi.fn(() => Promise.resolve('anonymous-client'));

class EventEmitter<T> {
  private readonly listeners = new Set<(event: T) => void>();
  readonly event = (listener: (event: T) => void) => {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  };

  fire(event: T) {
    for (const listener of this.listeners) listener(event);
  }
}

vi.mock('vscode', () => ({
  commands: { executeCommand },
  EventEmitter,
  window: { showErrorMessage: vi.fn() }
}));

vi.mock('@/utils/api', () => ({
  checkCookie,
  genClientID,
  logout: vi.fn(() => Promise.resolve())
}));

vi.mock('./ui', () => ({ default: vi.fn() }));

const { default: LuoguAuthProvider } = await import('./auth');

const withTimeout = <T>(promise: Promise<T>) =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timed out')), 50)
    )
  ]);

describe('LuoguAuthProvider', () => {
  beforeEach(() => {
    executeCommand.mockClear();
    checkCookie.mockClear();
    genClientID.mockReset().mockResolvedValue('anonymous-client');
  });

  it('ignores unrelated secret changes without blocking authentication', async () => {
    const storage = new FakeSecretStorage();
    const provider = new LuoguAuthProvider(storage as never);

    await expect(withTimeout(provider.getSessions())).resolves.toEqual([]);

    storage.fire('another-secret');

    await expect(withTimeout(provider.getSessions())).resolves.toEqual([]);
  });

  it('recovers from malformed stored session data', async () => {
    const storage = new FakeSecretStorage('{invalid json');
    const provider = new LuoguAuthProvider(storage as never);

    await expect(withTimeout(provider.getSessions())).resolves.toEqual([]);
    await expect(withTimeout(provider.cookie())).resolves.toEqual({
      uid: 0,
      clientID: 'anonymous-client'
    });
  });

  it('rejects instead of hanging when anonymous session creation fails', async () => {
    genClientID.mockRejectedValueOnce(new Error('network unavailable'));
    const storage = new FakeSecretStorage();
    const provider = new LuoguAuthProvider(storage as never);

    await expect(withTimeout(provider.getSessions())).rejects.toThrow(
      'network unavailable'
    );
  });

  it('does not invalidate a newer session for an older request cookie', async () => {
    const storage = new FakeSecretStorage(
      JSON.stringify({
        id: 'new-session',
        accessToken: 'new-client',
        account: { id: '2', label: 'New user' },
        scopes: []
      })
    );
    const provider = new LuoguAuthProvider(storage as never);
    await provider.getSessions();

    await expect(
      provider.invalidateSession({ uid: 1, clientID: 'old-client' })
    ).resolves.toBe(false);

    await expect(provider.cookie()).resolves.toEqual({
      uid: 2,
      clientID: 'new-client'
    });
    await expect(provider.getSessions()).resolves.toHaveLength(1);
    await expect(storage.get('luogu-auth')).resolves.toBeDefined();
  });

  it('invalidates the session matching the request cookie', async () => {
    const storage = new FakeSecretStorage(
      JSON.stringify({
        id: 'current-session',
        accessToken: 'current-client',
        account: { id: '1', label: 'Current user' },
        scopes: []
      })
    );
    const provider = new LuoguAuthProvider(storage as never);
    await provider.getSessions();

    await expect(
      provider.invalidateSession({ uid: 1, clientID: 'current-client' })
    ).resolves.toBe(true);

    await expect(provider.getSessions()).resolves.toEqual([]);
    await expect(provider.cookie()).resolves.toEqual({
      uid: 0,
      clientID: 'current-client'
    });
    await expect(storage.get('luogu-auth')).resolves.toBeUndefined();
  });
});
