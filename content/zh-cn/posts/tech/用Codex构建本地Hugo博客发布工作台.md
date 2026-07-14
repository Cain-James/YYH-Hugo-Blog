---
title: "用 Codex 构建本地 Hugo 博客发布工作台"
date: "2026-07-14T05:40:04+08:00"
lastmod: "2026-07-15T05:03:40+08:00"
author: "ChiAn Ye"
categories:
tags:
  - Hugo
  - Codex
  - 本地工具
  - Node.js
  - Git
summary: "把 Hugo 博客的新建、编辑、预览、构建检查和发布流程封装进一个本地 Web 工作台，减少命令行切换，并保留 Git 可审计性。"
description: "一篇可复现的技术实践指南：如何借助 Codex 为 Hugo 博客搭建本地写作、预览和发布工作台。"
weight:
slug: "build-local-hugo-blog-studio-with-codex"
draft: false
comments: true
showToc: true
TocOpen: true
hidemeta: false
disableShare: false
showbreadcrumbs: true
DateFormat: "2006-01-02"
ShowWordCounts: true
ShowWordCount: true
ShowReadingTime: true
ShowLastMod: true
cover:
    image: ""
    caption: ""
    alt: ""
    relative: false
---

## 前言

使用 Hugo 写博客时，最稳定的工作流通常是：

1. 在 `content/` 目录里新建 Markdown 文件
2. 手动维护 front matter
3. 运行 `hugo server -D` 本地预览
4. 运行 `hugo` 或 `hugo --minify` 做构建检查
5. 通过 `git status`、`git diff`、`git add`、`git commit`、`git push` 发布

这个流程可靠，但对日常写作并不够顺手。真正的问题不是命令复杂，而是写作过程中需要频繁在编辑器、终端、浏览器和 Git 状态之间切换。本文记录一次用 Codex 构建本地博客发布工作台的完整实践：把新建、编辑、预览、构建检查、查看修改、还原、提交和推送统一封装到一个本地 Web 服务中。

目标不是替代 Hugo 或 Git，而是把它们已有的能力组织成一个更适合写作的操作界面。

## 最终效果

这个本地工作台解决了几个核心问题：

- **新建文章**：在表单里选择语言、分类、标题、标签和草稿状态，自动生成符合博客模板的 Markdown 文件
- **编辑文章**：用 CodeMirror 编辑正文，同时维护标题、日期、标签、摘要、评论、目录等 front matter 字段
- **真实预览**：启动本地 `hugo server`，在页面里 iframe 打开 Hugo 渲染后的文章，而不是自己模拟 Markdown 渲染
- **构建检查**：一键运行 Hugo 构建，提前发现模板、front matter 或内容错误
- **发布管理**：读取 Git 工作区状态，支持查看 diff、选择文件、还原修改、提交和推送
- **性能优化**：文章列表使用虚拟滚动，避免文章变多后列表滚动卡顿

最终工作流变成：

```text
打开本地工作台 -> 新建或编辑文章 -> 渲染预览 -> 构建检查 -> 查看修改 -> 提交 -> 推送
```

命令行仍然存在，但它退到了工作台后面。

## 技术选型

这个工具没有引入复杂框架，整体保持足够轻：

```text
Hugo              负责站点生成和真实预览
Node.js http      负责本地 API 和静态页面服务
CodeMirror 5      负责 Markdown 编辑体验
Git CLI           负责状态、diff、还原、提交、推送
原生 HTML/CSS/JS   负责工作台前端
Codex             负责需求拆解、代码实现、调试和迭代
```

目录结构可以设计成这样：

```text
your-hugo-blog/
├── content/
├── assets/
├── layouts/
├── themes/
├── package.json
└── tools/
    └── blog-studio/
        ├── package.json
        ├── server.mjs
        └── static/
            ├── index.html
            ├── app.js
            └── styles.css
```

