---
title: "Hugo添加不蒜子Busuanzi页面浏览次数与阅读数据统计"
date: 2023-09-23T11:19:08+08:00
lastmod: 2023-09-23T11:19:08+08:00
author: ChiAn Ye
categories:
# - 分类1
# - 分类2
tags:
  - 建站
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

为本站提供浏览统计功能

<!--more-->

【统计平台】：[不蒜子](http://busuanzi.ibruce.info/)

# .head

打开项目根目录找到主题安装的目录中 head.html 文件，添加不蒜子统计引入文件。
`head.html`文件目录路径：`$PATH:\myblog\themes\hugo-theme-mini\layouts\partials\head.html`

添加如下代码块：

```html
<!-- busuanzi -->
{{- if .Site.Params.busuanzi.enable -}}
<script
  async
  src="//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"
></script>
<meta name="referrer" content="no-referrer-when-downgrade" />
{{- end -}}
```

# .footer

站点底部公共位置显示用户总访问量和总访客数，`footer.html`文件一般和`head.html`文件处在同一个目录中。

`footer.html`文件目录路径：`$PATH:\myblog\themes\hugo-theme-mini\layouts\partials\footer.html`

添加如下代码块：

```html
<!-- busuanzi -->
{{ if .Site.Params.busuanzi.enable -}}
<div class="busuanzi-footer">
  <span id="busuanzi_container_site_pv">
    本站总访问量<span id="busuanzi_value_site_pv"></span>次
  </span>
  <span id="busuanzi_container_site_uv">
    本站访客数<span id="busuanzi_value_site_uv"></span>人次
  </span>
</div>
```

# .single

在文章详情页中增加文章阅读量。
`single.html`文件目录路径：`$PATH:\myblog\themes\hugo-theme-mini\layouts\_default\single.html`

添加如下代码块：

```html
<span class="split"> · </span>
<span>
  <span id="busuanzi_container_page_pv"
    >本文阅读量<span id="busuanzi_value_page_pv"></span>次</span
  >
</span>
```

# .config.yaml 配置

打开项目根目录`config.yaml`文件，配置网站统计属性，`enable: true`打开访问量统计，`enable: false`关闭访问量统计。

```yaml
# Site parameters
params:
  #网站统计
  busuanzi:
    enable: true
```
