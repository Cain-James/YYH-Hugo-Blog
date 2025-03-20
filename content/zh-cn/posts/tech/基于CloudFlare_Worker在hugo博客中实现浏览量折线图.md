---
title: "基于 Cloudflare Worker 在 Hugo 博客中实现浏览量折线图"
date: 2025-03-20T12:05:32+08:00
lastmod: 2025-03-20T12:05:32+08:00
author: ChiAn Ye
categories:
# categories暂时不用
# - 分类1
# - 分类2
tags:
  - 数据可视化
  - Cloudflare
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

## 前言

本次计划实现博客浏览量可视化，对于使用 Hugo 搭建的静态博客，由于没有后端服务器，实现实时访问统计一直是一个挑战。本文将介绍如何利用 Cloudflare Worker 和 Chart.js 在 Hugo 博客中实现实时浏览量统计和可视化。

## 技术方案

### 1. 为什么选择 Cloudflare Worker？

- **无服务器架构**：完全符合 Hugo 静态博客的特性
- **全球 CDN**：访问速度快，延迟低
- **免费额度**：对于个人博客来说完全够用
- **安全性**：Token 存储在 Worker 中，不在前端暴露

### 2. 实现步骤

#### 2.1 创建 Cloudflare Worker

1. 登录 Cloudflare 控制台
2. 进入 "Workers & Pages"
3. 点击 "Create Application"
4. 选择 "Create Worker"
5. 给 Worker 起个名字，如 "blog-analytics"

#### 2.2 编写 Worker 代码

```javascript
export default {
  async fetch(request, env) {
    // 允许的域名列表
    const allowedOrigins = [
      "https://your-domain.com",
      "http://localhost:xxxx", // 本地开发环境
    ];

    // 获取请求来源
    const origin = request.headers.get("Origin");

    // 检查是否是允许的域名
    const isAllowedOrigin = allowedOrigins.includes(origin);

    // 设置 CORS 头
    const corsHeaders = {
      "Access-Control-Allow-Origin": isAllowedOrigin
        ? origin
        : allowedOrigins[0],
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    };

    // 处理 OPTIONS 请求
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    try {
      // 获取最近30天的数据
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      // 使用环境变量中的 Token 和 Zone ID
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${
          env.ZONE_ID
        }/analytics/dashboard?since=${startDate.toISOString()}&until=${endDate.toISOString()}&metrics=pageviews,visitors`,
        {
          headers: {
            Authorization: `Bearer ${env.API_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Cloudflare API error: ${response.status}`);
      }

      const data = await response.json();

      // 确保返回正确的数据格式
      const formattedData = {
        result: data.result.map((item) => ({
          date: item.date,
          pageviews: parseInt(item.pageviews) || 0,
          visitors: parseInt(item.visitors) || 0,
        })),
      };

      return new Response(JSON.stringify(formattedData), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response(JSON.stringify({ error: "获取数据失败" }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }
  },
};
```

#### 2.3 配置 Worker 环境变量

1. 在 Worker 设置中添加环境变量：
   - `ZONE_ID`：您的 Cloudflare Zone ID
   - `API_TOKEN`：具有 Analytics 读取权限的 API Token

#### 2.4 在 Hugo 博客中添加统计展示

1. 在 `about.md` 中添加统计展示区域：

```markdown
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
```

2. 创建 `static/js/cf-analytics.js` 文件：

```javascript
// 初始化图表
let cfChart = null;
let pageviewsData = [];
let visitorsData = [];
let labels = [];
const maxDataPoints = 30; // 最多显示30个数据点

// 格式化数字
function formatNumber(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "w";
  }
  return num.toString();
}

