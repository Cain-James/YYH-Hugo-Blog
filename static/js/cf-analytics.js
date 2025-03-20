// 初始化图表
let cfChart = null;
let pageviewsData = [];
let visitorsData = [];
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
    const ctx = document.getElementById('cfChart');
    const chartContainer = document.getElementById('chartContainer');
    
    if (!ctx) {
        console.warn('图表容器未找到');
        return;
    }
    
    try {
        // 如果图表已存在，销毁它
        if (cfChart) {
            cfChart.destroy();
        }

        // 创建新图表
        cfChart = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '访问量 (PV)',
                        data: pageviewsData,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: '访问人数 (UV)',
                        data: visitorsData,
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
            console.log('图表初始化成功');
        }
    } catch (error) {
        console.error('图表初始化失败:', error);
    }
}

// 从 Cloudflare Worker 获取数据
async function fetchCFData() {
    try {
        // 使用 Cloudflare Worker 获取数据
        const response = await fetch('https://blog-analytics.finderyyh.workers.dev', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('获取数据失败');
        }

        const data = await response.json();
        
        // 处理数据
        data.result.forEach(day => {
            labels.push(new Date(day.date).toLocaleDateString());
            pageviewsData.push(day.pageviews);
            visitorsData.push(day.visitors);
        });

        // 更新总访问量和访问人数
        const totalPageviews = pageviewsData.reduce((a, b) => a + b, 0);
        const totalVisitors = visitorsData.reduce((a, b) => a + b, 0);
        
        document.getElementById('cf-pageviews').textContent = formatNumber(totalPageviews);
        document.getElementById('cf-visitors').textContent = formatNumber(totalVisitors);

        updateChart();
    } catch (error) {
        console.error('获取数据失败:', error);
        document.getElementById('cf-pageviews').textContent = '获取失败';
        document.getElementById('cf-visitors').textContent = '获取失败';
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，开始初始化图表');
    fetchCFData();
}); 