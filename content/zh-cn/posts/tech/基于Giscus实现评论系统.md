---
title: "基于Giscus实现评论系统"
date: 2025-03-19T22:22:32+08:00
lastmod: 2025-03-19T22:22:32+08:00
author: ChiAn Ye
categories:
# categories暂时不用
# - 分类1
# - 分类2
tags:
# 现在都先使用tags
# - 标签1
# - 标签2
# summary->在列表页展现的摘要内容，自动生成，内容默认前70个字符，可通过此参数自定义，一般无需专门设置
summary: " "
# description->需要自己编写的文章描述，是搜索引擎呈现在搜索结果链接下方的网页简介，建议设置
description: " "
weight: # 输入1可以顶置文章，用来给文章展示排序，不填就默认按时间排序
slug: ""
draft: false # 是否为草稿
comments: true
showToc: true # 显示目录
TocOpen: true # 自动展开目录
hidemeta: false # 是否隐藏文章的元信息，如发布日期、作者等
disableShare: false # 底部不显示分享栏
showbreadcrumbs: true #顶部显示当前路径
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

在 Hugo 博客中集成 Giscus 评论系统

<!--more-->

## 前言

最近看到一些博客的评论功能实现并不复杂，故计划在 Hugo 博客中集成 Giscus 评论系统。

## Giscus 简介

Giscus 是一个基于 GitHub Discussions 的评论系统，具有以下特点：

- 完全免费
- 数据存储在 GitHub，无需额外数据库
- 支持 Markdown 格式
- 支持代码高亮
- 支持表情符号
- 支持多语言
- 支持暗色模式
- 支持评论通知

## 安装步骤

### 1. 安装 Giscus GitHub App

1. 访问 [Giscus GitHub App](https://github.com/apps/giscus)
2. 点击 "Install" 按钮
3. 选择您的博客仓库
4. 完成安装

### 2. 配置 Hugo

在 Hugo 的配置文件中添加 Giscus 配置。编辑 `config/_default/hugo.toml`：

```toml
[params.giscus]
enable = true
repo = "Cain-James/YYH-Hugo-Blog"  # 替换为您的 GitHub 仓库
repoId = "R_kgDOJpljfQ"            # 替换为您的仓库 ID
category = "General"                # 评论分类
categoryId = "DIC_kwDOJpljfc4CoOtn" # 替换为您的分类 ID
mapping = "title"                   # 使用文章标题作为映射
strict = 0                          # 严格模式
reactionsEnabled = 1                # 启用反应
emitMetadata = 0                    # 不发送元数据
inputPosition = "top"               # 评论框位置
theme = "preferred_color_scheme"    # 跟随系统主题
lang = "zh-CN"                      # 语言设置
loading = "lazy"                    # 懒加载
```

### 3. 创建评论模板

在 `layouts/partials/comments.html` 中添加 Giscus 模板：

```html
{{ if .Site.Params.giscus.enable }}
<div class="giscus-container">
  <div class="giscus">
    <script
      src="https://giscus.app/client.js"
      data-repo="{{ .Site.Params.giscus.repo }}"
      data-repo-id="{{ .Site.Params.giscus.repoId }}"
      data-category="{{ .Site.Params.giscus.category }}"
      data-category-id="{{ .Site.Params.giscus.categoryId }}"
      data-mapping="{{ .Site.Params.giscus.mapping }}"
      data-strict="{{ .Site.Params.giscus.strict }}"
      data-reactions-enabled="{{ .Site.Params.giscus.reactionsEnabled }}"
      data-emit-metadata="{{ .Site.Params.giscus.emitMetadata }}"
      data-input-position="{{ .Site.Params.giscus.inputPosition }}"
      data-theme="{{ .Site.Params.giscus.theme }}"
      data-lang="{{ .Site.Params.giscus.lang }}"
      data-loading="{{ .Site.Params.giscus.loading }}"
      crossorigin="anonymous"
      async
    ></script>
  </div>
</div>

<style>
  .giscus-container {
    margin-top: 2rem;
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: var(--entry);
  }

  .giscus {
    max-width: 100%;
    margin: 0 auto;
  }

  .giscus-frame {
    width: 100%;
    border: none;
  }

  @media (max-width: 768px) {
    .giscus-container {
      padding: 0.5rem;
    }
  }
</style>
{{ end }}
```

## 配置说明

### 主要参数说明

- `repo`: GitHub 仓库名称
- `repoId`: 仓库 ID（从 Giscus 配置页面获取）
- `category`: 评论分类名称
- `categoryId`: 分类 ID（从 Giscus 配置页面获取）
- `mapping`: 评论映射方式（title/pathname/url）
- `strict`: 严格模式（0/1）
- `reactionsEnabled`: 是否启用反应（0/1）
- `emitMetadata`: 是否发送元数据（0/1）
- `inputPosition`: 评论框位置（top/bottom）
- `theme`: 主题设置
- `lang`: 语言设置
- `loading`: 加载方式（lazy/eager）

### 样式定制

可以通过修改 CSS 来自定义评论系统的外观：

```css
.giscus-container {
  margin-top: 2rem;
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: var(--entry);
}
```

## 使用说明

1. 评论者需要使用 GitHub 账号登录
2. 评论会存储在您的 GitHub 仓库的 Discussions 中
3. 支持 Markdown 格式和代码高亮
4. 支持表情符号和反应功能
5. 支持多语言切换

## 注意事项

1. 确保仓库是公开的
2. 确保已正确安装 Giscus GitHub App
3. 评论系统需要 GitHub 账号才能使用
4. 评论数据存储在 GitHub Discussions 中

## 参考链接

- [Giscus 官网](https://giscus.app/)
- [Giscus GitHub](https://github.com/giscus/giscus)
- [Hugo 文档](https://gohugo.io/)