// 更新图表
function updateChart() {
  const ctx = document.getElementById("cfChart");
  const chartContainer = document.getElementById("chartContainer");

  if (!ctx) {
    console.warn("图表容器未找到");
    return;
  }

  try {
    // 如果图表已存在，销毁它
    if (cfChart) {
      cfChart.destroy();
    }

    // 创建新图表
    cfChart = new Chart(ctx.getContext("2d"), {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "访问量 (PV)",
            data: pageviewsData,
            borderColor: "rgb(75, 192, 192)",
            tension: 0.1,
            fill: false,
          },
          {
            label: "访问人数 (UV)",
            data: visitorsData,
            borderColor: "rgb(255, 99, 132)",
            tension: 0.1,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return formatNumber(value);
              },
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: function (context) {
                return context.dataset.label + ": " + formatNumber(context.raw);
              },
            },
          },
        },
      },
    });

    // 显示图表容器
    if (chartContainer) {
      chartContainer.style.display = "block";
      console.log("图表初始化成功");
    }
  } catch (error) {
    console.error("图表初始化失败:", error);
  }
}

// 从 Cloudflare Worker 获取数据
async function fetchCFData() {
  try {
    console.log("开始获取数据...");

    // 使用 Cloudflare Worker 获取数据
    const response = await fetch(
      "https://your-worker-name.your-subdomain.workers.dev",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
      }
    );

    console.log("收到响应:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("收到的数据:", data);

    // 验证数据格式
    if (!data) {
      throw new Error("数据为空");
    }

    // 检查数据格式并转换
    let analyticsData = [];
    if (data.result && Array.isArray(data.result)) {
      analyticsData = data.result;
    } else if (Array.isArray(data)) {
      analyticsData = data;
    } else {
      console.error("数据格式:", data);
      throw new Error("数据格式不正确");
    }

    console.log("处理后的数据:", analyticsData);

    // 清空现有数据
    labels = [];
    pageviewsData = [];
    visitorsData = [];

    // 处理数据
    analyticsData.forEach((day) => {
      console.log("处理数据项:", day);

      if (!day || typeof day !== "object") {
        console.warn("无效的数据项:", day);
        return;
      }

      const pageviews = parseInt(day.pageviews) || 0;
      const visitors = parseInt(day.visitors) || 0;
      const date = day.date;

      if (date) {
        labels.push(new Date(date).toLocaleDateString());
        pageviewsData.push(pageviews);
        visitorsData.push(visitors);
      }
    });

    console.log("处理完成的数据:", {
      labels,
      pageviewsData,
      visitorsData,
    });

    // 确保有数据才更新显示
    if (labels.length > 0) {
      // 更新总访问量和访问人数
      const totalPageviews = pageviewsData.reduce((a, b) => a + b, 0);
      const totalVisitors = visitorsData.reduce((a, b) => a + b, 0);

      document.getElementById("cf-pageviews").textContent =
        formatNumber(totalPageviews);
      document.getElementById("cf-visitors").textContent =
        formatNumber(totalVisitors);

      updateChart();
    } else {
      throw new Error("没有可用的数据");
    }
  } catch (error) {
    console.error("获取数据失败:", error);
    document.getElementById("cf-pageviews").textContent = "获取失败";
    document.getElementById("cf-visitors").textContent = "获取失败";
  }
}

// 初始化
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM加载完成，开始初始化图表");
  fetchCFData();
});
```

## 注意事项

1. **安全性**：

   - API Token 存储在 Worker 中，不在前端暴露
   - 使用 CORS 限制只允许特定域名访问
   - 定期轮换 API Token

2. **性能优化**：

   - 使用 Chart.js 的响应式设计
   - 数据缓存和更新策略
   - 错误处理和降级方案

3. **调试建议**：
   - 使用浏览器开发者工具查看网络请求
   - 检查 Worker 日志排查问题
   - 本地开发时使用模拟数据

## 总结

通过 Cloudflare Worker 和 Chart.js，我们成功地在 Hugo 静态博客中实现了实时浏览量统计和可视化。这个方案具有以下优点：

1. 完全无服务器，符合静态博客的特性
2. 数据准确可靠，直接使用 Cloudflare 的统计数据
3. 加载速度快，利用 Cloudflare 的全球 CDN
4. 安全性好，敏感信息存储在 Worker 中

希望这篇文章对您有所帮助！如果您有任何问题或建议，欢迎在评论区讨论。
