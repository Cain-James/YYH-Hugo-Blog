// 初始化图表
let busuanziChart = null;
let pvData = [];
let uvData = [];
let labels = [];
const maxDataPoints = 30; // 最多显示30个数据点

// 格式化数字
function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + 'w';
    }
    return num.toString();
}

// 更新图表
function updateChart() {
    const ctx = document.getElementById('busuanziChart');
    const chartContainer = document.getElementById('chartContainer');
    
    if (!ctx) {
        console.warn('图表容器未找到');
        return;
    }
    
    // 如果图表已存在，销毁它
    if (busuanziChart) {
        busuanziChart.destroy();
    }

    // 创建新图表
    busuanziChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '访问量 (PV)',
                    data: pvData,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false
                },
                {
                    label: '访问人数 (UV)',
                    data: uvData,
                    borderColor: 'rgb(255, 99, 132)',
                    tension: 0.1,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatNumber(context.raw);
                        }
                    }
                }
            }
        }
    });

    // 显示图表容器
    if (chartContainer) {
        chartContainer.style.display = 'block';
    }
}

// 添加新数据点
function addDataPoint() {
    const pvElement = document.getElementById('busuanzi_value_site_pv');
    const uvElement = document.getElementById('busuanzi_value_site_uv');
    
    if (!pvElement || !uvElement) {
        console.warn('不蒜子统计元素未找到');
        return;
    }

    const pv = parseInt(pvElement.textContent.replace(/,/g, '')) || 0;
    const uv = parseInt(uvElement.textContent.replace(/,/g, '')) || 0;
    const now = new Date().toLocaleTimeString();

    // 确保数据是有效的数字
    if (isNaN(pv) || isNaN(uv)) {
        console.warn('无效的访问数据');
        return;
    }

    pvData.push(pv);
    uvData.push(uv);
    labels.push(now);

    // 保持数据点数量在限制内
    if (pvData.length > maxDataPoints) {
        pvData.shift();
        uvData.shift();
        labels.shift();
    }

    updateChart();
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    // 等待不蒜子统计加载完成
    const checkBusuanzi = setInterval(function() {
        const pvElement = document.getElementById('busuanzi_value_site_pv');
        const uvElement = document.getElementById('busuanzi_value_site_uv');
        
        if (pvElement && uvElement && pvElement.textContent !== '0' && uvElement.textContent !== '0') {
            clearInterval(checkBusuanzi);
            addDataPoint();
            // 每5分钟更新一次数据
            setInterval(addDataPoint, 5 * 60 * 1000);
        }
    }, 1000);
}); 