const vscode = {
  window: {
    showInformationMessage: () => Promise.resolve(undefined),
    showErrorMessage: () => Promise.resolve(undefined),
    showWarningMessage: () => Promise.resolve(undefined),
    showInputBox: () => Promise.resolve(undefined),
    showQuickPick: () => Promise.resolve(undefined),
    showOpenDialog: () => Promise.resolve(undefined),
    createWebviewPanel: () => ({
      webview: {
        html: '',
        onDidReceiveMessage: () => ({ dispose: () => {} }),
        postMessage: () => {}
      },
      onDidDispose: () => {},
      dispose: () => {}
    }),
    createOutputChannel: () => ({
      appendLine: () => {},
      show: () => {},
      dispose: () => {}
    }),
    activeTextEditor: undefined,
    visibleTextEditors: []
  },
  commands: {
    executeCommand: () => Promise.resolve()
  },
  workspace: {
    getConfiguration: () => ({
      get: (key: string, defaultValue?: unknown) => defaultValue,
      has: () => false,
      update: () => Promise.resolve()
    }),
    workspaceFolders: undefined
  },
  Uri: {
    file: (path: string) => ({
      fsPath: path,
      scheme: 'file',
      toString: () => path
    }),
    parse: (uri: string) => ({
      fsPath: uri,
      scheme: 'file',
      toString: () => uri
    })
  },
  ViewColumn: { One: 1, Two: 2, Three: 3, Active: -1 },
  env: {
    clipboard: { writeText: () => Promise.resolve() },
    openExternal: () => Promise.resolve(true)
  },
  EventEmitter: class {
    listeners: unknown[] = [];
    event = (listener: unknown) => {
      this.listeners.push(listener);
      return { dispose: () => {} };
    };
    fire() {}
    dispose() {}
  },
  AuthenticationSession: {},
  AuthenticationProvider: {},
  ExtensionContext: {},
  SecretStorage: {}
};

export default vscode;
