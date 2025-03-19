---
title: "性能监控"
date: 2024-01-01
type: "page"
layout: "performance"
head: |
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="/js/performance.js" defer></script>
  <script src="/js/performance-charts.js" defer></script>
---

{{< rawhtml >}}

<div class="performance-container">
    <div class="metrics-section">
        <h2>核心 Web 指标</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>FCP (First Contentful Paint)</h3>
                <div class="metric-value">
                    <span id="fcp-value">-</span>
                    <span class="unit">ms</span>
                </div>
                <div class="metric-target">目标: < 1800ms</div>
                <canvas id="fcp-chart" height="100"></canvas>
            </div>
            <div class="metric-card">
                <h3>LCP (Largest Contentful Paint)</h3>
                <div class="metric-value">
                    <span id="lcp-value">-</span>
                    <span class="unit">ms</span>
                </div>
                <div class="metric-target">目标: < 2500ms</div>
                <canvas id="lcp-chart" height="100"></canvas>
            </div>
            <div class="metric-card">
                <h3>FID (First Input Delay)</h3>
                <div class="metric-value">
                    <span id="fid-value">-</span>
                    <span class="unit">ms</span>
                </div>
                <div class="metric-target">目标: < 100ms</div>
                <canvas id="fid-chart" height="100"></canvas>
            </div>
            <div class="metric-card">
                <h3>CLS (Cumulative Layout Shift)</h3>
                <div class="metric-value">
                    <span id="cls-value">-</span>
                    <span class="unit">-</span>
                </div>
                <div class="metric-target">目标: < 0.1</div>
                <canvas id="cls-chart" height="100"></canvas>
            </div>
        </div>
    </div>

    <div class="metrics-section">
        <h2>页面加载性能</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>DNS 解析时间</h3>
                <div class="metric-value">
                    <span id="dns-time">-</span>
                    <span class="unit">ms</span>
                </div>
            </div>
            <div class="metric-card">
                <h3>TCP 连接时间</h3>
                <div class="metric-value">
                    <span id="tcp-time">-</span>
                    <span class="unit">ms</span>
                </div>
            </div>
            <div class="metric-card">
                <h3>服务器响应时间</h3>
                <div class="metric-value">
                    <span id="response-time">-</span>
                    <span class="unit">ms</span>
                </div>
            </div>
            <div class="metric-card">
                <h3>DOM 加载时间</h3>
                <div class="metric-value">
                    <span id="dom-load-time">-</span>
                    <span class="unit">ms</span>
                </div>
            </div>
            <div class="metric-card">
                <h3>总加载时间</h3>
                <div class="metric-value">
                    <span id="total-load-time">-</span>
                    <span class="unit">ms</span>
                </div>
            </div>
        </div>
    </div>

    <div class="metrics-section">
        <h2>资源加载性能</h2>
        <div class="resources-list" id="resources-list">
            <!-- 资源列表将通过 JavaScript 动态填充 -->
        </div>
    </div>

    <div class="metrics-section">
        <h2>错误监控</h2>
        <div class="errors-list" id="errors-list">
            <!-- 错误列表将通过 JavaScript 动态填充 -->
        </div>
    </div>

</div>

<style>
.performance-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.metrics-section {
    margin-bottom: 40px;
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.metrics-section h2 {
    margin-bottom: 20px;
    color: #333;
    font-size: 1.5em;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

.metric-card {
    background: #f8f9fa;
    border-radius: 6px;
    padding: 15px;
    text-align: center;
}

.metric-card h3 {
    margin: 0 0 10px 0;
    color: #666;
    font-size: 1em;
}

.metric-value {
    font-size: 1.8em;
    font-weight: bold;
    color: #2196F3;
    margin: 10px 0;
}

.metric-target {
    font-size: 0.9em;
    color: #666;
    margin: 5px 0;
}

.metric-unit {
    font-size: 0.9em;
    color: #666;
}

.metric-chart {
    height: 60px;
    margin-top: 10px;
    background: #e3f2fd;
    border-radius: 4px;
    position: relative;
    overflow: hidden;
}

.resources-list, .errors-list {
    max-height: 300px;
    overflow-y: auto;
}

.resource-item, .error-item {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    border-bottom: 1px solid #eee;
}

.resource-item:last-child, .error-item:last-child {
    border-bottom: none;
}

.error-item {
    color: #d32f2f;
}

.error-time {
    font-size: 0.9em;
    color: #666;
}

@media (max-width: 768px) {
    .metrics-grid {
        grid-template-columns: 1fr;
    }
    
    .performance-container {
        padding: 10px;
    }
}

.resources-list {
    max-height: 400px;
    overflow-y: auto;
}

.resource-group {
    margin-bottom: 20px;
}

.resource-type {
    font-size: 1.1em;
    color: #333;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid #eee;
}

.resource-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.resource-item {
    background: #f8f9fa;
    border-radius: 4px;
    padding: 10px;
}

.resource-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
}

.resource-name {
    flex: 1;
    color: #333;
    font-size: 0.9em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.resource-size {
    color: #666;
    font-size: 0.9em;
    margin: 0 15px;
}

.resource-time {
    color: #2196F3;
    font-size: 0.9em;
    font-weight: 500;
}

.resource-progress {
    height: 4px;
    background: #e3f2fd;
    border-radius: 2px;
    overflow: hidden;
}

.progress-bar {
    height: 100%;
    background: #2196F3;
    border-radius: 2px;
    transition: width 0.3s ease;
}
</style>

{{< /rawhtml >}}
