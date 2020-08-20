import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as vscode from 'vscode'
import SuperCommand from '../SuperCommand'
import { parseProblemID } from '@/utils/api'
exports.luoguProblemPath = path.join(os.homedir(), '.luoguProblems')

export default new SuperCommand({
  onCommand: 'open',
  handle: async () => {
    while (!exports.init) { continue; }
    const edtior = vscode.window.activeTextEditor;
    let defaultID = '';
    if (edtior) {
      defaultID = await parseProblemID(path.parse(edtior.document.fileName).base);
    }
    if (defaultID === '') {
      defaultID = exports.pid
    }
    const pid = await vscode.window.showInputBox({
      placeHolder: '输入题号',
      value: defaultID,
      ignoreFocusOut: true
    }).then(res => res ? res.toUpperCase() : null)
    if (!pid) {
      return
    }
    exports.pid = pid;
    const filename = pid + '.html'
    exports.luoguProblems = path.join(exports.luoguProblemPath, filename)
    if (!fs.existsSync(exports.luoguProblems)) {
      vscode.window.showErrorMessage('此题未在本地保存')
      return
    }
    try {
      const html = fs.readFileSync(exports.luoguProblems).toString();
      const problemname = html.match(/<title>(.*)<\/title>/)![1]
      const panel = vscode.window.createWebviewPanel(pid, problemname, vscode.ViewColumn.Two, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(exports.resourcesPath)]
      })
      panel.webview.html = html
    } catch (err) {
      vscode.window.showErrorMessage('打开失败')
      vscode.window.showErrorMessage(err)
      console.error(err)
    }
  }
})
