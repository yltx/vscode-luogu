import SuperCommand from '../SuperCommand';
import { needLogin } from '@/utils/uiUtils';
import * as vscode from 'vscode';

export default new SuperCommand({
  onCommand: 'userInfo',
  handle: async () => {
    await globalThis.luogu.waitinit;
    try {
      const sessions = await globalThis.luogu.authProvider.getSessions();
      if (sessions.length === 0) {
        needLogin();
        return;
      }
      const user = await globalThis.luogu.authProvider.user();
      vscode.window.showInformationMessage(`${user.name}（UID: ${user.uid}）`);
    } catch (err) {
      vscode.window.showErrorMessage('获取登录信息失败');
      vscode.window.showErrorMessage(`${err}`);
    }
  }
});
