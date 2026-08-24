import * as vscode from 'vscode';
import type { DownloadedTestcase } from '@/utils/api';

const fileExists = async (uri: vscode.Uri) => {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch (error) {
    if (
      error instanceof vscode.FileSystemError &&
      error.code === 'FileNotFound'
    )
      return false;
    throw error;
  }
};

export async function saveDownloadedTestcase(
  rid: number,
  testcaseId: number,
  testcase: DownloadedTestcase
) {
  const selection = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: '保存测试点',
    title: `保存 R${rid} 测试点 #${testcaseId}`
  });
  const directory = selection?.[0];
  if (!directory) return false;

  const basename = `R${rid}-testcase-${testcaseId}`;
  const inputUri = vscode.Uri.joinPath(directory, `${basename}.in`);
  const outputUri = vscode.Uri.joinPath(directory, `${basename}.out`);
  if ((await fileExists(inputUri)) || (await fileExists(outputUri))) {
    const choice = await vscode.window.showWarningMessage(
      `${basename}.in 或 ${basename}.out 已存在，是否覆盖？`,
      { modal: true },
      '覆盖'
    );
    if (choice !== '覆盖') return false;
  }

  const encoder = new TextEncoder();
  await vscode.workspace.fs.writeFile(inputUri, encoder.encode(testcase.input));
  await vscode.workspace.fs.writeFile(
    outputUri,
    encoder.encode(testcase.output)
  );
  await vscode.window.showInformationMessage(
    `测试点已保存为 ${basename}.in 和 ${basename}.out`
  );
  return true;
}
