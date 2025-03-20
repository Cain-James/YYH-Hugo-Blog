---
title: "👩‍💻 关于我"
layout: "about"
url: "/zh-cn/about/"
summary: about
# summary->在列表页展现的摘要内容，自动生成，内容默认前70个字符，可通过此参数自定义，一般无需专门设置
summary: ""
# description->需要自己编写的文章描述，是搜索引擎呈现在搜索结果链接下方的网页简介，建议设置
description: ""
weight: # 输入1可以顶置文章，用来给文章展示排序，不填就默认按时间排序
slug: ""
draft: false # 是否为草稿
comments: false
showToc: true # 显示目录
TocOpen: true # 自动展开目录
hidemeta: true # 是否隐藏文章的元信息，如发布日期、作者等
disableShare: false # 底部不显示分享栏
showbreadcrumbs: false #顶部显示当前路径
cover:
    image: ""
    caption: ""
    alt: ""
    relative: false

---

<!--more-->

## 关于我

我 2000 年出生于江西某小山村，2018 年开始在沈阳东北大学学习，本科期间专业为物联网工程，主要致力于 XCPC 竞赛，2022 年保研至东南大学（南京），硕士阶段无实质性产出，跟进某横向项目，2025.01 签约某互联网金融公司，base 上海，如果你有任何 C++/数据结构与算法等技术问题，高考/保研/求职等规划问题，你可以向我发邮件联系到我，我很乐意与你交流，希望能产生一些价值，邮箱地址：yuanyanghao2022@163.com

---

## 关于本站

自保研以来，我发现自己越来越失去了长时间专注的能力、深入系统学习知识的能力，这让我感到焦虑和苦恼，我希望以图文形式记录自己学习、生活的历程，以此激励自己不断学习。

本站基于 Go 语言的开源静态框架[Hugo](https://gohugo.io/)搭建，使用[PaperMod](https://github.com/adityatelange/hugo-PaperMod)主题，参考[sglv](https://www.sulvblog.cn/)的博客和教程进一步完善，过程中参考的博客、资料还有[Hugo 的官方文档](https://gohugo.io/getting-started/configuration/)、[Cloudflare: Deploy a Hugo site](https://developers.cloudflare.com/pages/framework-guides/deploy-a-hugo-site/)等等。过程中也遇到了一些问题，感谢各位乐于分享的网友，才使得本站得以顺利完成。

得益于 AI 技术的飞快发展，我可以在较短的时间内以较低的学习成本完成以往同样量级的工作，本站基于 cursor(clude 3.5/3.7)进一步开发。

### 本站流量

<div class="site-stats">
    <div class="stat-item">
        <span class="stat-label">总访问量：</span>
        <span id="cf-pageviews" class="stat-value">加载中...</span>
    </div>
    <div class="stat-item">
        <span class="stat-label">总访问人数：</span>
        <span id="cf-visitors" class="stat-value">加载中...</span>
    </div>
    <div id="chartContainer" class="chart-container">
        <canvas id="cfChart"></canvas>
    </div>
</div>

<style>
.site-stats {
    margin: 20px 0;
    padding: 15px;
    background: var(--entry);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-item {
    margin: 10px 0;
    font-size: 1.1em;
}

.stat-label {
    color: var(--secondary);
    margin-right: 10px;
}

.stat-value {
    color: var(--primary);
    font-weight: bold;
}

.chart-container {
    margin-top: 20px;
    height: 300px;
    width: 100%;
}

.dark .site-stats {
    background: var(--entry);
}
</style>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script src="/js/cf-analytics.js" defer></script>

|            功能            |  完成日期  |
| :------------------------: | :--------: |
|        基本结构完善        | 2023.05.30 |
|     托管于 Cloudflare      | 2023.05.31 |
| 基于 Cloudflare 的访问统计 | 2024.04.21 |
|       谷歌 seo 优化        | 2023.06.01 |
|          图片上传          | 2024.04.20 |
|          评论功能          | 2025.03.20 |
|          相册功能          |   待完成   |

<!-- 性能监控入口 -->
<div style="position: fixed; bottom: 20px; left: 20px; z-index: 9999;">
    <a href="/zh-cn/pages/performance/" style="display: block; width: 40px; height: 40px; background: rgba(0,0,0,0.1); border-radius: 50%; position: relative; transition: all 0.3s ease;">
        <svg style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 24px; height: 24px; fill: #666;" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
            <path d="M7 12h2v5H7zm4-7h2v12h-2zm4 3h2v9h-2z"/>
        </svg>
    </a>
    <style>
        a:hover {
            background: rgba(0,0,0,0.2) !important;
            transform: scale(1.1);
        }
    </style>
</div>

---

## 学习计划

- 计算机基础
  - 操作系统
  - 计算机网络
  - Linux 程序设计
  - Mysql 基础
  - 分布式系统设计（MIT 6.824）
- 进阶课程
  - STL 源码解析
  - 现代操作系统
  - TCP/IP 详解
  - 高性能 Mysql
  - Redis 设计与实现
  - 高性能服务器编程
