---
title: "Hugo博客图床解决方案：Github+jsDelivr CDN 加速 + PicGo实现图片水印和压缩"
date: 2023-06-02T12:54:52+08:00
lastmod: 2023-06-02T12:54:52+08:00
author: ["作者"]
categories:
# - 分类1
# - 分类2
tags:
  - 建站
# - 标签2
# summary->在列表页展现的摘要内容，自动生成，内容默认前70个字符，可通过此参数自定义，一般无需专门设置
summary: "搭建GitHub图床并解决GitHub作图床国内无法显示的问题"
# description->需要自己编写的文章描述，是搜索引擎呈现在搜索结果链接下方的网页简介，建议设置
description: "搭建GitHub图床并解决GitHub作图床国内无法显示的问题"
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
ShowReadingTime: true
ShowLastMod: true
cover:
  image: ""
  caption: ""
  alt: ""
  relative: false
---

搭建 GitHub 图床并解决 GitHub 作图床国内无法显示的问题

<!--more-->

## 快速开始

看官方文档是一个快速上手的靠谱办法
[官方手把手教学如何配置 github 图床](https://picgo.github.io/PicGo-Doc/zh/guide/config.html#github%E5%9B%BE%E5%BA%8A)

## 前言

今天开始解决博客上传图片的问题，之前一直使用 csdn 等博客平台，他们都自带了平台的图床，但是好像不允许外部链接它。
本来要解决 hugo 中的图片上传问题还有一个方案，就是直接在 md 文件的同级目录创建一个和 md 文件相同名称的**文件夹**。
不过这样我担心图片多了以后会使得网站加载速度变慢，并且这样的做法还有路径问题、资源问题等一些不便之处，我决定使用 Github 搭建一个图床并借助 jsDelivr 的 CDN 加速来完成这个工作。
使用图床可以将需要使用到的图片上传到一个统一的地方进行管理，在博客中直接插入图片在图床中的 URL 链接即可，此方案优点就是方便快捷并且节省静态服务的空间和网络资源，但是此方案的问题就是我们需要找到一个地方来托管我们的图片，对于纯静态无服务端的博客来说再弄个服务器来部署图片资源显然有点笨，但是目前好用的图床并不多，想找到一个靠谱的图床不容易，试想下突然有一天你所用的图床突然停止服务了，那么你所有的图片就都没了，这种代价应该是谁都无法接受。
前期探索的过程中我查找了很多资料，首先国内的服务必然要有审查机制，虽然我的图片一般不会有这类问题，但还是担心某天被挂了，最终我还是选择依靠 GitHub 这类大平台来搭建我的图床，首先这样能够及时备份，以免彻底丢失图片，其次使用 GitHub 也算是比较稳妥的选择。

## Github + JsDelivr 解决方案的优势

GitHub 在稳定性、可控性方面的优势无需多言，但国内访问总归是个问题，有些地方访问 raw.githubusercontent.com 域名下的文件会很慢甚至无法打开
因此，在使用该 GitHub 托管文件后，仍需使用 CDN 来解决访问速度问题。目前，JsDelivr 是一个很好的选择。它不仅提供了许多 npm 和 js 文件的加速，还提供了 Github 和 Wordpress 的加速服务。而且，它的使用非常简单，只需替换 CDN 域名即可实现加速效果。
该方案优势主要在以下三个方面：
可靠性：Github 是全球最大的开源代码托管平台之一，拥有庞大的开发者社区。这意味着你可以在 Github 上找到几乎任何开源项目的资源。JsDelivr 是一个全球免费的前端资源 CDN（内容分发网络），通过与 Github 的集成，这提供了一个可靠的资源加载渠道。

高速加载：JsDelivr 使用全球多个服务器节点分布，可以快速地将资源分发给用户。这减少了资源加载时间，提高了网页的响应速度，使用户能够更快地访问和使用你的网站。

版本管理：Github 提供了强大的版本控制功能，你可以通过标签、分支等方式管理你的项目的不同版本。结合 JsDelivr，你可以轻松地将你的项目发布到 Github 上，并使用特定的版本号来加载资源，确保网页始终使用最新的稳定版本。

## Github + JsDelivr 解决方案的实施

1. 创建一个可公开访问的 Github 仓库
   ![](https://cdn.jsdelivr.net/gh/Cain-James/HugoBlog-Images/Images/P1001592.jpg)

其中 @发布的版本号 是非必需的，如果不带默认取的是仓库主分支的最新文件。

2. 上传图片
   将你的图片上传到 GitHub 仓库即可

3. 更换 URL
   加速 github 文件只需要将 github 的文件地址转换成如下地址即可：

`https://cdn.jsdelivr.net/gh/你的用户名/你的仓库名@发布的版本号/文件路径 `
这样就基本完成了通过 jsdelivr 来加速访问 GitHub 存储的图片的过程了。但是很明显，对于每张图片需要做的操作太重复繁琐无聊了，我们还需要进一步优化这个过程。

## 使用 PicGo 简化图片引用流程

[PicGo](https://picgo.github.io/PicGo-Doc) ，它是一个多平台的可用于快速上传图片并获取 URL 链接的工具。更详细的使用说明可以参考[官方说明文档](https://picgo.github.io/PicGo-Doc/zh/guide/)。本文主要介绍我用到的上传设置，水印处理，和压缩等操作设置。

### PicGo 安装

- 软件下载

GitHub Release：https://github.com/Molunerfinn/PicGo/releases
山东大学镜像站：https://mirrors.sdu.edu.cn/github-release/Molunerfinn_PicGo
Scoop: `scoop bucket add helbing https://github.com/helbing/scoop-bucket & scoop install picgo`(Windows 平台)
Chocolatey: `choco install picgo`(Windows 平台)
Homebrew: `brew install picgo --cask`(Mac OS)
AUR: `yay -S picgo-appimage`(Arch-Linux)

以上站点引用自 PicGo 官网，[点击这里](https://picgo.github.io/PicGo-Doc/zh/guide/#%E4%B8%8B%E8%BD%BD%E5%AE%89%E8%A3%85)可以前往查看

- VsCode 插件方案

我使用的是 [VsCode 插件](https://github.com/PicGo/vs-picgo)，这样我就可以使用 VsCode 完成 markdown 编写、图片上传、git 更新等全流程工作，这样下来还是挺方便的。

vscode 下载 PicGo 插件后设置一下即可。

不过这样没法进行快速 CDN 加速，还是 GitHub 的链接，我放弃了。

测试：
![](https://cdn.jsdelivr.net/gh/Cain-James/HugoBlog-Images/Images/20230602170325.png)

- 软件操作方案

至于下载软件再进行操作的方法，我还没有尝试过，你可以在 Jason Yu 的[这篇文章](https://www.yuhuizhen.com/2022/11/27/image-bed/)中找到设置方法。
我有机会会重新更新这个部分。
