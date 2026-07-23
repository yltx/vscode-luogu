# Change Log

## 4.15.0 (Pre-release)

- Security:
  1. 加固认证初始化，避免持久化数据损坏或匿名 client ID 获取失败造成永久等待
  2. 为 React Webview 增加统一 CSP、nonce、资源根目录和 initial state 转义
  3. 为 React Webview 消息增加运行时 envelope、UUID 和 payload 校验
  4. 串行化 CSRF token 生命周期，避免 session 切换和并发请求覆盖新状态
- Fix:
  1. 将评测 WebSocket 生命周期绑定到 panel，并完整清理连接超时和关闭竞态
  2. 修复未登录私有犇犇持续转圈，并移除已关闭的全网动态入口
  3. 统一命令成功、取消和失败返回契约，修复随机题 detached Promise
  4. 修复空评测列表异常和浏览历史并发覆盖
- Engineering:
  1. 升级存在生产漏洞的运行时依赖，production audit 降至 0
  2. 恢复 LF、lint、类型检查、测试和 production build 基线
  3. 清理未使用依赖并消除 `ws` 可选 native accelerator 构建告警
  4. 修复预发布流程：奇数 minor 发布到 Marketplace 预发布通道，偶数 minor 发布到正式通道

## 4.14.0

- Fix:
  1. 适配当前文章创建、编辑和删除 API，修复新建文章旧端点失效问题
  2. 编辑文章元数据前读取完整正文，防止正文缺失时被空内容覆盖
  3. 兼容新版比赛响应字段，修复比赛报名、比赛模式提交和比赛详情显示
  4. 修复比赛排行榜使用不存在的 `fullScore` 导致题目满分错误的问题
  5. 更新洛谷当前九级难度体系，修复难度名称、颜色和未知难度显示
  6. 题单广场改为读取 API 动态分类，兼容新的完成度字段和响应结构
  7. 区分 TOTP 与邮箱验证码的两步验证接口和登录流程
  8. 改进 CPH 本地服务探测，支持 `127.0.0.1`、`localhost` 和请求超时处理
  9. 修复账户信息命令读取旧登录字段而误报未登录的问题
- Add:
  1. 增加文章正文保护、比赛模式提交和题单数据的回归测试
  2. 更新 Wiki 中的登录、提交、比赛、题单、专栏、难度和 CPH 使用说明
  3. 重新设计题单广场、题单详情和题解页面，适配 VS Code 明暗主题与窄窗口

## 4.13.0

- Fix:
  1. 适配洛谷 API 变更：题目标题从 `problem.title` 迁移至 `content.name`
  2. 适配题单响应格式从 `DataResponse` 变为 `LentilleDataResponse`
  3. 适配题单字段 `title` 重命名为 `name`，题目数组结构扁平化
  4. 适配题单广场 `trainings.result` 支持 array/object 两种格式
  5. 适配 `acceptedCounts` 重命名为 `acCounts`
  6. 适配训练详情使用 `TrainingProblem` 的 `accepted`/`submitted` 字段
  7. 解决最近浏览中题单图标偏移问题（`folder` → `folder-library`）
- Add:
  1. 刷新浏览记录命令（从 API 重新获取标题并去重）
  2. 清空浏览记录命令（带确认对话框）

## 4.12.2

- Add:
  1. 允许配置 CPH 端口（可以适配 CPH-NG 等其他工具）
- Fix:
  1. 解决题目页图标对齐的问题

## 4.12.1

- Fix:
  1. 新前端修改后导致登录失效
- Add:
  1. 跳转至 CPH 命令

## 4.12.0

- Add:
  1. 提交代码时若未聚焦任何编辑器则要求选择文件
  2. 重做比赛页面
  3. 重做 UI
  4. 自动刷新排行榜
  5. 在任务栏显示比赛信息

## 4.11.12

- Fix:
  1. 上次内存字符串格式化问题没修好
  2. 支持设置默认语言为 C++23

## 4.11.11

- Add:
  1. 支持 C++23
- Fix:
  1. 修复提交记录中内存的单位错误
  2. 优化操作失败的报错

