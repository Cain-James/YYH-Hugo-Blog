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

// 格式化资源大小
function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化加载时间
function formatTime(ms) {
    if (ms < 1) return '< 1ms';
    return ms.toFixed(1) + 'ms';
}

// 获取资源类型
function getResourceType(url) {
    const ext = url.split('.').pop().toLowerCase();
    const types = {
        'js': 'JavaScript',
        'css': 'CSS',
        'jpg': '图片',
        'jpeg': '图片',
        'png': '图片',
        'gif': '图片',
        'svg': '图片',
        'woff': '字体',
        'woff2': '字体',
        'ttf': '字体',
        'eot': '字体',
        'ico': '图标',
        'json': '数据',
        'xml': '数据'
    };
    return types[ext] || '其他';
}

// 更新资源列表
function updateResourcesList(resources) {
    const resourcesList = document.getElementById('resources-list');
    if (!resourcesList) return;

    // 按类型分组资源
    const groupedResources = {};
    resources.forEach(resource => {
        const type = getResourceType(resource.name);
        if (!groupedResources[type]) {
            groupedResources[type] = [];
        }
        groupedResources[type].push(resource);
    });

    // 生成HTML
    let html = '';
    for (const [type, resources] of Object.entries(groupedResources)) {
        html += `
            <div class="resource-group">
                <h3 class="resource-type">${type}</h3>
                <div class="resource-items">
                    ${resources.map(resource => `
                        <div class="resource-item">
                            <div class="resource-info">
                                <span class="resource-name">${resource.name.split('/').pop()}</span>
                                <span class="resource-size">${formatSize(resource.size * 1024)}</span>
                                <span class="resource-time">${formatTime(resource.loadTime)}</span>
                            </div>
                            <div class="resource-progress">
                                <div class="progress-bar" style="width: ${Math.min(resource.loadTime / 100, 100)}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    resourcesList.innerHTML = html;
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
        if (metrics.resources) {
            updateResourcesList(metrics.resources);
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

// 页面加载完成后执行一次（而非每 5 秒轮询）
if (document.readyState === 'complete') {
    updateMetrics();
} else {
    window.addEventListener('load', () => {
        updateMetrics();
    });
} 