import SuperCommand from '../SuperCommand'
import debug from '../../utils/debug'
import * as vscode from 'vscode'

export default new SuperCommand({
  onCommand: 'about',
  handle: async () => {
    debug('About Command clicked.')
    // todo: open webview
    vscode.window.showInformationMessage('欢迎使用 vscode-luogu \n\n 开发者：himself65 引领天下 YanWQmonad FangZeLi andyli')
  }
})
