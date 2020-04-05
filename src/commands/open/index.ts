import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as vscode from 'vscode'
import SuperCommand from '../SuperCommand'
import { DialogType, promptForOpenOutputChannel } from '../../utils/uiUtils'
exports.luoguProblemPath = path.join(os.homedir(), '.luoguProblems')
export default new SuperCommand({
  onCommand: 'open',
  handle: async () => {
    const pid = await vscode.window.showInputBox({
      placeHolder: '输入题号'
    }).then(res => res ? res.toUpperCase() : null)
    if (!pid) {
      await promptForOpenOutputChannel('', DialogType.error)
      return
    }
    const filename = pid + '.html'
    exports.luoguProblems = path.join(exports.luoguProblemPath, filename)
    fs.exists(exports.luoguProblems, async function (exists) {
      if (!exists) {
        vscode.window.showErrorMessage('此题未在本地保存')
      }
      fs.readFile(exports.luoguProblems, async (err, data) => {
        if (err) {
          vscode.window.showErrorMessage('打开失败')
          vscode.window.showErrorMessage(err.toString())
          console.log(err)
          throw (err)
        } else {
          if (data) {
            vscode.window.showInformationMessage('打开成功')
            let html = data.toString()
            console.log(html)
            const problemname = html.match(/<title>(.*)<\/title>/)![1]
            console.log(problemname)
            const panel = vscode.window.createWebviewPanel(pid, problemname, vscode.ViewColumn.Two, { enableScripts: true, retainContextWhenHidden: true })
            panel.webview.html = html
            console.log(data.toString())
          }
        }
      })
    })
  }
})