我选择把工作台放在 `tools/blog-studio/`，原因是它属于博客仓库的本地生产力工具，而不是 Hugo 主题或文章内容的一部分。

## 第一步：准备启动入口

根目录 `package.json` 可以增加一个脚本入口：

```json
{
  "scripts": {
    "studio": "node tools/blog-studio/server.mjs"
  },
  "dependencies": {
    "codemirror": "^5.65.16"
  }
}
```

然后可以通过下面的命令启动工作台：

```bash
npm run studio
```

建议默认只监听本机地址：

```javascript
const HOST = process.env.BLOG_STUDIO_HOST || '127.0.0.1';
const PORT = Number(process.env.BLOG_STUDIO_PORT || 4177);
```

这是一个本地写作工具，不应该默认暴露到公网。

## 第二步：让服务端理解 Hugo 文章

Hugo 文章最重要的是 front matter。工作台要编辑文章，就必须能读取和写回 front matter。

可以先定义一个统一的默认字段：

```javascript
const defaultFrontMatter = {
  title: '',
  date: '',
  lastmod: '',
  author: 'Your Name',
  categories: [],
  tags: [],
  summary: ' ',
  description: ' ',
  weight: '',
  slug: '',
  draft: false,
  comments: true,
  showToc: true,
  TocOpen: true,
  hidemeta: false,
  disableShare: false,
  showbreadcrumbs: true,
  DateFormat: '2006-01-02',
  ShowWordCounts: true,
  ShowWordCount: true,
  ShowReadingTime: true,
  ShowLastMod: true,
  cover: {
    image: '',
    caption: '',
    alt: '',
    relative: false,
  },
};
```

新建文章时，根据语言、分类和标题生成目标路径：

```javascript
const relativePath = `content/${language}/posts/${category}/${slug}.md`;
```

这里要特别注意路径安全。任何来自前端的路径都必须限制在仓库目录内，避免出现 `../../` 这种逃逸路径。一个基本做法是使用 `path.relative()` 校验最终绝对路径是否仍在仓库内。

## 第三步：文章列表和状态统计

工作台需要扫描 Markdown 文件：

```text
content/zh-cn/posts/**
content/en/posts/**
```

每篇文章解析出：

- 文件路径
- 标题
- 日期
- 最后修改时间
- 标签
- 是否草稿
- 语言
- 分类
- 预览路径

草稿检测和统计功能，不要从 Git 状态推断，应该是直接读取 front matter 的 `draft` 字段：

```javascript
const drafts = posts.filter((post) => post.draft).length;
const published = posts.length - drafts;
```

这样首页「草稿 / 已发布」才会和真实文章状态一致。

## 第四步：接入 CodeMirror 编辑器

普通 `textarea` 可以完成编辑，但写 Markdown 时体验不够好。CodeMirror 可以提供更接近编辑器的体验：

- 行号
- Markdown 高亮
- 自动补全括号
- 匹配括号
- 当前行高亮
- 列表回车自动延续
- `Ctrl-S` / `Cmd-S` 保存

初始化示例：

```javascript
const editor = CodeMirror.fromTextArea(textarea, {
  mode: {
    name: 'markdown',
    highlightFormatting: true,
    taskLists: true,
    strikethrough: true,
    fencedCodeBlockHighlighting: true,
  },
  lineNumbers: true,
  lineWrapping: true,
  styleActiveLine: true,
  matchBrackets: true,
  autoCloseBrackets: true,
  indentUnit: 2,
  tabSize: 2,
  extraKeys: {
    'Enter': 'newlineAndIndentContinueMarkdownList',
    'Ctrl-S': () => saveCurrentPost(),
    'Cmd-S': () => saveCurrentPost(),
  },
});
```

如果 CodeMirror 加载失败，也应该回退到原生 `textarea`，不要让用户失去编辑能力。

## 第五步：用真实 Hugo 页面做预览

预览最好不要自己再写一套 Markdown 渲染器。否则很容易出现本地预览和线上展示不一致的问题，例如：

