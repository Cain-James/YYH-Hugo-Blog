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

# busuanzi 无法正常显示访问量的问题

打开 F12，具体表现为访问量显示一小会后，不蒜子部分源码的 style 从 "display: inline;" 替换为了 "display: none;"
我的做法是将不蒜子的 js 插件保存到本地：`assets\js\busuanzi.pure.mini.js`，并修改`.head`步骤中的引入方式，改为引入本地文件；同时修改该 js 文件为：

```js
var bszCaller, bszTag;
!(function () {
  var c,
    d,
    e,
    a = !1,
    b = [];
  (ready = function (c) {
    return (
      a ||
      "interactive" === document.readyState ||
      "complete" === document.readyState
        ? c.call(document)
        : b.push(function () {
            return c.call(this);
          }),
      this
    );
  }),
    (d = function () {
      for (var a = 0, c = b.length; c > a; a++) b[a].apply(document);
      b = [];
    }),
    (e = function () {
      a ||
        ((a = !0),
        d.call(window),
        document.removeEventListener
          ? document.removeEventListener("DOMContentLoaded", e, !1)
          : document.attachEvent &&
            (document.detachEvent("onreadystatechange", e),
            window == window.top && (clearInterval(c), (c = null))));
    }),
    document.addEventListener
      ? document.addEventListener("DOMContentLoaded", e, !1)
      : document.attachEvent &&
        (document.attachEvent("onreadystatechange", function () {
          /loaded|complete/.test(document.readyState) && e();
        }),
        window == window.top &&
          (c = setInterval(function () {
            try {
              a || document.documentElement.doScroll("left");
            } catch (b) {
              return;
            }
            e();
          }, 5)));
})(),
  (bszCaller = {
    fetch: function (a, b) {
      var c = "BusuanziCallback_" + Math.floor(1099511627776 * Math.random());
      (window[c] = this.evalCall(b)),
        (a = a.replace("=BusuanziCallback", "=" + c)),
        (scriptTag = document.createElement("SCRIPT")),
        (scriptTag.type = "text/javascript"),
        (scriptTag.defer = !0),
        (scriptTag.src = a),
        (scriptTag.referrerPolicy = "no-referrer-when-downgrade"),
        document.getElementsByTagName("HEAD")[0].appendChild(scriptTag);
    },
    evalCall: function (a) {
      return function (b) {
        ready(function () {
          try {
            a(b), scriptTag.parentElement.removeChild(scriptTag);
          } catch (c) {
            bszTag.hides();
          }
        });
      };
    },
  }),
  bszCaller.fetch(
    "//busuanzi.ibruce.info/busuanzi?jsonpCallback=BusuanziCallback",
    function (a) {
      bszTag.texts(a), bszTag.shows();
    }
  ),
  (bszTag = {
    bszs: ["site_pv", "page_pv", "site_uv"],
    texts: function (a) {
      this.bszs.map(function (b) {
        var c = document.getElementById("busuanzi_value_" + b);
        c && (c.innerHTML = a[b]);
      });
    },
    hides: function () {
      this.bszs.map(function (a) {
        var b = document.getElementById("busuanzi_container_" + a);
        b && (b.style.display = "");
      });
    },
    shows: function () {
      this.bszs.map(function (a) {
        var b = document.getElementById("busuanzi_container_" + a);
        b && (b.style.display = "inline");
      });
    },
  });
```
