import * as vscode from 'vscode'
import debug from '@/utils/debug'

import RegisterCommands from '@/commands'
import RegisterViews from '@/views'
import luoguStatusBar from '@/views/luoguStatusBar'
import { UserStatus } from '@/utils/shared'
import { setClientID, setUID, fetchHomepage } from '@/utils/api'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
const luoguCsrfToken = 'CsrfToken.json'
const luoguJSONName = 'luogu.json'
const luoguUIDName = 'uid.json'
const version = '4.4.9'
exports.luoguPath = path.join(os.homedir(), '.luogu')
exports.luoguJSONPath = path.join(exports.luoguPath, luoguJSONName)
exports.luoguCsrfTokenPath = path.join(exports.luoguPath, luoguCsrfToken)
exports.luoguUidPath = path.join(exports.luoguPath, luoguUIDName)
exports.islogged = false
exports.init = false
exports.pid = ''

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  debug('initializing luogu-vscode.')
  RegisterCommands(context)
  RegisterViews(context)
  console.log('init luogu-vscode success.')
  exports.rootPath = context.extensionPath
  exports.resourcesPath = path.join(exports.rootPath, 'resources')
  const versionPath = path.join(exports.luoguPath, 'version')
  if (!fs.existsSync(exports.luoguPath)) {
    try {
      fs.mkdirSync(exports.luoguPath)
    } catch (err) {
      vscode.window.showErrorMessage('创建 .luogu 目录失败')
      throw err
    }
  }
  let clientID = ''
  let uid = ''
  let updated = true
  if (fs.existsSync(exports.luoguCsrfTokenPath)) {
    clientID = fs.readFileSync(exports.luoguCsrfTokenPath).toString()
    fs.unlinkSync(exports.luoguCsrfTokenPath)
    updated = false
  }
  if (fs.existsSync(exports.luoguUidPath)) {
    uid = fs.readFileSync(exports.luoguUidPath).toString()
    fs.unlinkSync(exports.luoguUidPath)
    updated = false
  }
  if (!updated) {
    fs.writeFileSync(exports.luoguJSONPath, JSON.stringify({ 'uid': uid, 'clientID': clientID }))
  }
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>vscode-luogu v${version} 更新说明</title>
  </head>
  <div>
    <h1>置顶说明</h1>
    <h2>
    <ul>
    <li>Added user communication group(QQ):1141066631</li>
    </ul>
    </h2>
    <h1>本次更新</h1>
    <h2>
    <ul>
    <li>Add:
    <ol>
    <li>查看排行榜</li>
    </ol>
    </li>
    </ul>
    </h2>
  </div>
  </html>
  `
  if (fs.existsSync(versionPath)) {
    if (fs.readFileSync(versionPath).toString() !== version) {
      const panel = vscode.window.createWebviewPanel('更新说明', 'vscode-luogu v' + version + ' 更新说明', vscode.ViewColumn.Two, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(exports.resourcesPath)]
      })
      panel.webview.html = html
    }
  } else {
    const panel = vscode.window.createWebviewPanel('更新说明', 'vscode-luogu' + version + ' 更新说明', vscode.ViewColumn.Two, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(exports.resourcesPath)]
    })
    panel.webview.html = html
  }
  fs.writeFileSync(versionPath, version)
  if (fs.existsSync(exports.luoguJSONPath)) {
    try {
      const jsonData = JSON.parse(fs.readFileSync(exports.luoguJSONPath).toString())
      const clientID = jsonData.clientID
      const uid = jsonData.uid
      await setClientID(clientID)
      await setUID(uid)
      try {
        const data = await fetchHomepage();
        if (data.currentUser === undefined) {
          vscode.window.showErrorMessage('未登录')
          luoguStatusBar.updateStatusBar(UserStatus.SignedOut)
          exports.islogged = false
        } else {
          vscode.window.showInformationMessage('登录成功')
          luoguStatusBar.updateStatusBar(UserStatus.SignedIn)
          exports.islogged = true
        }
      } catch (err) {
        vscode.window.showErrorMessage('获取登录信息失败')
        vscode.window.showErrorMessage(err)
        // vscode.window.showErrorMessage('未登录')
        luoguStatusBar.updateStatusBar(UserStatus.SignedOut)
        exports.islogged = false
      }
    } catch (err) {
      console.error(err)
      vscode.window.showInformationMessage('未登录')
      luoguStatusBar.updateStatusBar(UserStatus.SignedOut)
      exports.islogged = false
    }
  } else {
    vscode.window.showInformationMessage('未登录')
    luoguStatusBar.updateStatusBar(UserStatus.SignedOut)
    exports.islogged = false
  }
  exports.init = true
  console.log(exports.rootPath)
}

export function deactivate(): void {
  // Do nothing.
}
