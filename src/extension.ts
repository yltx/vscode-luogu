import * as vscode from 'vscode'
import debug from './utils/debug'

import RegisterCommands from './commands'
import RegisterViews from './views'

import luoguStatusBar from './views/luoguStatusBar'
import { UserStatus } from './utils/shared'
import * as fs from 'fs'
import { csrfToken, setClientID, setUID } from './utils/api'
import * as os from 'os'
import * as path from 'path'
const luoguCsrfToken = 'CsrfToken.json';
const luoguJSONName = 'luogu.json';
const luoguUIDName = 'uid.json';
exports.luoguPath = path.join(os.homedir(), '.luogu');
exports.luoguJSONPath = path.join(exports.luoguPath, luoguJSONName);
exports.luoguCsrfTokenPath = path.join(exports.luoguPath, luoguCsrfToken);
exports.luoguUidPath = path.join(exports.luoguPath, luoguUIDName);
export async function activate (context: vscode.ExtensionContext): Promise<void> {
  debug('initializing luogu-vscode.')

  RegisterCommands(context)
  RegisterViews(context)
  console.log('init luogu-vscode success.')

  if (fs.existsSync(exports.luoguCsrfTokenPath)) {
    fs.readFile(exports.luoguCsrfTokenPath, async (err, data) => {
      if (err) {
        vscode.window.showInformationMessage('未登录');
      } else {
        fs.writeFile(exports.luoguJSONPath, `1`, function (err) {
          vscode.window.showErrorMessage(err.message);
        })
        console.log(data.toString())
        await setClientID(data.toString())
        fs.readFile(exports.luoguUidPath, async (err, data) => {
          if (!err) {
            console.log(data.toString())
            await setUID(data.toString())
          }
        })
        luoguStatusBar.updateStatusBar(UserStatus.SignedIn);
        vscode.window.showInformationMessage('登录成功');
      }
    })
  } else {
    vscode.window.showInformationMessage('未登录');
  }

}

export function deactivate (): void {
  // Do nothing.
}
