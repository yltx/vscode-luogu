import initFinish from './initGlobal';

import * as vscode from 'vscode';
import debug from '@/utils/debug';
import RegisterCommands from '@/commands';
import { getStatus, startCsrfTokenManager } from '@/utils/api';
import path from 'path';
import registerFeatures from './features';

globalThis.pid = '';

export function activate(context: vscode.ExtensionContext) {
  globalThis.luogu.version = context.extension.packageJSON.version;
  debug('initializing luogu-vscode.');
  RegisterCommands(context);
  console.log('init luogu-vscode success.');
  globalThis.resourcesPath = path.join(context.extensionPath, 'resources');
  globalThis.distPath = path.join(context.extensionPath, 'dist');
  registerFeatures(context);
  startCsrfTokenManager(context);
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'luogu.openUntitledTextDocument',
      (options?: { content: string; language: string }) =>
        vscode.workspace
          .openTextDocument(options)
          .then(x =>
            vscode.window.showTextDocument(x, vscode.ViewColumn.One, true)
          )
    )
  );
  getStatus();
  initFinish();
}

export function deactivate(): void {}
