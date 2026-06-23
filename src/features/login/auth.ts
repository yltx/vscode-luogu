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
    let finishlock = () => {};
    this.cache = {} as LuoguSession;
    this.cacheLock = new Promise(resolve => (finishlock = resolve));
    this.secretStorage.get(LuoguAuthProvider.SecretKey).then(async x => {
      if (x) {
        const parsed = JSON.parse(x);
        try {
          const valid = await checkCookie({
            uid: +parsed.account.id,
            clientID: parsed.accessToken
          });
          if (!valid) {
            await this.secretStorage.delete(LuoguAuthProvider.SecretKey);
            this.cache = new LuoguSession({
              uid: 0,
              clientID: await genClientID(),
              name: ''
            });
            vscode.commands.executeCommand(
              'setContext',
              'luoguLoginStatus',
              false
            );
            finishlock();
            return;
          }
        } catch {
          // Network error — keep the session, validate later
        }
        this.cache = parsed;
        this.status = true;
        vscode.commands.executeCommand('setContext', 'luoguLoginStatus', true);
      } else {
        this.cache = new LuoguSession({
          uid: 0,
          clientID: await genClientID(),
          name: ''
        });
        vscode.commands.executeCommand('setContext', 'luoguLoginStatus', false);
      }
      finishlock();
    });
    this.secretStorage.onDidChange(async e => {
      let finishlock = () => {};
      this.cacheLock = new Promise(resolve => (finishlock = resolve));
      if (e.key !== LuoguAuthProvider.SecretKey) return;
      const x = await this.secretStorage.get(LuoguAuthProvider.SecretKey);
      if (x)
        this._sessionChangeEmitter.fire({
          added: [(this.cache = JSON.parse(x))],
          removed: [],
          changed: []
        }),
          vscode.commands.executeCommand(
            'setContext',
            'luoguLoginStatus',
            true
          );
      else if (this.cache)
        this._sessionChangeEmitter.fire({
          added: [],
          changed: [],
          removed: [this.cache]
        }),
          (this.cache = new LuoguSession({
            uid: 0,
            clientID: await genClientID(),
            name: ''
          })),
          vscode.commands.executeCommand(
            'setContext',
            'luoguLoginStatus',
            false
          );
      finishlock();
    });
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
