import vscode from 'vscode';
import * as path from 'path';
import { randomBytes } from 'crypto';

export const getResourceFilePath = (
  webview: vscode.Webview,
  relativePath: string
) => {
  const diskPath = vscode.Uri.file(
    path.join(globalThis.resourcesPath, relativePath)
  );
  return webview.asWebviewUri(diskPath);
};
export const getDistFilePath = (
  webview: vscode.Webview,
  relativePath: string
) => {
  const diskPath = vscode.Uri.file(
    path.join(globalThis.distPath, relativePath)
  );
  return webview.asWebviewUri(diskPath);
};

const serializeWebviewState = (value: unknown) =>
  JSON.stringify(value).replaceAll('<', '\\u003c');

export const getReactWebviewHtml = (
  webview: vscode.Webview,
  scriptName: string,
  initialState: Readonly<Record<string, unknown>> = {}
) => {
  const nonce = randomBytes(16).toString('base64');
  const state = Object.entries(initialState)
    .map(
      ([id, value]) =>
        `<script type="application/json" id="${id}">${serializeWebviewState(value)}</script>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource} 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} https: data:;">
${state}
</head>
<body>
<div id="app"></div>
<script defer nonce="${nonce}" src="${getDistFilePath(webview, scriptName)}"></script>
</body>
</html>`;
};
