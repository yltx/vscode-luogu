import { beforeEach, describe, expect, it, vi } from 'vitest';
import CsrfTokenManager, {
  CsrfTokenManagerDependencies
} from './csrfTokenManager';

const createManager = () => {
  let sessionListener = () => {};
  const dependencies: CsrfTokenManagerDependencies = {
    fetchToken: vi.fn(() => Promise.resolve('2000000000:token')),
    onDidChangeSessions: vi.fn(listener => {
      sessionListener = listener;
      return { dispose: vi.fn() };
    }),
    reportError: vi.fn(),
    sleep: vi.fn(() => Promise.resolve()),
    now: vi.fn(() => 1_000_000_000_000),
    setInterval: vi.fn(() => 1 as never),
    clearInterval: vi.fn()
  };
  return {
    dependencies,
    manager: new CsrfTokenManager(dependencies),
    changeSession: () => sessionListener()
  };
};

describe('CsrfTokenManager', () => {
  beforeEach(() => vi.clearAllMocks());

  it('coalesces concurrent token requests', async () => {
    const { manager, dependencies } = createManager();
    let resolveToken!: (token: string) => void;
    vi.mocked(dependencies.fetchToken).mockReturnValueOnce(
      new Promise(resolve => (resolveToken = resolve))
    );

    const first = manager.getToken();
    const second = manager.getToken();

    expect(dependencies.fetchToken).toHaveBeenCalledTimes(1);
    resolveToken('2000000000:shared');
    await expect(Promise.all([first, second])).resolves.toEqual([
      '2000000000:shared',
      '2000000000:shared'
    ]);
  });

  it('retries token acquisition before rejecting', async () => {
    const { manager, dependencies } = createManager();
    vi.mocked(dependencies.fetchToken).mockRejectedValue(new Error('offline'));

    await expect(manager.getToken()).rejects.toThrow(
      'Failed to fetch CSRF token'
    );
    expect(dependencies.fetchToken).toHaveBeenCalledTimes(4);
    expect(dependencies.sleep).toHaveBeenCalledTimes(3);
  });

  it('invalidates the cached token when the session changes', async () => {
    const { manager, dependencies, changeSession } = createManager();
    manager.start();
    await manager.getToken();
    vi.mocked(dependencies.fetchToken).mockResolvedValueOnce(
      '2000000001:new-token'
    );

    changeSession();
    await expect(manager.getToken()).resolves.toBe('2000000001:new-token');
  });

  it('does not let an old session request overwrite a newer token', async () => {
    const { manager, dependencies, changeSession } = createManager();
    let resolveOld!: (token: string) => void;
    let resolveNew!: (token: string) => void;
    vi.mocked(dependencies.fetchToken)
      .mockReturnValueOnce(new Promise(resolve => (resolveOld = resolve)))
      .mockReturnValueOnce(new Promise(resolve => (resolveNew = resolve)));

    manager.start();
    changeSession();
    resolveNew('2000000001:new-token');
    await expect(manager.getToken()).resolves.toBe('2000000001:new-token');
    resolveOld('2000000000:old-token');
    await Promise.resolve();

    await expect(manager.getToken()).resolves.toBe('2000000001:new-token');
  });

  it('refreshes malformed tokens without throwing from the timer', async () => {
    const { manager, dependencies } = createManager();
    vi.mocked(dependencies.fetchToken)
      .mockResolvedValueOnce('malformed')
      .mockResolvedValueOnce('2000000001:replacement');
    manager.start();
    await manager.getToken();
    const timer = vi.mocked(dependencies.setInterval).mock.calls[0][0];

    timer();
    await vi.waitFor(() =>
      expect(dependencies.fetchToken).toHaveBeenCalledTimes(2)
    );
    expect(dependencies.reportError).not.toHaveBeenCalled();
  });

  it('disposes its timer and session listener', () => {
    const { manager, dependencies } = createManager();
    manager.start();
    const disposable = vi.mocked(dependencies.onDidChangeSessions).mock
      .results[0].value;

    manager.dispose();

    expect(disposable.dispose).toHaveBeenCalled();
    expect(dependencies.clearInterval).toHaveBeenCalledWith(1);
  });
});
