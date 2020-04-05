import SuperCommand from '../SuperCommand'
import { login, getClientID, csrfToken, jar, getUID } from '../../utils/api'
import * as vscode from 'vscode'
import { promptForOpenOutputChannel, promptForOpenOutputChannelWithResult, DialogType } from '../../utils/uiUtils'
import { debug } from '../../utils/debug'
import { getUserCaptcha } from '../../utils/captcha'
import luoguStatusBar from '../../views/luoguStatusBar'
import { UserStatus } from '../../utils/shared'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
const luoguJSONName = 'luogu.json';
const luoguCsrfToken = 'CsrfToken.json';
exports.luoguPath = path.join(os.homedir(), '.luogu');
exports.luoguJSONPath = path.join(exports.luoguPath, luoguJSONName);
exports.luoguCsrfToken = path.join(exports.luoguPath, luoguCsrfToken);

export default new SuperCommand({
  onCommand: 'signin',
  handle: async () => {
    const username: string | undefined = await vscode.window.showInputBox({
      placeHolder: '输入用户名'
    })
    if (!username) {
      return
    }

    const password: string | undefined = await vscode.window.showInputBox({
      placeHolder: '输入密码',
      password: true
    })
    if (!password) {
      return
    }
    while (true) {
      const captcha = await getUserCaptcha()
      if (!captcha) {
        debug('No captcha text')
        return;
      }
      let clientID: string | null;
      console.log(`Get client id: ${clientID = await getClientID()}`)
      debug(`Get captcha: ${captcha}`)
      try {
        await login(username, password, captcha)
        vscode.window.showInformationMessage('登录成功');
        fs.exists(exports.luoguPath, async function (exists) {
          if (!exists) {
            fs.mkdir(exports.luoguPath, function (err) {
              if (err) {
                // vscode.window.showErrorMessage(err.message);
              }
            })
          }
          fs.writeFile(exports.luoguJSONPath, `1`, function (err) {
            if (err) {
              // vscode.window.showErrorMessage(err.message);
            }
          })
          fs.writeFile(exports.luoguCsrfToken, clientID, function (err) {
            if (err) {
              // vscode.window.showErrorMessage(err.message)
            }
          })
          fs.writeFile(exports.luoguUidPath, await getUID(), function (err) {
            if (err) {
              // vscode.window.showErrorMessage(err.message)
            }
          })
        })

        console.log(jar);
        // console.log('done');
        luoguStatusBar.updateStatusBar(UserStatus.SignedIn);
        break;
      } catch (err) {
        if (err.response) {
          if (err.response.data.errorMessage === '验证码错误') {
            let res = await promptForOpenOutputChannelWithResult(err.response.data.errorMessage, DialogType.error)
            if (res?.title === '重试') {
              continue;
            } else {
              break;
            }
          }
          await promptForOpenOutputChannel(err.response.data.errorMessage, DialogType.error)
          break;
        }
      }
    }
  }
})
