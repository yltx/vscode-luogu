import SuperCommand from '../SuperCommand'
import { UserStatus } from '@/utils/shared'
import { fetchHomepage } from '@/utils/api'
import * as vscode from 'vscode'
import luoguStatusBar from '@/views/luoguStatusBar'

export default new SuperCommand({
  onCommand: 'userInfo',
  handle: async () => {
    while (!exports.init) { continue; }
    try {
      const data = await fetchHomepage();
      if (data.currentUser === undefined) {
        vscode.window.showErrorMessage('未登录');
        luoguStatusBar.updateStatusBar(UserStatus.SignedOut)
        return;
      }
      vscode.window.showInformationMessage(data.currentUser.name);
    } catch (err) {
      vscode.window.showErrorMessage('获取登录信息失败');
      vscode.window.showErrorMessage(err.toString());
    }
  }
})
