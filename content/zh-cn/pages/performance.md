---
title: "性能监控"
date: 2024-01-01
type: "page"
layout: "performance"
---

{{< rawhtml >}}

<div class="performance-container">
    <div class="metrics-section">
        <h2>网站性能指标</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>首次内容绘制 (FCP)</h3>
                <div class="metric-value" id="fcp-value">-</div>
                <div class="metric-target">目标: < 1.8s</div>
            </div>
            <div class="metric-card">
                <h3>最大内容绘制 (LCP)</h3>
                <div class="metric-value" id="lcp-value">-</div>
                <div class="metric-target">目标: < 2.5s</div>
            </div>
            <div class="metric-card">
                <h3>首次输入延迟 (FID)</h3>
                <div class="metric-value" id="fid-value">-</div>
                <div class="metric-target">目标: < 100ms</div>
            </div>
            <div class="metric-card">
                <h3>累积布局偏移 (CLS)</h3>
                <div class="metric-value" id="cls-value">-</div>
                <div class="metric-target">目标: < 0.1</div>
            </div>
        </div>
    </div>

    <div class="metrics-section">
        <h2>页面加载性能</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>DNS 解析时间</h3>
                <div class="metric-value" id="dns-value">-</div>
            </div>
            <div class="metric-card">
                <h3>TCP 连接时间</h3>
                <div class="metric-value" id="tcp-value">-</div>
            </div>
            <div class="metric-card">
                <h3>服务器响应时间</h3>
                <div class="metric-value" id="response-value">-</div>
            </div>
            <div class="metric-card">
                <h3>DOM 加载时间</h3>
                <div class="metric-value" id="dom-value">-</div>
            </div>
            <div class="metric-card">
                <h3>页面完全加载时间</h3>
                <div class="metric-value" id="load-value">-</div>
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
        <div class="error-list" id="error-list">
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
    background: var(--entry);
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.metrics-section h2 {
    margin-bottom: 20px;
    color: var(--primary);
    font-size: 1.5em;
}

.metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}

.metric-card {
    background: var(--entry);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 15px;
    text-align: center;
}

.metric-card h3 {
    margin-bottom: 10px;
    color: var(--secondary);
    font-size: 1.1em;
}

.metric-value {
    font-size: 1.5em;
    font-weight: bold;
    color: var(--primary);
    margin: 10px 0;
}

.metric-target {
    font-size: 0.9em;
    color: var(--secondary);
}

.resources-list, .error-list {
    max-height: 300px;
    overflow-y: auto;
    background: var(--entry);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 15px;
}

.error-item {
    color: #dc3545;
    margin-bottom: 10px;
    padding: 10px;
    background: rgba(220, 53, 69, 0.1);
    border-radius: 4px;
}

.resource-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    padding: 8px;
    background: var(--entry);
    border-radius: 4px;
}

@media (max-width: 768px) {
    .metrics-grid {
        grid-template-columns: 1fr;
    }
    
    .performance-container {
        padding: 10px;
    }
}
</style>

<script>
function updateMetrics() {
    if (window.performanceMonitor && window.performanceMonitor.metrics) {
        const metrics = window.performanceMonitor.metrics;
        
        // 更新核心 Web 指标
        document.getElementById('fcp-value').textContent = metrics.fcp ? `${metrics.fcp.toFixed(2)}s` : '-';
        document.getElementById('lcp-value').textContent = metrics.lcp ? `${metrics.lcp.toFixed(2)}s` : '-';
        document.getElementById('fid-value').textContent = metrics.fid ? `${metrics.fid.toFixed(2)}ms` : '-';
        document.getElementById('cls-value').textContent = metrics.cls ? metrics.cls.toFixed(3) : '-';
        
        // 更新页面加载性能
        document.getElementById('dns-value').textContent = metrics.dnsTime ? `${metrics.dnsTime.toFixed(2)}ms` : '-';
        document.getElementById('tcp-value').textContent = metrics.tcpTime ? `${metrics.tcpTime.toFixed(2)}ms` : '-';
        document.getElementById('response-value').textContent = metrics.responseTime ? `${metrics.responseTime.toFixed(2)}ms` : '-';
        document.getElementById('dom-value').textContent = metrics.domLoadTime ? `${metrics.domLoadTime.toFixed(2)}ms` : '-';
        document.getElementById('load-value').textContent = metrics.loadTime ? `${metrics.loadTime.toFixed(2)}ms` : '-';
        
        // 更新资源列表
        const resourcesList = document.getElementById('resources-list');
        resourcesList.innerHTML = '';
        metrics.resources.forEach(resource => {
            const div = document.createElement('div');
            div.className = 'resource-item';
            div.innerHTML = `
                <span>${resource.name}</span>
                <span>${resource.size.toFixed(2)}KB</span>
                <span>${resource.loadTime.toFixed(2)}ms</span>
            `;
            resourcesList.appendChild(div);
        });
        
        // 更新错误列表
        const errorList = document.getElementById('error-list');
        errorList.innerHTML = '';
        metrics.errors.forEach(error => {
            const div = document.createElement('div');
            div.className = 'error-item';
            div.textContent = `${error.message} (${error.type})`;
            errorList.appendChild(div);
        });
    }
}

// 每 5 秒更新一次数据
setInterval(updateMetrics, 5000);
updateMetrics(); // 立即更新一次
</script>

{{< /rawhtml >}}
