import * as vscode from 'vscode'
import * as path from 'path'
// @ts-ignore
import SuperCommand from '../SuperCommand'
import { parseProblemID } from '@/utils/api'
import showProblem from '@/utils/showProblem'

export default new SuperCommand({
  onCommand: 'searchProblem',
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
    const regex = /(AT[0-9]{1,4}|CF[0-9]{1,4}[A-Z][0-9]{0,1}|SP[0-9]{1,5}|P[0-9]{4}|UVa[0-9]{1,5}|U[0-9]{1,6}|T[0-9]{1,6})/
    if (!regex.test(pid)) {
      vscode.window.showErrorMessage('题目不存在')
      return
    }
    exports.pid = pid;
    await showProblem(pid)
  }
})
