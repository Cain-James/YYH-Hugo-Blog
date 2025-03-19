# YYH Hugo Blog

这是一个基于 Hugo 框架搭建的个人博客项目，使用 PaperMod 主题。

## 功能特点

- 基于 Hugo 静态网站生成器
- 使用 PaperMod 主题
- 支持多语言（中文/英文）
- 响应式设计，支持移动端
- 支持文章分类和标签
- 支持文章搜索
- 支持文章目录导航

## 环境要求

- Hugo Extended 版本（推荐 v0.120.0 或更高版本）
- Git

## 安装步骤

1. 克隆项目

```bash
git clone https://github.com/yourusername/YYH-Hugo-Blog.git
cd YYH-Hugo-Blog
```

2. 安装 Hugo

- Windows: 使用 [Chocolatey](https://chocolatey.org/) 安装

```bash
choco install hugo-extended
```

- 或从 [Hugo Releases](https://github.com/gohugoio/hugo/releases) 下载

## 本地开发

1. 启动本地服务器

```bash
hugo server -D
```

2. 访问本地预览
   打开浏览器访问 http://localhost:1313

## 内容管理

### 新建文章

```bash
hugo new posts/my-new-post.md
```

### 文章格式

文章使用 Markdown 格式，支持以下 front matter：

```yaml
---
title: "文章标题"
date: 2024-01-01
draft: false
tags: ["标签1", "标签2"]
categories: ["分类"]
---
```

### 图片管理

- 将图片放在 `static/images/` 目录下
- 在文章中使用相对路径引用：`![图片描述](/images/图片名称.jpg)`

## 部署

1. 构建静态文件

```bash
hugo --minify
```

2. 部署到服务器

- 将 `public/` 目录下的文件部署到您的 Web 服务器
- 或使用 GitHub Pages、Netlify 等静态网站托管服务

## 目录结构

```
YYH-Hugo-Blog/
├── archetypes/     # 文章模板
├── assets/         # 需要处理的资源文件
├── content/        # 网站内容
├── data/           # 数据文件
├── i18n/           # 多语言文件
├── layouts/        # 自定义布局
├── static/         # 静态资源
├── themes/         # 主题文件
└── config/         # 配置文件
```

## 常见问题

1. 本地预览时图片无法显示

   - 检查图片路径是否正确
   - 确保图片已放在正确的目录下

2. 文章更新后没有显示
   - 检查文章 front matter 中的 draft 状态
   - 确保文章在正确的目录下

## 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目。

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件
