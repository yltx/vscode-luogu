import LuoguAuthProvider from './auth';
import * as vscode from 'vscode';

export const Login = async () => {
  const session = await vscode.authentication.getSession(
    LuoguAuthProvider.ProviderId,
    [],
    { createIfNone: true }
  );
  vscode.window.showInformationMessage(`${session.account.label} 登录成功。`);
};

export const Logout = async () => {
  const sessions = await globalThis.luogu.authProvider.getSessions();
  if (sessions.length === 0) {
    vscode.window.showInformationMessage('当前未登录洛谷账号。');
    return;
  }
  await globalThis.luogu.authProvider.removeSession(sessions[0].id);
  vscode.window.showInformationMessage('已登出洛谷账号。');
};

export default function registerLogin(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('luogu.signin', Login),
    vscode.commands.registerCommand('luogu.signout', Logout),
    vscode.authentication.registerAuthenticationProvider(
      LuoguAuthProvider.ProviderId,
      'Luogu',
      (globalThis.luogu.authProvider = new LuoguAuthProvider(context.secrets))
    )
  );
}