- shortcode 渲染不一致
- 主题 CSS 不一致
- 目录、阅读时间、字数统计不一致
- 自定义 layout 不一致
- 图片路径和站点 baseURL 不一致

更稳的方式是直接启动 Hugo：

```javascript
const hugoProcess = spawn('hugo', [
  'server',
  '-D',
  '--bind',
  '127.0.0.1',
  '--port',
  String(hugoPort),
  '--baseURL',
  `http://127.0.0.1:${hugoPort}/`,
], {
  cwd: repoRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
});
```

然后在工作台中用 iframe 打开对应文章路径：

```javascript
const previewUrl = `${status.url.replace(/\/$/, '')}${post.previewPath}`;
```

这样看到的就是 Hugo 真实渲染结果。需要注意，本地预览通常会带 `-D`，所以草稿也能看到；线上构建如果不带 `-D`，草稿不会发布。

## 第六步：发布页不要只做提交按钮

发布页最重要的不是「一键发布」，而是让用户知道 Git 将要做什么。

至少应该提供这些能力：

- `git status --porcelain=v1 -z`：读取机器友好的变更列表
- `git diff HEAD -- file`：查看已跟踪文件的修改
- 新增文件预览：对 untracked 文件展示完整文本
- `git restore -- file`：还原已跟踪文件
- 删除未跟踪文件：只允许删除明确选择的文件，不自动删除目录
- `git add -- files`：只暂存用户选择的文件
- `git commit -m message`：提交
- `git push origin main`：推送

这里有两个实践建议：

第一，提交时不要默认 `git add .`。本地工作区里可能有临时文件、草稿、调试产物或者不想发布的内容。更安全的方式是让用户在发布页勾选文件，然后只提交这些文件：

```javascript
await runCommand('git', ['add', '--', ...files]);
await runCommand('git', ['commit', '-m', message]);
```

第二，还原未跟踪目录要谨慎。文件可以安全删除，但目录可能包含一组还没确认的产物。工作台可以拒绝删除未跟踪目录，并提示用户手动处理。

## 第七步：处理中文路径显示

中文博客很容易出现 Git 路径转义问题，例如终端里显示成：

```text
content/zh-cn/posts/tech/\345\237\272\344\272\216CloudFlare...
```

在工作台里应该尽量展示 UTF-8 可读路径。对 `git diff` 可以加上：

```bash
git -c core.quotePath=false diff HEAD -- path/to/file.md
```

对 `git status --porcelain=v1 -z`，可以读取 buffer 后按 UTF-8 解析。这样发布页能显示正常中文文件名，用户不会在提交前失去判断能力。

## 第八步：优化文章列表性能

当文章数量变多时，列表页卡顿通常不是接口慢，而是 DOM 节点太多、滚动时重排太频繁。

可以采用虚拟列表：

```javascript
const rowHeight = 104;
const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
const end = Math.min(posts.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
const visibleRows = posts.slice(start, end);
```

页面只渲染当前视口附近的文章，上下用 spacer 撑开高度。这样即使文章数量增长，滚动性能也会稳定很多。

同时可以做这些小优化：

- 搜索输入使用 `input` 事件，但不要在输入过程中重建整页
- 中文输入法组合输入时，避免过早触发破坏输入状态的渲染
- 切换页面时复用缓存的行 HTML
- 滚动中减少阴影和复杂 hover 效果
- 不在列表项里放过多实时计算

## 第九步：本地 API 设计

一个够用的 API 可以长这样：

```text
GET  /api/config
GET  /api/posts
POST /api/posts
GET  /api/posts/:id
PUT  /api/posts/:id

GET  /api/hugo/status
POST /api/hugo/preview/start
POST /api/hugo/preview/stop
POST /api/hugo/build

GET  /api/git/status
GET  /api/git/diff?file=...
POST /api/git/restore
POST /api/git/commit
POST /api/git/push
```

其中 `:id` 不建议直接暴露原始文件路径，可以做一层编码，例如把相对路径转成 base64url。前端拿到的是 id，服务端解码后再做路径安全校验。

## 第十步：构建检查和发布前校验

发布前至少跑一次 Hugo 构建：

```bash
hugo --minify --destination /tmp/hugo-build-check --gc --cleanDestinationDir
```

构建目录建议放到 `/tmp`，避免污染仓库。工作台里可以把 stdout/stderr 展示出来，让用户知道失败原因。

常见失败原因包括：

- front matter 格式错误
- shortcode 参数错误
- 模板引用不存在
- 图片路径错误
- 文章日期或 draft 状态不符合预期

只有构建检查通过，再进入提交和推送，整个流程才比较稳。

## 用 Codex 开发这类工具的方式

这次实践中，Codex 最适合承担的是「把模糊需求变成可工作的本地工具」：

1. 先明确目标：脱离命令行完成新建、编辑、预览、发布
2. 读取现有 Hugo 项目结构，而不是假设标准模板
3. 从最小闭环开始：文章列表、新建、保存
4. 接入真实 Hugo 预览，确保本地和线上视觉一致
5. 增加 Git 发布页，把发布动作变得可审计
6. 根据实际体验继续迭代：中文路径、草稿统计、CodeMirror、性能优化、前端细节

比较有效的提示方式不是「帮我做一个博客系统」，而是像这样逐步推进：

```text
我想把 Hugo 博客的新建、编辑、预览和发布流程封装成本地 Web 工作台。
请先读取当前项目结构，复用现有 Hugo 内容目录和主题，不要重写博客系统。
第一步先实现文章列表、新建文章和保存。
```

后续再继续补：

```text
现在接入 Hugo server 做真实预览，不要自己模拟 Markdown 渲染。
```

```text
发布页需要显示 git status、查看 diff、选择文件、还原、commit 和 push。
```

```text
文章列表滚动卡顿，检查并优化前后端性能。
```

这样 Codex 每次处理一个明确问题，更容易得到可运行、可验证的结果。

## 可以复制的最小落地清单

如果你也想为自己的 Hugo 博客做类似工具，可以按这个顺序实现：

1. **建立本地 Node 服务**：监听 `127.0.0.1`，提供静态页面和 API
2. **扫描文章目录**：读取 `content/<lang>/posts/<category>/*.md`
3. **解析 front matter**：保留字段顺序，写回时不要破坏已有模板
4. **实现新建和保存**：自动生成路径、日期、默认字段
5. **接入 CodeMirror**：提升 Markdown 编辑体验，并保留 textarea fallback
6. **启动 Hugo server**：iframe 打开真实渲染页面
7. **增加构建检查**：发布前运行 Hugo build
8. **接入 Git 状态**：展示 status、diff 和 untracked 文件内容
9. **实现选择性提交**：只提交用户勾选的文件
10. **做性能优化**：虚拟列表、输入状态保护、滚动降复杂度

这个顺序的好处是每一步都能单独验证，不会一次性堆出一个难以调试的大工具。

## 经验总结

本地博客发布工作台的关键，不是把 Hugo 或 Git 包装得看不见，而是把它们变成更适合写作的界面。

原则是：

- **预览必须真实**：用 Hugo 自己渲染，保证本地和线上一致
- **发布必须可审计**：提交前能看到 Git 会操作哪些文件
- **工具必须可回退**：任何时候都能回到命令行继续操作

对个人博客来说，这种工具不需要很重。一个本地 Node 服务、一组清晰 API、一个足够顺手的前端，就可以显著减少发布所需的繁琐链路，以前还需要记得怎么新建文章、怎么预览、怎么发布，现在使用web可视化工具，会好很多。更重要的是，它没有改变 Hugo 的文件结构，也没有替代 Git 的版本管理，因此可维护性和可迁移性都比较好。

当写作工具足够顺手时，真正的收益不是少输入几条命令，而是让注意力回到文章本身。
