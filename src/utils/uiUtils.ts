import * as vscode from 'vscode';

export namespace DialogOptions {
  export const open: vscode.MessageItem = { title: '重试' };
  export const yes: vscode.MessageItem = { title: '好' };
  export const no: vscode.MessageItem = {
    title: '关闭',
    isCloseAffordance: true
  };
  export const never: vscode.MessageItem = { title: 'Never' };
  export const singUp: vscode.MessageItem = { title: 'Sign up' };
}

export async function promptForOpenOutputChannel(
  message: string,
  type: DialogType = DialogType.info
): Promise<void> {
  let result: vscode.MessageItem | undefined;
  switch (type) {
    case DialogType.info:
      result = await vscode.window.showInformationMessage(
        message,
        DialogOptions.open,
        DialogOptions.no
      );
      break;
    case DialogType.warning:
      result = await vscode.window.showWarningMessage(
        message,
        DialogOptions.open,
        DialogOptions.no
      );
      break;
    case DialogType.error:
      result = await vscode.window.showErrorMessage(
        message,
        DialogOptions.open,
        DialogOptions.no
      );
      break;
    default:
      break;
  }

  if (result === DialogOptions.open) {
    // channel.show()
  }
}
export async function promptForOpenOutputChannelWithResult(
  message: string,
  type: DialogType = DialogType.info
): Promise<vscode.MessageItem | undefined> {
  let result: vscode.MessageItem | undefined;
  switch (type) {
    case DialogType.info:
      result = await vscode.window.showInformationMessage(
        message,
        DialogOptions.open,
        DialogOptions.no
      );
      break;
    case DialogType.warning:
      result = await vscode.window.showWarningMessage(
        message,
        DialogOptions.open,
        DialogOptions.no
      );
      break;
    case DialogType.error:
      result = await vscode.window.showErrorMessage(
        message,
        DialogOptions.open,
        DialogOptions.no
      );
      break;
    default:
      break;
  }

  if (result === DialogOptions.open) {
    // channel.show()
  }
  return result;
}

export async function showFileSelectDialog(): Promise<
  vscode.Uri[] | undefined
> {
  const defaultUri: vscode.Uri | undefined = vscode.workspace.rootPath
    ? vscode.Uri.file(vscode.workspace.rootPath)
    : undefined;
  const options: vscode.OpenDialogOptions = {
    defaultUri,
    canSelectFiles: true,
    canSelectFolders: false,
    canSelectMany: false,
    openLabel: 'Select'
  };
  return vscode.window.showOpenDialog(options);
}

export enum DialogType {
  info = 'info',
  warning = 'warning',
  error = 'error'
}

let needLoginShown = false;
export const needLogin = () => {
  if (needLoginShown) return;
  needLoginShown = true;
  vscode.window
    .showErrorMessage('未登录', '登录')
    .then(async c => {
      if (c) vscode.commands.executeCommand('luogu.signin');
    })
    .then(
      () => {
        setTimeout(() => {
          needLoginShown = false;
        }, 5000);
      },
      () => {
        setTimeout(() => {
          needLoginShown = false;
        }, 5000);
      }
    );
};
