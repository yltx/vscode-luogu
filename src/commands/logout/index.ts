import SuperCommand from '../SuperCommand'
import { setUID, setClientID, logout, getStatus } from '@/utils/api'
import { UserStatus } from '@/utils/shared'
import luoguStatusBar from '@/views/luoguStatusBar'

import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
exports.luoguPath = path.join(os.homedir(), '.luogu');

export default new SuperCommand({
  onCommand: 'signout',
  handle: async () => {
    while (!exports.init) { continue; }
    try {
      if (await getStatus() === UserStatus.SignedOut.toString()) {
        vscode.window.showErrorMessage('未登录');
        return;
      }
    } catch (err) {
      console.error(err)
      vscode.window.showErrorMessage(err.toString());
      return;
    }
    try {
      if (fs.existsSync(exports.luoguJSONPath)) {
        fs.unlinkSync(exports.luoguJSONPath)
      }
    } catch (err) {
      vscode.window.showErrorMessage('删除文件时出现错误');
      vscode.window.showErrorMessage(err);
    }
    try {
      // await logout()
    } finally {
      await setUID('')
      await setClientID('')
      exports.islogged = false;
      luoguStatusBar.updateStatusBar(UserStatus.SignedOut);
      vscode.window.showInformationMessage('注销成功');
    }
  }
})
