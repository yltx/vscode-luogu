import SuperCommand from '../SuperCommand'
import { Languages } from '@/utils/shared'
import * as vscode from 'vscode'

export default new SuperCommand({
  onCommand: 'selectLanguage',
  handle: async () => {
    while (!exports.init) { continue; }
    const defaultLanguage = vscode.workspace.getConfiguration().get('luogu.defaultLanguage')
    console.log(defaultLanguage)
    let langs: string[] = []
    for (let item in Languages) {
      if (isNaN(Number(item))) {
        if (item === defaultLanguage) {
          langs.push(item)
        }
      }
    }
    for (let item in Languages) {
      if (isNaN(Number(item))) {
        if (item !== defaultLanguage) {
          langs.push(item)
        }
      }
    }
    const selected = await vscode.window.showQuickPick(langs, {
      ignoreFocusOut: true
    })
    if (!selected) {
      return
    }
    vscode.workspace.getConfiguration('luogu').update('defaultLanguage', selected, true)
    vscode.window.showInformationMessage('设置成功')
  }
})
