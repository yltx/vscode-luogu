import SuperCommand from '../SuperCommand'
import { login, getClientID } from '../../utils/api'
import * as vscode from 'vscode'
import { promptForOpenOutputChannel, promptForOpenOutputChannelWithResult, DialogType } from '../../utils/uiUtils'
import { debug } from '../../utils/debug'
import { getUserCaptcha } from '../../utils/captcha'

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
      console.log(`Get client id: ${await getClientID()}`)
      debug(`Get captcha: ${captcha}`)
      try {
        await login(username, password, captcha)
        vscode.window.showInformationMessage('登录成功');
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
