import * as vscode from 'vscode';

import debug from '../utils/debug';
import About from './about';
import userInfo from './userinfo';
import Fate from './fate';
import random from './random';
import paintboard from './paintboard';
import traininglist from './traininglist';
import traindetails from './traindetails';
import problemList from './problemlist';
const commands = [
  About,
  userInfo,
  Fate,
  random,
  paintboard,
  traininglist,
  traindetails,
  problemList
];
export { commands };

export function registerCommands(context: vscode.ExtensionContext) {
  for (const idx in commands) {
    const command = commands[idx];
    debug(`register command: ${command.onCommand}.`);
    context.subscriptions.push(
      vscode.commands.registerCommand(
        `luogu.${command.onCommand}`,
        command.handle
      )
    );
    if (command.onactivate) command.onactivate(context);
  }
  debug('All commands registered.');
}

export default registerCommands;
