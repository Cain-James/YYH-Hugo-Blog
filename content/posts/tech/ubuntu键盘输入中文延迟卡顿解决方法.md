---
title: "Ubuntu键盘输入中文延迟卡顿解决方法"
date: 2023-08-22T13:33:10+08:00
lastmod: 2023-08-22T13:33:10+08:00
author: ChiAn Ye
categories:
  - Linux
# - 分类2
tags:
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
ShowReadingTime: true
ShowLastMod: true
cover:
  image: ""
  caption: ""
  alt: ""
  relative: false
---

解决 Ubuntu 中文输入法卡顿的问题

<!--more-->

# 问题描述

- 用键盘输入后，需要过至少 1 分钟屏幕上才会显示
- 不限于场景，网页、聊天框、表格等均会发生
- 键盘输入的是中文、或者中文输入法 shift 后的英文
- 输入法系统为 ibus（ubuntu 自带的输入法）

# 解决方法

1. 安装 ccsm 工具 ：
   sudo apt-get install compizconfig-settings-manager

2. disable “Sync To VBlank”
   方法：终端输入 ccsm 打开界面
   选择 General -> OpenGL，然后取消勾选“Sync To VBlank”即可。

# 推测原理

可能是屏幕不能及时刷新中文的问题，关掉垂直同步就好了。
