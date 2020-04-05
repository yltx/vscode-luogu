import SuperCommand from '../SuperCommand'
import { removeDir, logout, fetchHomepage } from '../../utils/api'
import { UserStatus } from '../../utils/shared'
import * as vscode from 'vscode'
import * as fs from 'fs'
import luoguStatusBar from '../../views/luoguStatusBar'
// tslint:disable-next-line: space-before-function-paren
export function getStatus(): string {
  return fs.existsSync(exports.luoguJSONPath) ? '1' : '2';
}
export default new SuperCommand({
  onCommand: 'signout',
  handle: async () => {
    if (getStatus() === UserStatus.SignedOut.toString()) {
      vscode.window.showErrorMessage('您没有登录');
      return;
    }
    let data = await fetchHomepage();
    if (data.currentUser === undefined) {
      vscode.window.showErrorMessage('未登录');
      return;
    }
    await logout(data.currentUser.uid);
    removeDir(exports.luoguPath, function () {
      console.log('Successfully deleted .luogu');
      vscode.window.showInformationMessage('注销成功');
      luoguStatusBar.updateStatusBar(UserStatus.SignedOut);
    });
  }
})
