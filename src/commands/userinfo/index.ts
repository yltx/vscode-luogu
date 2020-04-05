import SuperCommand from '../SuperCommand'
import { UserStatus } from '../../utils/shared'
import { fetchHomepage } from '../../utils/api'
import * as vscode from 'vscode'
import * as fs from 'fs'

export function getStatus (): string {
  return fs.existsSync(exports.luoguJSONPath) ? '1' : '2';
}
export default new SuperCommand({
  onCommand: 'userInfo',
  handle: async () => {
    if (getStatus() === UserStatus.SignedOut.toString()) {
      vscode.window.showErrorMessage('未登录');
      return;
    }
    let data = await fetchHomepage();
    console.log(data);
    if (data.currentUser === undefined) {
      vscode.window.showErrorMessage('未登录');
      return;
    }
    vscode.window.showInformationMessage(data.currentUser.name);
  }
})
