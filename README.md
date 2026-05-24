# YYH Hugo Blog

这是一个基于 Hugo + PaperMod 的个人博客项目，当前站点地址为 <https://seu-yuan.top/>。项目使用 Hugo 多语言目录组织内容，并通过 Cloudflare Pages 部署，部分动态能力由 Cloudflare Pages Functions 提供。

## 功能概览

- Hugo Extended 静态站点生成。
- PaperMod 主题，并在 `layouts/` 和 `assets/` 中维护站点自定义样式与模板。
- 简体中文 / English 双语言内容结构。
- 文章分类、标签、归档、目录、代码复制、站内搜索。
- Giscus 评论。
- 不蒜子统计与 Cloudflare 相关统计并存。
- 热门文章功能：Cloudflare Pages Functions + KV。
- Cloudflare Pages `_headers` 静态资源缓存策略。

## 环境要求

- Hugo Extended，建议 `v0.123.7` 或更高版本。
- Git。
- 如需本地调试 Cloudflare Pages Functions，建议安装 Wrangler。

## 本地开发

```bash
git clone git@github.com:Cain-James/YYH-Hugo-Blog.git
cd YYH-Hugo-Blog
hugo server -D
```

浏览器访问：

```text
http://localhost:1313
```

生产构建检查：

```bash
hugo --minify
```

如需避免污染仓库根目录，也可以输出到临时目录：

```bash
hugo --minify --destination /tmp/hugo-build-check --gc --cleanDestinationDir
```

## 快速编辑并发布一篇文章

### 1. 选择文章目录

中文文章放在：

```text
content/zh-cn/posts/tech/
content/zh-cn/posts/life/
```

英文文章放在：

```text
content/en/posts/tech/
content/en/posts/life/
```

### 2. 新建文章

推荐用 Hugo archetype 生成 front matter：

```bash
hugo new zh-cn/posts/tech/my-new-post.md
```

生活类中文文章示例：

```bash
hugo new zh-cn/posts/life/my-new-note.md
```

英文文章示例：

```bash
hugo new en/posts/tech/my-new-post.md
```

### 3. 编辑 front matter

新文章会使用 `archetypes/default.md`。常用字段如下：

```yaml
---
title: "文章标题"
date: 2026-05-24T20:00:00+08:00
lastmod: 2026-05-24T20:00:00+08:00
author: ChiAn Ye
tags:
  - Hugo
  - Cloudflare
summary: "列表页摘要"
description: "搜索引擎和分享卡片使用的文章描述"
draft: false
comments: true
showToc: true
TocOpen: true
---
```

注意：

- `draft: false` 才会在普通构建中发布。
- `tags` 是当前主要使用的内容组织方式。
- `summary` 用于列表页摘要。
- `description` 用于 SEO、分享卡片等页面描述。
- `<!--more-->` 之前的内容会影响摘要截断。

### 4. 编写正文

正文使用 Markdown：

```markdown
摘要

<!--more-->

正文内容。
```

图片建议优先使用 WebP，并放在 `static/img/` 或更合适的静态资源目录中。引用示例：

```markdown
![图片描述](/img/example.webp)
```

### 5. 本地预览

```bash
hugo server -D
```

检查：

- 文章页标题、摘要、目录是否正常。
- 标签是否正确。
- 代码块和图片是否正常显示。
- 如果有评论、热门文章、统计信息，确认页面没有明显脚本错误。

### 6. 构建并提交

```bash
hugo --minify --destination /tmp/hugo-build-check --gc --cleanDestinationDir
git status
git add content/zh-cn/posts/tech/my-new-post.md
git commit -m "post: add my new post"
git push origin main
```

推送后由 Cloudflare Pages 按项目配置构建和发布。

## 内容与资源组织

```text
content/zh-cn/       # 中文内容
content/en/          # 英文内容
layouts/             # 自定义 Hugo 模板
assets/css/          # 经 Hugo Pipes 处理的 CSS
assets/js/           # 经 Hugo Pipes 处理的 JS
static/              # 原样发布的静态资源
functions/api/       # Cloudflare Pages Functions API
config/_default/     # 默认 Hugo 配置
config/production/   # 生产环境覆盖配置
```

当前常用静态图片：

- `static/img/logo.webp`：站点顶部 logo。
- `static/img/logo.png`：Apple touch icon 等兼容用途。
- `static/img/head.webp`：首页头像。
- `static/img/alipay.webp`：打赏图片。
- `static/img/magic16.ico`、`static/img/magic32.ico`：favicon。

## Cloudflare Pages 与 KV

热门文章功能依赖 Cloudflare Pages Functions：

- `functions/api/post-view.js`
- `functions/api/popular-posts.js`

生产环境需要在 Cloudflare Pages 项目中绑定 KV namespace：

```text
Binding name: BLOG_KV
```

如果缺少绑定，接口会返回类似：

```json
{"error":"Missing KV binding","binding":"BLOG_KV"}
```

`static/_headers` 用于 Cloudflare Pages 静态资源缓存策略。指纹化资源会使用较长缓存，HTML 和 RSS 使用 `no-cache`。

## 常用检查

构建：

```bash
hugo --minify --destination /tmp/hugo-build-check --gc --cleanDestinationDir
```

检查 JS 语法：

```bash
node --check static/js/footer.js
node --check functions/api/popular-posts.js
node --check functions/api/post-view.js
```

检查空白错误：

```bash
git diff --check
```

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](LICENSE)。
