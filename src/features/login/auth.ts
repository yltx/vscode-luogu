import * as vscode from 'vscode';
import showLoginView from './ui';
import { randomUUID } from 'crypto';
import { checkCookie, genClientID, logout } from '@/utils/api';

class LuoguSession implements vscode.AuthenticationSession {
  readonly id = randomUUID();
  readonly accessToken: string;
  readonly account: vscode.AuthenticationSessionAccountInformation;
  readonly scopes = [];
  constructor(data: { uid: number; clientID: string; name: string }) {
    this.accessToken = data.clientID;
    this.account = { id: data.uid.toString(), label: data.name };
  }
}

export default class LuoguAuthProvider
  implements vscode.AuthenticationProvider
{
  static readonly ProviderId = 'luogu-auth';
  static readonly SecretKey = 'luogu-auth';
  private _sessionChangeEmitter =
    new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
  private cache: LuoguSession;
  private cacheLock: Promise<void>;
  private status: boolean = false;
  constructor(private readonly secretStorage: vscode.SecretStorage) {
    this.cache = {} as LuoguSession;
    this.cacheLock = this.initialize();
    this.secretStorage.onDidChange(e => {
      if (e.key !== LuoguAuthProvider.SecretKey) return;
      this.cacheLock = this.cacheLock.then(
        () => this.reloadSession(),
        () => this.reloadSession()
      );
    });
  }
  private async initialize() {
    const stored = await this.secretStorage.get(LuoguAuthProvider.SecretKey);
    if (!stored) {
      await this.setAnonymousSession();
      return;
    }

    let session: LuoguSession;
    try {
      session = this.parseSession(stored);
    } catch {
      await this.secretStorage.delete(LuoguAuthProvider.SecretKey);
      await this.setAnonymousSession();
      return;
    }

    try {
      const valid = await checkCookie({
        uid: +session.account.id,
        clientID: session.accessToken
      });
      if (!valid) {
        await this.secretStorage.delete(LuoguAuthProvider.SecretKey);
        await this.setAnonymousSession();
        return;
      }
    } catch {
      // Network error: keep the session and validate it on the next request.
    }

    this.cache = session;
    this.status = true;
    await vscode.commands.executeCommand(
      'setContext',
      'luoguLoginStatus',
      true
    );
  }
  private async reloadSession() {
    const stored = await this.secretStorage.get(LuoguAuthProvider.SecretKey);
    if (stored) {
      let session: LuoguSession;
      try {
        session = this.parseSession(stored);
      } catch {
        await this.secretStorage.delete(LuoguAuthProvider.SecretKey);
        if (this.status) {
          const removed = this.cache;
          await this.setAnonymousSession();
          this._sessionChangeEmitter.fire({
            added: [],
            changed: [],
            removed: [removed]
          });
        }
        return;
      }

      const previous = this.status ? this.cache : undefined;
      this.cache = session;
      this.status = true;
      await vscode.commands.executeCommand(
        'setContext',
        'luoguLoginStatus',
        true
      );
      this._sessionChangeEmitter.fire({
        added: previous ? [] : [session],
        removed: [],
        changed: previous ? [session] : []
      });
      return;
    }

    if (!this.status) return;
    const removed = this.cache;
    await this.setAnonymousSession();
    this._sessionChangeEmitter.fire({
      added: [],
      changed: [],
      removed: [removed]
    });
  }
  private parseSession(value: string): LuoguSession {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('accessToken' in parsed) ||
      typeof parsed.accessToken !== 'string' ||
      !('account' in parsed) ||
      typeof parsed.account !== 'object' ||
      parsed.account === null ||
      !('id' in parsed.account) ||
      typeof parsed.account.id !== 'string' ||
      !('label' in parsed.account) ||
      typeof parsed.account.label !== 'string'
    ) {
      throw new Error('Invalid stored Luogu session');
    }
    return parsed as LuoguSession;
  }
  private async setAnonymousSession() {
    this.cache = new LuoguSession({
      uid: 0,
      clientID: await genClientID(),
      name: ''
    });
    this.status = false;
    await vscode.commands.executeCommand(
      'setContext',
      'luoguLoginStatus',
      false
    );
  }
  get onDidChangeSessions(): vscode.Event<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent> {
    return this._sessionChangeEmitter.event;
  }
  async createSession(): Promise<vscode.AuthenticationSession> {
    await this.cacheLock;
    if (this.status) return this.cache;
    const user = await showLoginView();
    if (user === null) throw new Error('Canceled');
    const session = new LuoguSession(user);
    await this.secretStorage.store(
      LuoguAuthProvider.SecretKey,
      JSON.stringify(session)
    );
    this.status = true;
    return session;
  }
  async getSessions(): Promise<readonly vscode.AuthenticationSession[]> {
    await this.cacheLock;
    return this.status ? [this.cache] : [];
  }
  async removeSession(sessionId: string) {
    await this.cacheLock;
    if (this.status) {
      if (this.cache.id === sessionId) {
        await this.cookie()
          .then(c => checkCookie(c))
          .then(x => (x ? logout() : undefined))
          .catch(err => {
            vscode.window.showErrorMessage(
              `注销失败 ${err instanceof Error ? `：${err.message}` : `。`}\n将直接删除存储的 cookie 信息。`
            );
            console.error(err);
          });
        await this.secretStorage
          .delete(LuoguAuthProvider.SecretKey)
          .then(() => (this.status = false));
      }
    }
  }
  async user() {
    await this.cacheLock;
    return { uid: +this.cache.account.id, name: this.cache.account.label };
  }
  async cookie(): Promise<Cookie> {
    await this.cacheLock;
    return { uid: +this.cache.account.id, clientID: this.cache.accessToken };
  }
}
