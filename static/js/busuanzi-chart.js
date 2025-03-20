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
    
    try {
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
            console.log('图表初始化成功');
        }
    } catch (error) {
        console.error('图表初始化失败:', error);
    }
}

// 从 GA4 获取数据
async function fetchGA4Data() {
    try {
        // 获取最近30天的数据
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        // 使用 GA4 API 获取数据
        const response = await fetch('/api/ga4-stats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            })
        });

        if (!response.ok) {
            throw new Error('获取 GA4 数据失败');
        }

        const data = await response.json();
        
        // 处理数据
        data.forEach(day => {
            labels.push(new Date(day.date).toLocaleDateString());
            pvData.push(day.pageviews);
            uvData.push(day.users);
        });

        updateChart();
    } catch (error) {
        console.error('获取 GA4 数据失败:', error);
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，开始初始化图表');
    fetchGA4Data();
}); 