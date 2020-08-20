import SuperCommand from '../SuperCommand'
import * as vscode from 'vscode'
import { getStatus, setClientID, setUID, searchUser } from '@/utils/api'
import luoguStatusBar from '@/views/luoguStatusBar'
import { UserStatus } from '@/utils/shared'
import { promptForOpenOutputChannelWithResult, DialogType } from '@/utils/uiUtils'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
const luoguJSONName = 'luogu.json';
exports.luoguPath = path.join(os.homedir(), '.luogu');
exports.luoguJSONPath = path.join(exports.luoguPath, luoguJSONName);

export default new SuperCommand({
  onCommand: 'cookieslogin',
  handle: async () => {
    while (!exports.init) { continue; }
    while (true) {
      const keyword = await vscode.window.showInputBox({
        placeHolder: '输入用户名/uid',
        ignoreFocusOut: true
      })
      if (!keyword) {
        return
      }
      const uid = (await searchUser(keyword))['users'][0]['uid']
      if (!uid) {
        const res = await promptForOpenOutputChannelWithResult('用户不存在', DialogType.error)
        if (res?.title === '重试') {
          continue;
        } else {
          break;
        }
      }
      const clientID = await vscode.window.showInputBox({
        placeHolder: '输入 clientID',
        ignoreFocusOut: true,
        password: true
      })
      if (!clientID) {
        return
      }
      try {
        await setClientID(clientID)
        await setUID(uid)
        if (await getStatus() === UserStatus.SignedOut.toString()) {
          exports.islogged = false;
          luoguStatusBar.updateStatusBar(UserStatus.SignedOut)
          const res = await promptForOpenOutputChannelWithResult('登录失败', DialogType.error)
          if (res?.title === '重试') {
            continue;
          } else {
            break;
          }
        } else {
          exports.islogged = true;
          vscode.window.showInformationMessage('登录成功');
          luoguStatusBar.updateStatusBar(UserStatus.SignedIn);
          try {
            fs.writeFileSync(exports.luoguJSONPath, JSON.stringify({ 'uid': uid, 'clientID': clientID }))
          } catch (error) {
            vscode.window.showErrorMessage('写入文件时出现错误');
            vscode.window.showErrorMessage(error);
          }
          return;
        }
      } catch (err) {
        console.error(err)
        vscode.window.showErrorMessage(err);
        luoguStatusBar.updateStatusBar(UserStatus.SignedOut)
        const res = await promptForOpenOutputChannelWithResult('登录失败', DialogType.error)
        if (res?.title === '重试') {
          continue;
        } else {
          break;
        }
      }
    }
  }

})
