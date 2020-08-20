import * as vscode from 'vscode'

import debug from '../utils/debug'
import Search from './search'
import Submit from './submit'
import About from './about'
import Login from './login'
import Logout from './logout'
import userInfo from './userinfo'
import Fate from './fate'
import selectLanguage from './selectLanguage'
import Save from './save'
import Open from './open'
import BenBen from './benben'
import lastRecord from './lastRecord'
import cookielogin from './cookieslogin'
import solution from './solution'
import contest from './contest'
const commands = [About, Login, Search, Submit, Logout, userInfo, Fate, selectLanguage, Save, Open, BenBen, lastRecord, cookielogin, solution, contest]
export { commands }

export function registerCommands(context: vscode.ExtensionContext) {
  for (const idx in commands) {
    const command = commands[idx]
    debug(`register command: ${command.onCommand}.`)
    context.subscriptions.push(
      vscode.commands.registerCommand(
        `luogu.${command.onCommand}`,
        () => {
          command.callback()
        })
    )
  }
  debug('All commands registered.')
}

export default registerCommands
