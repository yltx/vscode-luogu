import vscode from 'vscode';
import MyArticleTreeviewProvider from './treeviewProvider';
import myArticleFsProvider from './fsProvider';
import { Article } from 'luogu-api';
import { ArticleCategory } from '@/utils/shared';
import {
  editArticle,
  getArticle
  // 未测试，暂不使用
  // requestPromotion,
  // withdrawPromotion
} from '@/utils/api';
import { isAxiosError } from 'axios';
import { processAxiosError } from '@/utils/workspaceUtils';

export default function registerMyArticle(context: vscode.ExtensionContext) {
  const fs = new myArticleFsProvider('luogu-myarticle');
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider('luogu-myarticle', fs)
  );
  const view = new MyArticleTreeviewProvider(fs);
  vscode.window.createTreeView('luogu.myarticle', {
    treeDataProvider: view
  });
  context.subscriptions.push(view);
  context.subscriptions.push(
    vscode.commands.registerCommand('luogu.myarticle.refresh', () =>
      view.refresh()
    ),
    vscode.commands.registerCommand('luogu.myarticle.delete', (item: Article) =>
      vscode.window
        .showWarningMessage('真的要删除这篇文章吗？', '删除', '取消')
        .then(x =>
          x === '删除'
            ? fs.delete(fs.getUri(item)).then(() => view.refresh())
            : undefined
        )
    ),
    vscode.commands.registerCommand(
      'luogu.myarticle.setCategory',
      async (item: Article) => {
        if (item.promoteStatus !== 0) {
          vscode.window.showErrorMessage('该文章已经申请推荐，无法修改分类。');
          return;
        }
        const x =
          ArticleCategory.findIndex(
            (
              s => x =>
                x == s
            )(
              await vscode.window.showQuickPick(ArticleCategory, {
                title: '新的文章分类'
              })
            )
          ) + 1;
        if (x === 0) return;
        const res = (await getArticle(item.lid)).data.article;
        let solutionFor = res.solutionFor?.pid ?? null;
        if (x == 2)
          solutionFor =
            (await vscode.window.showInputBox({
              title: '关联题目',
              value: solutionFor ?? undefined
            })) ?? null;
        else solutionFor = null;
        await editArticle(item.lid, {
          title: res.title,
          solutionFor: solutionFor,
          category: x,
          status: res.status,
          content: res.content ?? '',
          top: res.top ?? 0
        }).catch(e => {
          if (isAxiosError(e) && e.response)
            vscode.window.showErrorMessage(e.response.data.errorMessage);
          else throw e;
        });
        view.refresh();
      }
    ),
    vscode.commands.registerCommand(
      'luogu.myarticle.setShowMode',
      async (item: Article) => {
        if (item.promoteStatus !== 0) {
          vscode.window.showErrorMessage('该文章已经申请推荐，无法隐藏。');
          return;
        }
        const res = (await getArticle(item.lid)).data.article;
        const choice = await vscode.window.showQuickPick(['显示', '隐藏']);
        if (!choice) return;
        await editArticle(item.lid, {
          title: res.title,
          solutionFor: res.solutionFor?.pid ?? null,
          category: res.category,
          status: choice === '显示' ? 2 : 1,
          content: res.content ?? '',
          top: res.top ?? 0
        }).catch(e => {
          if (isAxiosError(e) && e.response)
            vscode.window.showErrorMessage(e.response.data.errorMessage);
          else throw e;
        });
        view.refresh();
      }
    ),
    vscode.commands.registerCommand(
      'luogu.myarticle.rename',
      async (item: Article) => {
        const res = (await getArticle(item.lid)).data.article;
        const name = await vscode.window.showInputBox({ value: res.title });
        if (!name) return;
        await editArticle(item.lid, {
          title: name,
          solutionFor: res.solutionFor?.pid ?? null,
          category: res.category,
          status: res.status,
          content: res.content ?? '',
          top: res.top ?? 0
        }).catch(processAxiosError('重命名文章'));
        view.refresh();
      }
    ),
    // 未测试，暂不使用
    // vscode.commands.registerCommand(
    //   'luogu.myarticle.setPromoteStatus',
    //   async (item: Article) => {
    //     await (item.promoteStatus === 0 ? requestPromotion : withdrawPromotion)(
    //       item.lid
    //     ).catch(processAxiosError('申请/撤销推荐'));
    //     view.refresh();
    //   }
    // ),
    vscode.commands.registerCommand('luogu.myarticle.new', async () => {
      const title = await vscode.window.showInputBox({
        title: '文章标题',
        ignoreFocusOut: true
      });
      if (!title) return;
      const category = await vscode.window.showQuickPick(ArticleCategory, {
        title: '文章分类'
      });
      if (!category) return;
      const solutionFor =
        category === ArticleCategory[1]
          ? await vscode.window.showInputBox({
              title: '关联的题目',
              ignoreFocusOut: true,
              prompt:
                '输入题号，允许留空。注意，在你完成文章后还需手动申请推荐。'
            })
          : null;
      if (solutionFor === undefined) return;
      const status = await vscode.window.showQuickPick(['公开', '私有'], {
        title: '文章状态'
      });
      if (!status) return;
      const top = await vscode.window.showInputBox({
        title: '置顶量',
        ignoreFocusOut: true,
        placeHolder: '0 到 255 之间的整数。越高的值越靠前。',
        value: '2',
        validateInput: value => {
          if (!/^\d+$/.test(value)) return '请输入 0 到 255 之间的整数';
          const num = parseInt(value);
          if (num < 0 || num > 255) return '请输入 0 到 255 之间的整数';
          return null;
        }
      });
      if (top === undefined) return;
      fs.create({
        title,
        category: ArticleCategory.findIndex(x => x === category) + 1,
        content: title,
        solutionFor,
        status: status === '公开' ? 2 : 1,
        top: parseInt(top)
      })
        .then(res =>
          vscode.commands.executeCommand('vscode.open', fs.getUri(res))
        )
        .catch(processAxiosError('新建文章'));
    }),
    vscode.commands.registerCommand(
      'luogu.myarticle.setSolutionFor',
      async (item: Article) => {
        const res = (await getArticle(item.lid)).data.article;
        const problem = await vscode.window.showInputBox({
          value: res.solutionFor?.pid,
          ignoreFocusOut: true,
          prompt: '输入题号，允许留空。注意，在你完成文章后还需手动申请推荐。'
        });
        if (problem === undefined) return;
        await editArticle(item.lid, {
          title: res.title,
          solutionFor: problem || null,
          category: res.category,
          status: res.status,
          content: res.content ?? '',
          top: res.top ?? 0
        }).catch(processAxiosError('设置关联题目'));
        view.refresh();
      }
    ),
    vscode.commands.registerCommand(
      'luogu.myarticle.setTop',
      async (item: Article) => {
        const res = (await getArticle(item.lid)).data.article;
        const top = await vscode.window.showInputBox({
          title: '置顶量',
          ignoreFocusOut: true,
          placeHolder: '0 到 255 之间的整数。越高的值越靠前。',
          value: (res.top ?? 0).toString(),
          validateInput: value => {
            if (!/^\d+$/.test(value)) return '请输入 0 到 255 之间的整数';
            const num = parseInt(value);
            if (num < 0 || num > 255) return '请输入 0 到 255 之间的整数';
            return null;
          }
        });
        if (top === undefined) return;
        await editArticle(item.lid, {
          title: res.title,
          solutionFor: res.solutionFor?.pid ?? null,
          category: res.category,
          status: res.status,
          content: res.content ?? '',
          top: parseInt(top)
        }).catch(processAxiosError('设置置顶量'));
        view.refresh();
      }
    ),
    vscode.commands.registerCommand(
      'luogu.myarticle.copyLink',
      async ({ lid }: Article) => {
        vscode.env.clipboard
          .writeText(`https://www.luogu.com/article/${lid}`)
          .then(
            () => {},
            err => {
              if (err)
                vscode.window.showErrorMessage(`复制失败：${err.message}`),
                  console.error('Error when copy article link: ', err);
              else vscode.window.showInformationMessage('复制成功');
            }
          );
      }
    ),
    vscode.commands.registerCommand(
      'luogu.myarticle.openInBrowser',
      ({ lid }: Article) =>
        void vscode.env.openExternal(
          vscode.Uri.parse(`https://www.luogu.com/article/${lid}`)
        )
    )
  );
}
