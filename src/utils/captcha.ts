import { debug } from '@/utils/debug'
import { captcha, getResourceFilePath } from '@/utils/api'
import * as path from 'path'
import * as vscode from 'vscode'
import { promptForOpenOutputChannel, DialogType } from '@/utils/uiUtils'

const generateHTML = (imageEncoded: string) => `
<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>验证码</title>
  </head>
  <body style="padding-top: 64px;">
    <img id="cap" src="data:image/jpeg;base64,${imageEncoded}">
    <br/>
    <link rel="stylesheet" href="${getResourceFilePath('bootstrap.min.css')}">
    <script src="${getResourceFilePath('jquery.min.js')}"></script>
    <script src="${getResourceFilePath('bootstrap.min.js')}"></script>
    <button type="button" onclick="document.getElementById(\"cap\").innerHTML = \"data:image/jpeg;base64,${imageEncoded}\"" class="btn btn-small">更换验证码</button>
  </body>
</html>`

export async function getUserCaptcha () {
  let captchaText: string | null = null;
  while (captchaText === null) {
    const image = await captcha()
    if (!image) {
      await promptForOpenOutputChannel('Failed to request captcha image', DialogType.error)
      return null
    }
    const panel = vscode.window.createWebviewPanel('Luogu Captcha', 'Captcha', {
      viewColumn: vscode.ViewColumn.One,
      preserveFocus: true
    }, {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(exports.resourcesPath)]
    })
    panel.webview.html = generateHTML(image.toString('base64'))
    captchaText = await vscode.window.showInputBox({
      placeHolder: '输入验证码',
      ignoreFocusOut: true
    }).then(res => res ? res : null)
    panel.dispose()
  }
  return captchaText
}
