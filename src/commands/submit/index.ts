import SuperCommand from '../SuperCommand'
import * as vscode from 'vscode'
import { UserStatus, Languages } from '@/utils/shared'
import * as os from 'os'
import * as path from 'path'
import { getSelectedLanguage, getLanauageFromExt } from '@/utils/workspaceUtils';
import { getStatus, parseProblemID } from '@/utils/api'
import { submitSolution } from '@/utils/submitSolution'
import showRecord from '@/utils/showRecord'
const luoguJSONName = 'luogu.json';
exports.luoguPath = path.join(os.homedir(), '.luogu');
exports.luoguJSONPath = path.join(exports.luoguPath, luoguJSONName);

export default new SuperCommand({
  onCommand: 'submitSolution',
  handle: async () => {
    while (!exports.init) { continue; }
    const edtior = vscode.window.activeTextEditor;
    if (!edtior) {
      vscode.window.showErrorMessage('您没有打开任何文件，请打开一个文件后重试');
      return;
    }
    try {
      if (await getStatus() === UserStatus.SignedOut.toString()) {
        vscode.window.showErrorMessage('您没有登录，请先登录');
        return;
      }
    } catch (err) {
      console.error(err)
      vscode.window.showErrorMessage(err.toString());
      return;
    }
    let text = edtior.document.getText();
    const filePath = edtior.document.fileName;
    const fileFName = path.parse(filePath).base;
    const fileExt = path.parse(filePath).ext.slice(1);
    console.log(fileExt)
    const languages: string[] = getLanauageFromExt(fileExt);

    console.log(languages)

    const O2 = await vscode.window.showQuickPick(['否', '是'], {
      placeHolder: '是否开启O2优化 (非 C/C++/Pascal 切勿开启)'
    }).then(ans => ans === undefined ? undefined : ans === '是');
    if (O2 === undefined) {
      return
    }
    // tslint:disable-next-line: strict-type-predicates
    // const langs = Object.keys(Languages).filter(k => typeof Languages[k as any] === 'number');
    const selectedLanguage = vscode.workspace.getConfiguration('luogu').get<string>('defaultLanguage')!
    let langs: string[] = [];
    if (languages.indexOf(selectedLanguage) !== -1) {
      langs.push(selectedLanguage)
    }
    for (let item in Languages) {
      if (isNaN(Number(item))) {
        if (languages.indexOf(item) !== -1 && item != selectedLanguage) {
          langs.push(item)
        }
      }
    }
    for (let item in Languages) {
      if (isNaN(Number(item))) {
        if (item === 'Auto' && languages.indexOf(item) === -1) {
          langs.push(item)
        }
      }
    }
    for (let item in Languages) {
      if (isNaN(Number(item))) {
        if (item !== 'Auto' && languages.indexOf(item) === -1) {
          langs.push(item)
        }
      }
    }
    const selected = vscode.workspace.getConfiguration('luogu').get<boolean>('showSelectLanguageHint') ? (await vscode.window.showQuickPick(langs).then((value) => {
      if (value === undefined) {
        return undefined
      }
      const v = getSelectedLanguage(value);
      return (v === -1 || !v) ? 0 : v;
    })) : getSelectedLanguage(selectedLanguage);
    if (selected === undefined) {
      return
    }
    let defaultID = await parseProblemID(fileFName);
    const id = await vscode.window.showInputBox({
      placeHolder: '输入提交到的题目ID',
      ignoreFocusOut: true,
      value: defaultID,
      validateInput: s => s && s.trim() ? undefined : '输入不能为空'
    });
    if (!id) {
      return;
    }
    let success = false;
    let rid: any = 0;
    try {
      vscode.window.showInformationMessage(`${fileFName} 正在提交到 ${id}...`);
      rid = await submitSolution(id, text, selected, O2);
      if (rid !== undefined) {
        success = true;
      }
    } catch (err) {
      vscode.window.showInformationMessage('提交失败')
      if (err.errorMessage) {
        vscode.window.showErrorMessage(err.errorMessage)
      }
      console.error(err);
    } finally {
      if (success) {
        // vscode.window.showInformationMessage('提交成功');
        await showRecord(rid as number)
      }
    }
  }
})
