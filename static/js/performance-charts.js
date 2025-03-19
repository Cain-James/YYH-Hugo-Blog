// 创建图表
function createChart(elementId, label, color) {
    const ctx = document.getElementById(elementId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: label,
                data: [],
                borderColor: color,
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    display: false
                },
                x: {
                    display: false
                }
            }
        }
    });
}

// 初始化图表
const charts = {
    fcp: createChart('fcp-chart', 'FCP', '#2196F3'),
    lcp: createChart('lcp-chart', 'LCP', '#4CAF50'),
    fid: createChart('fid-chart', 'FID', '#FFC107'),
    cls: createChart('cls-chart', 'CLS', '#F44336')
};

// 更新图表数据
function updateChart(chart, value) {
    const now = new Date().toLocaleTimeString();
    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(value);
    
    // 保持最近 10 个数据点
    if (chart.data.labels.length > 10) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    
    chart.update();
}

// 定期更新性能指标
function updateMetrics() {
    if (window.performanceMonitor && window.performanceMonitor.metrics) {
        const metrics = window.performanceMonitor.metrics;
        
        // 更新核心 Web 指标
        if (metrics.fcp !== null) {
            document.getElementById('fcp-value').textContent = metrics.fcp.toFixed(2);
            updateChart(charts.fcp, metrics.fcp);
        }
        if (metrics.lcp !== null) {
            document.getElementById('lcp-value').textContent = metrics.lcp.toFixed(2);
            updateChart(charts.lcp, metrics.lcp);
        }
        if (metrics.fid !== null) {
            document.getElementById('fid-value').textContent = metrics.fid.toFixed(2);
            updateChart(charts.fid, metrics.fid);
        }
        if (metrics.cls !== null) {
            document.getElementById('cls-value').textContent = metrics.cls.toFixed(2);
            updateChart(charts.cls, metrics.cls);
        }
        
        // 更新页面加载性能
        if (metrics.dnsTime !== null) {
            document.getElementById('dns-time').textContent = metrics.dnsTime.toFixed(2);
        }
        if (metrics.tcpTime !== null) {
            document.getElementById('tcp-time').textContent = metrics.tcpTime.toFixed(2);
        }
        if (metrics.responseTime !== null) {
            document.getElementById('response-time').textContent = metrics.responseTime.toFixed(2);
        }
        if (metrics.domLoadTime !== null) {
            document.getElementById('dom-load-time').textContent = metrics.domLoadTime.toFixed(2);
        }
        if (metrics.loadTime !== null) {
            document.getElementById('total-load-time').textContent = metrics.loadTime.toFixed(2);
        }
        
        // 更新资源加载性能
        const resourcesList = document.getElementById('resources-list');
        if (resourcesList && metrics.resources) {
            resourcesList.innerHTML = metrics.resources
                .map(resource => `
                    <div class="resource-item">
                        <span class="resource-name">${resource.name}</span>
                        <span class="resource-size">${resource.size.toFixed(2)} KB</span>
                        <span class="resource-time">${resource.loadTime.toFixed(2)} ms</span>
                    </div>
                `)
                .join('');
        }
        
        // 更新错误日志
        const errorsList = document.getElementById('errors-list');
        if (errorsList && metrics.errors) {
            errorsList.innerHTML = metrics.errors
                .map(error => `
                    <div class="error-item">
                        <span class="error-type">${error.type}</span>
                        <span class="error-message">${error.message}</span>
                        <span class="error-time">${new Date(error.timestamp).toLocaleString()}</span>
                    </div>
                `)
                .join('');
        }
    }
}

// 每 5 秒更新一次数据
setInterval(updateMetrics, 5000); 