## 4.11.10

- Fix:

  1. 专栏置顶量字段导致的专栏功能不可用问题
  2. 在拓展清单中声明身份验证程序 (#127)
  3. 题单中未知标签导致的不可用问题 (#126, by @34LiuNian)

- Add:
  1. 专栏列表悬浮窗显示置顶量及点赞、收藏、评论量

## 4.11.9

- Fix:
  1. 修复旧翻译显示逻辑

## 4.11.8

- Fix:
  1. 增强愚人节彩蛋的兼容性

## 4.11.7

- Fix:
  1. 修改旧翻译显示逻辑
- Add:
  1. 愚人节快乐！

## 4.11.6

- Add:
  1. 添加多语言题面支持

## 4.11.5

- Fix:
  1. 更新题目 API 格式

## 4.11.4

- Fix:
  1. 把检查登录状态的 API 也换掉

## 4.11.3

- Fix:
  1. 处理文章标题中的奇怪字符
  2. 更换获取 client ID 的 API

## 4.11.2

- Fix:
  1. 修复遇到未知题目 tag 时整个页面无法加载
  2. 解决获取 csrf 失败时会高频重新获取的问题
  3. 修复历史记录自己反转的 bug
- Add:
  1. 修改 UA 头，方便定位问题
  2. 更新 tag 版本

## 4.11.1

- Fix:
  1. 提交题目时处理可能的验证码提示
- Changed:
  1. 为透明图像添加白色背景
- Add:
  1. 添加配置项以控制 cph 创建文件时的风格

## 4.11.0

- Fix:
  1. 重写题解页面
  2. 废弃头像缓存
- Add:
  1. 鼠标悬浮在专栏条目中上方，若该文章为题解，可以显示一个到关联题目的超链接

## 4.10.4

- Fix:
  1. 有关自动更新记录的若干 bug
- Add:
  1. 支持 Rust, Haskell, OCaml 的 O2 优化

## 4.10.3

- Fix:
  1. 复制代码按钮炸了

## 4.10.2

- Fix:
  1. 优化题目页样式
  2. 使用手机号登录时将自动填充 +86
- Add:
  1. 添加设置项：自动猜测语言和题目，直接跳过输入框

## 4.10.1

- Fix:
  1. 优化未登录时的提示

## 4.10.0

- Fix:
  1. 洛谷专栏更新导致旧 api 不可用
- Add:
  1. 全新的题目页面
     1. 使用 react 重构，移除诟病已久的提交按钮，添加查看题解按钮
  2. 最近浏览视图
     1. 可查看最近打开的题目、题单、比赛，点击即可浏览
     2. 点击题目项目右侧的纸飞机按钮可提交当前文件
     3. 添加设置项目 luogu.history，表示历史记录的最大长度。
  3. 重写提交逻辑
     1. 如果设置里开启 luogu.guessProblemID，可以自动根据 CPH 配置文件或文件名猜测题目 PID。会自动填充到输入框中。
     2. 根据文件拓展名猜测语言并自动选中。可在设置 luogu.defaultLanguageVersion 中修改默认使用的语言版本。

## 4.9.1

- Fix:
  1. 登录、注销等功能全部失效的问题
  2. typo：登陆->登录

## 4.9.0

- Add:

  1. 添加修改文章关联题目
  2. 添加在状态栏显示提交记录状态的功能
  3. 新版试用vscode账号区域管理登录

- Optimize:
  1. 兼容洛谷新版katex
  2. 删除已删除功能的命令
  3. 删除过时的保存题目功能
- Fix:
  1. 修复了题目详情页中单击题号不能正常跳转的问题
  2. 修复了犇犇时间显示错误的问题

## 4.8.5

- Add:
  1. 重写犇犇，支持查看特定用户的动态

## 4.8.4

- Fix:
  1. 修复了对P开头题号的解析问题

## 4.8.3

- Fix:
  1. 修复了对某些特殊题号的解析问题

## 4.8.2

- Fix:
  1. 改变了打包方式，修复了LaTeX渲染问题

## 4.8.1

- Fix:
  1. 初次启动时配置文件创建失败
- Optimize: 1.部分更新UI，更改了渲染LaTeX的库

## 4.8.0

- Fix:

  1. 比赛赛题提交链接错误导致提交错误
  2. 删除了目前不支持的 languages
  3. 全面升级了项目依赖 Thanks@My.Python
  4. 修复了犇犇功能

- Add:
  1. 增加了自动 O2 开关（todo：自动检测能否开 O2 etc. Python 不能）
  2. 增加了自动跳过题号选择开关，当文件名是正确的题目编号时跳过这一步骤

## 4.7.3

- Fix:
  1. RMJ 提交记录显示
  2. 提交失败的错误信息显示

## 4.7.2

- Fix:
  1. 无法在题单广场中搜索后打开题单

## 4.7.1

- Fix:

  1. 无法从题单广场打开的题单点击进入题目

- Add:
  1. 使扩展在目标主机运行

## 4.7.0

- Add:
  1. 添加“传送至 CPH” 功能，若已启动 CPH 在题目信息中则会显示按钮

## 4.6.4

- Fix:
  1. 修复了对乱序测试点组成的 Subtask 的显示

## 4.6.3

- Fix:
  1. 无法正常登录

## 4.6.2

- Add:

  1. 支持打开 AtCoder 来源的题目

- Fix:
  1. 为比赛页面完善深色模式

## 4.6.1

- Fix:
  1. 为题单列表完善深色模式

## 4.6.0

- Fix:
  1. 无法正常使用登录功能

## 4.5.11

- Add:
  1. 添加了显示冬日绘板的功能

## 4.5.10

- Fix:

  1. 无法显示子任务

- Add:
  1. 新增语言 `C++14 (GCC 9)`

## 4.5.9

- Fix & Add:
  1. 更新支持的语言

## 4.5.8

- Add:
  1. 向api中添加了postcaptcha

## 4.5.7

- Fix:
  1. 修复了CF记录无法正常显示全部测试点的问题

## 4.5.6

- Add:
  1. 增加了根据题目来源和难度随机跳题的功能

## 4.5.5

- Fix:
  1. 修复了 `command not found` 的问题

## 4.5.4

- Add:
  1. 添加了对B开头题目的支持
- Fix:
  1. 修复了标题中空格显示异常的问题
  1. 修复了对UVA题目的显示

## 4.5.3

- Fix:
  1. 修复了登录相关问题

## 4.5.2

- Fix:
  1. cookieslogin的相关问题

## 4.5.1

- Fix:
  1. 模块更新带来的问题

## 4.5.0

- Fix:
  1. 排行榜底部问题
  2. 美化contest页面
- Add:
  1. Dark version for most pages
  2. 比赛页面中点击题目跳转
  3. 题目可以通过提交按钮点击提交
  4. 保存在本地的题目经过设定的时间后自动删除

## 4.4.9

- Add:
  1. 查看排行榜

## 4.4.8

- Fix:
  1. 部分比赛无法查看

## 4.4.7

- Add:
  1. 查看比赛（排行榜部分未完工）
  2. 根据文件后缀名识别提交语言
- Fix:
  1. 深色主题题解配色

## 4.4.6

- Fix:
  1. 题解中点赞/踩无反应
  2. pypy3正常提交

## 4.4.5

- Fix:
  1. 题解中用户名字颜色显示不正常
  2. 题解中$ \LaTeX $出锅
  3. 选择默认语言后无法正常提交
  4. 评测记录显示问题
- Add:
  1. 可为题解点赞/踩

## 4.4.4

- Fix:
  1. 题解中开篇显示大量空行

## 4.4.3

- Fix:
  1. 题解中奖项认证的√显示的问题

## 4.4.2

- Add:
  1. cookies过期自动提醒重新登录

## 4.4.1

- Delete some useless code
- Add user communication group(QQ):1141066631
- Change the update display mode

## 4.4.0

- Optimize user experience
- Optimize code
- Update README.md
- Add:
  1. 查看题解

## 4.3.10

- Fix:
  1. LaTeX 字体显示

## 4.3.9

- Optimize user experience
- Fix:
  1. 题目界面 LaTeX 显示

## 4.3.8

- Fix:
  1. 新用户无法使用
- Delete .luogu/uid.json and .luogu/CsrfToken.json
- Optimize code

## 4.3.7

- Add:
  1. 评测记录界面 Judging 状态显示
- Update README.md
- Fix:
  1. UKE 状态显示

## 4.3.5

- Fix：
  1. 命令无法使用

## 4.3.4

- Optimize code
- 添加部分错误处理

## 4.3.3

- 修复登出功能

## 4.3.2

- 修复登录功能

## 4.3.1

- 使用 cookie 登录时可使用用户名
- Optimize user experience

## 4.3.0

- 增加了快捷键

- Fix bug

- 对图标内容作出修改，删去无用命令

## 4.2.9

- 增加了cookies登录

## 4.2.8

- Update README.md

## 4.2.7

- 查看题目时自动识别题号
- Fix bug

## 4.2.6

- 提交代码时自动识别题号

## 4.2.5

- Fix bug

## 4.2.4

- 修复犇犇头像缓存 bug

## 4.2.3

- 犇犇支持回复、发布

## 4.2.2

- 查看犇犇时将用户头像缓存到本地

## 4.2.1

- Support BENBEN
- Fix bug

## 4.2.0

- Fix bug
- Support to view last record

## 4.1.9

- Fix bug in getting fate

## 4.1.8

- Fix bug

## 4.1.7

- Support to save problems to local

## 4.1.6

- Fix bug in saving login status

## 4.1.5

- Fix bug in subtasks

## 4.1.4

- Fix bug

## 4.1.3

- Support languages: Auto/文言/Scala/Perl/Haskell/Kotlin/PyPy2/PyPy3
- Support to select the default language for submission
- Fix bug

## 4.1.2

- Support for fate
- Support saving login status

## 4.1.1

- Fix bug

## 4.1.0

- Support logout, userInfo display
- Beautify code display
- Fix bugs
- Support for viewing problem translations
- Support for copying sample input/output.

## 4.0.9

- Fix login bug

## 4.0.8

- Fix bug

## 4.0.7

- Beautify results display

## 4.0.6

- Add saving login status

## 4.0.5

- Update description

## 4.0.4

- Support to view your own record

## 4.0.3

- Support submit code

## 4.0.2

- Added status bar display

## 4.0.1

- Fixed bug

## 4.0.0

- Rewrite API

- Support login again

## 3.0.2

- Updated CHANGELOG.md

- Updated links

## 3.0.1

- Updated README.md

## 3.0.0

- Open a new version

## 0.1.13

- Support C#/VB

## 0.1.12

- Support C++17/GO/Ruby/PHP7/Rust

## 0.1.11

- Fix Cann't submit the solution and other bugs

## 0.1.10

- Support C++14

- Fix bugs

## 0.1.9

- Add info message when the token expired
- Fix bugs

## 0.1.8

- Fix the wrong text.

## 0.1.7

- Fix bugs

## 0.1.6

- Update status bar item

- Optimize code

## 0.1.5

- Add Error Message when input is incorrect

- Optimize user experience

## 0.1.4

- Fix a bug

## 0.1.3

- Fix a bug

## 0.1.2

- Add

  1. New Icon from icon8
  2. StatusBar at bottom

- Update README.md

- Fix

  1. Repeat login on command luogu.login
  2. Display error

- Update README.md

## 0.1.1

- Update README.md

- Fix display error

## 0.1.0

- Add

  1. Login in your luogu account
  2. SubmitSolution

- Optimize user experience

- Optimize code

- Fix bugs

## 0.0.5

- Add error message when user input is incorrect

- Optimize user experience

## 0.0.4

- Optimize user experience

- Add Problem ID at ViewPage

## 0.0.3

- Optimize user experience

## 0.0.2

- Fixed bugs
  1. fix luogu.search
     1. highlight.js is not imported
     2. katex is not imported

## 0.0.1

- Add searchProblem Function
