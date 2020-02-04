import { debug } from './debug'
import { captcha } from './api'
import * as vscode from 'vscode'
import { promptForOpenOutputChannel, DialogType } from './uiUtils'

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
    <link rel="stylesheet" href="https://cdn.staticfile.org/twitter-bootstrap/3.3.7/css/bootstrap.min.css">  
    <script src="https://cdn.staticfile.org/jquery/2.1.1/jquery.min.js"></script>
    <script src="https://cdn.staticfile.org/twitter-bootstrap/3.3.7/js/bootstrap.min.js"></script>
    <typescript src="../../../utils/api.ts"></typescript>
    <button type="button" onclick="document.getElementById("demo").innerHTML = "data:image/jpeg;base64,${imageEncoded}"" class="btn btn-small">更换验证码</button>
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
    })
    panel.webview.html = generateHTML(image.toString('base64'))
    captchaText = await vscode.window.showInputBox({
      placeHolder: '输入验证码'
    }).then(res => res ? res : null)
    panel.dispose()
  }
  return captchaText
}
