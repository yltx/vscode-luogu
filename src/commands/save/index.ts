import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as vscode from 'vscode'
import SuperCommand from '../SuperCommand'
import { searchProblem } from '@/utils/api'
import { DialogType, promptForOpenOutputChannel } from '@/utils/uiUtils'
import Problem from '@/model/Problem'
import { generateProblemHTML } from '@/utils/showProblem'
exports.luoguProblemPath = path.join(os.homedir(), '.luoguProblems')

export default new SuperCommand({
  onCommand: 'save',
  handle: async () => {
    while (!exports.init) { continue; }
    const pid = await vscode.window.showInputBox({
      placeHolder: '输入题号',
      ignoreFocusOut: true
    }).then(res => res ? res.toUpperCase() : null)
    if (!pid) {
      await promptForOpenOutputChannel('', DialogType.error)
      return
    }
    exports.pid = pid;
    const problem = await searchProblem(pid).then(res => new Problem(res))
    const html = generateProblemHTML(problem)
    const filename = pid + '.html'
    exports.luoguProblems = path.join(exports.luoguProblemPath, filename)
    if (!fs.existsSync(exports.luoguProblemPath)) {
      try {
        fs.mkdirSync(exports.luoguProblemPath)
      } catch (err) {
        vscode.window.showErrorMessage('创建路径失败')
        vscode.window.showErrorMessage(err)
        console.error(err)
        return
      }
    }
    try {
      fs.writeFileSync(exports.luoguProblems, html)
    } catch (err) {
      vscode.window.showErrorMessage('保存失败')
      vscode.window.showErrorMessage(err)
      console.error(err)
      return
    }
    vscode.window.showInformationMessage('保存成功\n存储路径：' + exports.luoguProblems)
  }
})
