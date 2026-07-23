# vscode-luogu 开发指南

**_本指南编写时的环境为node v20.5.0 + npm v9.8.0_**

## 如何构建本项目

- 执行 `npm install` 安装项目依赖。

一切就绪后，使用 `npm run compile` 来编译，或者直接在vscode内按 `F5` 进行调试运行。

> [!TIP]
> 构建前需要执行 `git submodule init` 和 `git submodule update` 确保 `luogu-api-docs` 存在

## 如何发布新版本

代码全部修改完毕，已经准备好发布新版本时，先运行 `npm run pack` 确保插件可以正确打包，之后请在 `CHANGELOG.md` 中简要说明更新内容，并同步更新 `package.json` 和 `package-lock.json` 中的版本号。

版本号使用以下约定：

- 正式版本使用偶数 minor，例如 `4.14.0`、`4.16.0`。
- 预发布版本使用奇数 minor，例如 `4.15.0`、`4.17.0`。
- Git tag 必须是 `v` 加 package 版本，例如 `v4.15.0`。

将更新了版本号的代码上传到 GitHub 并在 QQ 群里通知其他开发者。经同意后创建 GitHub Release 并编写发布说明：奇数 minor 必须勾选 **Set as a pre-release**，偶数 minor 不得勾选。Release 发布后，GitHub Actions 会校验 tag、package 版本和发布通道，然后打包、上传 Release 附件并发布到对应的 VS Code Marketplace 正式或预发布通道。

## 编写时需要注意的问题

上传前运行 `npm run fix;npm run prettier`

暂定，多在群里商量吧。
