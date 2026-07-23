export interface CsrfTokenManagerDependencies {
  fetchToken(): Promise<string>;
  onDidChangeSessions(listener: () => void): { dispose(): void };
  reportError(error: unknown): void;
  sleep(milliseconds: number): Promise<void>;
  now(): number;
  setInterval(
    listener: () => void,
    milliseconds: number
  ): ReturnType<typeof setInterval>;
  clearInterval(timer: ReturnType<typeof setInterval>): void;
}

export default class CsrfTokenManager {
  private token: string | undefined;
  private generation = 0;
  private pending: { generation: number; promise: Promise<string> } | undefined;
  private sessionListener: { dispose(): void } | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly dependencies: CsrfTokenManagerDependencies) {}

  start() {
    if (this.timer !== undefined) return;
    this.refreshInBackground();
    this.sessionListener = this.dependencies.onDidChangeSessions(() => {
      this.generation++;
      this.token = undefined;
      this.refreshInBackground();
    });
    this.timer = this.dependencies.setInterval(() => {
      if (this.shouldRefresh()) this.refreshInBackground();
    }, 60_000);
  }

  getToken() {
    return this.token === undefined
      ? this.refresh()
      : Promise.resolve(this.token);
  }

  refresh() {
    const generation = this.generation;
    if (this.pending?.generation === generation) return this.pending.promise;

    const pending = { generation, promise: Promise.resolve('') };
    pending.promise = this.fetchWithRetry()
      .then(token => {
        if (this.generation === generation) this.token = token;
        return token;
      })
      .finally(() => {
        if (this.pending === pending) this.pending = undefined;
      });
    this.pending = pending;
    return pending.promise;
  }

  dispose() {
    this.sessionListener?.dispose();
    this.sessionListener = undefined;
    if (this.timer !== undefined) {
      this.dependencies.clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private async fetchWithRetry() {
    let lastError: unknown;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await this.dependencies.fetchToken();
      } catch (error) {
        lastError = error;
        if (attempt < 3) await this.dependencies.sleep(200);
      }
    }
    throw new Error('Failed to fetch CSRF token', { cause: lastError });
  }

  private shouldRefresh() {
    if (this.token === undefined) return true;
    const expiresAt = Number.parseInt(this.token.split(':', 1)[0], 10) * 1000;
    return (
      !Number.isFinite(expiresAt) ||
      this.dependencies.now() + 200_000 >= expiresAt
    );
  }

  private refreshInBackground() {
    void this.refresh().catch(error => this.dependencies.reportError(error));
  }
}
