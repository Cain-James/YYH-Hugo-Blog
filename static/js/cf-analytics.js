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
        console.log('开始获取数据...');
        
        // 使用 Cloudflare Worker 获取数据
        const response = await fetch('https://blog-analytics.finderyyh.workers.dev', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            mode: 'cors'
        });

        console.log('收到响应:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('收到的数据:', data);
        
        // 验证数据格式
        if (!data) {
            throw new Error('数据为空');
        }

        // 检查数据格式并转换
        let analyticsData = [];
        if (data.result && Array.isArray(data.result)) {
            analyticsData = data.result;
        } else if (Array.isArray(data)) {
            analyticsData = data;
        } else {
            console.error('数据格式:', data);
            throw new Error('数据格式不正确');
        }

        console.log('处理后的数据:', analyticsData);

        // 清空现有数据
        labels = [];
        pageviewsData = [];
        visitorsData = [];
        
        // 处理数据
        analyticsData.forEach(day => {
            console.log('处理数据项:', day);
            
            if (!day || typeof day !== 'object') {
                console.warn('无效的数据项:', day);
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

        console.log('处理完成的数据:', {
            labels,
            pageviewsData,
            visitorsData
        });

        // 确保有数据才更新显示
        if (labels.length > 0) {
            // 更新总访问量和访问人数
            const totalPageviews = pageviewsData.reduce((a, b) => a + b, 0);
            const totalVisitors = visitorsData.reduce((a, b) => a + b, 0);
            
            document.getElementById('cf-pageviews').textContent = formatNumber(totalPageviews);
            document.getElementById('cf-visitors').textContent = formatNumber(totalVisitors);

            updateChart();
        } else {
            throw new Error('没有可用的数据');
        }
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