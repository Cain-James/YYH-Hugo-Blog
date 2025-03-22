// 初始化图表
let cfChart = null;
let pageviewsData = [];
let visitorsData = [];
let labels = [];
const maxDataPoints = 365; // 最大支持显示365天数据
let currentRange = 30; // 默认显示30天

// 格式化数字
function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + 'w';
    }
    return num.toString();
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// 按月聚合数据
function aggregateDataByMonth(data, labels) {
    const monthlyData = {};
    
    // 遍历所有数据点
    data.forEach((value, index) => {
        const date = new Date(labels[index]);
        if (isNaN(date.getTime())) {
            console.warn('无效日期:', labels[index]);
            return;
        }
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                total: 0,
                count: 0,
                date: date
            };
        }
        
        monthlyData[monthKey].total += value;
        monthlyData[monthKey].count += 1;
    });
    
    // 转换为数组并排序
    const sortedData = Object.entries(monthlyData)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, data]) => {
            const [year, month] = key.split('-');
            return {
                value: data.total,
                label: `${year}年${month}月`
            };
        });
    
    return {
        values: sortedData.map(d => d.value),
        labels: sortedData.map(d => d.label)
    };
}

// 按半月聚合数据
function aggregateDataByHalfMonth(data, labels) {
    const halfMonthlyData = {};
    
    // 遍历所有数据点
    data.forEach((value, index) => {
        const date = labels[index];
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            console.warn('无效日期:', date);
            return;
        }
        
        // 判断是上半月还是下半月
        const isFirstHalf = date.getDate() <= 15;
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const halfMonthKey = `${year}-${String(month).padStart(2, '0')}-${isFirstHalf ? '1' : '2'}`;
        
        if (!halfMonthlyData[halfMonthKey]) {
            halfMonthlyData[halfMonthKey] = {
                total: 0,
                count: 0,
                year: year,
                month: month,
                isFirstHalf: isFirstHalf,
                key: halfMonthKey
            };
        }
        
        halfMonthlyData[halfMonthKey].total += value;
        halfMonthlyData[halfMonthKey].count += 1;
    });
    
    // 转换为数组并排序
    const sortedEntries = Object.entries(halfMonthlyData)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
    
    const aggregatedValues = [];
    const aggregatedLabels = [];
    const aggregatedKeys = [];
    
    sortedEntries.forEach(([key, data]) => {
        aggregatedValues.push(Math.round(data.total));
        aggregatedLabels.push(`${data.year}年${data.month}月${data.isFirstHalf ? '上' : '下'}`);
        aggregatedKeys.push(key);
    });
    
    return {
        values: aggregatedValues,
        labels: aggregatedLabels,
        keys: aggregatedKeys
    };
}

// 计算移动平均趋势线
function calculateTrendLine(data, period = 7) {
    const trendLine = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            trendLine.push(null);
            continue;
        }
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j];
        }
        trendLine.push(sum / period);
    }
    return trendLine;
}

// 计算优化后的Y轴最大值
function calculateOptimalYMax(maxValue) {
    // 将最大值乘以1.2并向上取整到10的倍数
    const scaledMax = Math.ceil(maxValue * 1.2);
    const roundedMax = Math.ceil(scaledMax / 10) * 10;
    
    // 计算合适的刻度间隔
    let interval = Math.ceil(roundedMax / 5); // 默认5个刻度
    interval = Math.ceil(interval / 10) * 10; // 向上取整到10的倍数
    
    // 确保最大值是间隔的倍数
    return Math.ceil(roundedMax / interval) * interval;
}

// 初始化日期选择器
function initializeDatePickers() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - currentRange);
    
    document.getElementById('startDate').value = formatDate(startDate);
    document.getElementById('endDate').value = formatDate(endDate);
}

// 更新按钮状态
function updateButtonStates(activeDays) {
    document.querySelectorAll('.range-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.days == activeDays) {
            btn.classList.add('active');
        }
    });
}

// 设置日期范围
async function setDateRange(days) {
    try {
        currentRange = days;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        document.getElementById('startDate').value = formatDate(startDate);
        document.getElementById('endDate').value = formatDate(endDate);
        
        updateButtonStates(days);
        
        // 显示加载状态
        document.getElementById('cf-pageviews').textContent = '加载中...';
        document.getElementById('cf-visitors').textContent = '加载中...';
        
        // 等待数据获取完成
        await fetchCFData(startDate, endDate);
        
        console.log('日期范围更新完成:', days, '天');
    } catch (error) {
        console.error('设置日期范围失败:', error);
        document.getElementById('cf-pageviews').textContent = '获取失败';
        document.getElementById('cf-visitors').textContent = '获取失败';
    }
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
        if (cfChart) {
            cfChart.destroy();
        }

        let displayData = {
            labels: [...labels],
            pageviews: [...pageviewsData],
            visitors: [...visitorsData]
        };

        // 根据时间范围选择不同的聚合方式
        if (currentRange === 365) {
            const pvMonthly = aggregateDataByMonth(pageviewsData, labels);
            const uvMonthly = aggregateDataByMonth(visitorsData, labels);
            displayData = {
                labels: pvMonthly.labels,
                pageviews: pvMonthly.values,
                visitors: uvMonthly.values
            };
        } else if (currentRange === 180) {
            const pvHalfMonthly = aggregateDataByHalfMonth(pageviewsData, labels);
            const uvHalfMonthly = aggregateDataByHalfMonth(visitorsData, labels);
            
            // 确保两个数据集使用相同的标签顺序
            const allKeys = new Set();
            if (pvHalfMonthly.keys) {
                pvHalfMonthly.keys.forEach(key => allKeys.add(key));
            }
            if (uvHalfMonthly.keys) {
                uvHalfMonthly.keys.forEach(key => allKeys.add(key));
            }
            const sortedKeys = Array.from(allKeys).sort();
            
            const mergedData = {
                labels: [],
                pageviews: [],
                visitors: []
            };
            
            sortedKeys.forEach(key => {
                const pvIndex = pvHalfMonthly.keys ? pvHalfMonthly.keys.indexOf(key) : -1;
                const uvIndex = uvHalfMonthly.keys ? uvHalfMonthly.keys.indexOf(key) : -1;
                
                // 使用相同的标签
                if (pvIndex !== -1) {
                    mergedData.labels.push(pvHalfMonthly.labels[pvIndex]);
                } else if (uvIndex !== -1) {
                    mergedData.labels.push(uvHalfMonthly.labels[uvIndex]);
                }
                
                // 填充数据，如果某个时间点没有数据则使用0
                mergedData.pageviews.push(pvIndex !== -1 ? pvHalfMonthly.values[pvIndex] : 0);
                mergedData.visitors.push(uvIndex !== -1 ? uvHalfMonthly.values[uvIndex] : 0);
            });
            
            displayData = mergedData;
        }

        // 找出最大值和对应的标签
        const maxPV = Math.max(...displayData.pageviews);
        const maxUV = Math.max(...displayData.visitors);
        const maxPVIndex = displayData.pageviews.indexOf(maxPV);
        const maxUVIndex = displayData.visitors.indexOf(maxUV);

        // 计算优化后的Y轴最大值
        const yAxisMax = calculateOptimalYMax(Math.max(maxPV, maxUV));

        // 创建渐变
        const createGradient = (ctx, color, alpha) => {
            const gradient = ctx.createLinearGradient(0, ctx.canvas.height, 0, 0);
            gradient.addColorStop(0, `rgba(${color}, 0)`);
            gradient.addColorStop(1, `rgba(${color}, ${alpha})`);
            return gradient;
        };

        // 配置标注点
        const annotations = {};
        
        // 为PV配置标注点
        if (maxPVIndex >= 0 && maxPVIndex < displayData.labels.length) {
            annotations.maxPVPoint = {
                type: 'point',
                xValue: displayData.labels[maxPVIndex],
                yValue: maxPV,
                backgroundColor: 'rgba(75, 192, 192, 0.25)',
                borderColor: 'rgb(75, 192, 192)',
                borderWidth: 2,
                radius: 4,
                label: {
                    content: '最高: ' + formatNumber(maxPV),
                    enabled: true,
                    position: 'top',
                    yAdjust: -6
                }
            };
        }
        
        // 为UV配置标注点
        if (maxUVIndex >= 0 && maxUVIndex < displayData.labels.length) {
            annotations.maxUVPoint = {
                type: 'point',
                xValue: displayData.labels[maxUVIndex],
                yValue: maxUV,
                backgroundColor: 'rgba(255, 99, 132, 0.25)',
                borderColor: 'rgb(255, 99, 132)',
                borderWidth: 2,
                radius: 4,
                label: {
                    content: '最高: ' + formatNumber(maxUV),
                    enabled: true,
                    position: 'top',
                    yAdjust: -6
                }
            };
        }

        cfChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: displayData.labels,
                datasets: [
                    {
                        label: '访问量 (PV)',
                        data: displayData.pageviews,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: function(context) {
                            const chart = context.chart;
                            const {ctx, chartArea} = chart;
                            if (!chartArea) return null;
                            return createGradient(ctx, '75, 192, 192', 0.1);
                        },
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2.5,
                        pointRadius: currentRange <= 30 ? 3 : 
                                   currentRange <= 180 ? 2 : 1,
                        pointHoverRadius: currentRange <= 30 ? 6 : 
                                        currentRange <= 180 ? 4 : 3,
                        pointBackgroundColor: 'rgb(75, 192, 192)'
                    },
                    {
                        label: '访问人数 (UV)',
                        data: displayData.visitors,
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: function(context) {
                            const chart = context.chart;
                            const {ctx, chartArea} = chart;
                            if (!chartArea) return null;
                            return createGradient(ctx, '255, 99, 132', 0.1);
                        },
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2.5,
                        pointRadius: currentRange <= 30 ? 3 : 
                                   currentRange <= 180 ? 2 : 1,
                        pointHoverRadius: currentRange <= 30 ? 6 : 
                                        currentRange <= 180 ? 4 : 3,
                        pointBackgroundColor: 'rgb(255, 99, 132)'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: currentRange > 180 ? 45 : 0,
                            autoSkip: true,
                            maxTicksLimit: currentRange > 180 ? 12 : 31
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        max: yAxisMax,
                        ticks: {
                            stepSize: yAxisMax / 5,
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
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 6,
                            boxHeight: 6,
                            padding: 20
                        }
                    },
                    annotation: {
                        clip: false,
                        common: {
                            drawTime: 'afterDatasetsDraw'
                        },
                        annotations: annotations
                    },
                    zoom: {
                        pan: {
                            enabled: true,
                            mode: 'x'
                        },
                        zoom: {
                            wheel: {
                                enabled: true,
                                modifierKey: 'ctrl'
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'x'
                        }
                    }
                }
            }
        });

        if (chartContainer) {
            chartContainer.style.display = 'block';
            console.log('图表初始化成功');
        }
    } catch (error) {
        console.error('图表初始化失败:', error);
    }
}

// 从 Cloudflare Worker 获取数据
async function fetchCFData(startDate = null, endDate = null) {
    try {
        console.log('开始获取数据...');
        
        // 如果没有提供日期，使用当前选择的范围
        if (!startDate || !endDate) {
            endDate = new Date();
            startDate = new Date();
            startDate.setDate(startDate.getDate() - currentRange);
        }
        
        // 使用本地测试数据（如果是本地开发环境）
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('本地开发环境，使用模拟数据');
            return useMockData(startDate, endDate);
        }
        
        // 构建 API URL
        const apiUrl = new URL('https://blog-analytics.finderyyh.workers.dev');
        apiUrl.searchParams.append('start', formatDate(startDate));
        apiUrl.searchParams.append('end', formatDate(endDate));
        
        console.log('请求URL:', apiUrl.toString());
        
        const response = await fetch(apiUrl, {
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

        // 处理数据
        processAnalyticsData(analyticsData);
        
    } catch (error) {
        console.error('获取数据失败:', error);
        document.getElementById('cf-pageviews').textContent = '获取失败';
        document.getElementById('cf-visitors').textContent = '获取失败';
        
        // 如果失败则使用模拟数据（在本地开发和生产环境）
        useMockData(startDate, endDate);
        
        throw error;
    }
}

// 使用模拟数据以便本地开发测试
function useMockData(startDate, endDate) {
    console.log('使用模拟数据');
    
    // 生成日期区间
    const days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const mockData = [];
    
    for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        // 随机生成页面浏览量和访客数
        const pageviews = Math.floor(Math.random() * 100) + 50;
        const visitors = Math.floor(Math.random() * 30) + 10;
        
        mockData.push({
            date: formatDate(date),
            pageviews: pageviews,
            visitors: visitors
        });
    }
    
    // 处理模拟数据
    processAnalyticsData(mockData);
    
    return mockData;
}

// 处理从API获取的数据
function processAnalyticsData(analyticsData) {
    // 清空现有数据
    const tempLabels = [];
    const tempPageviewsData = [];
    const tempVisitorsData = [];
    
    // 处理数据
    analyticsData.forEach(day => {
        if (!day || typeof day !== 'object') {
            console.warn('无效的数据项:', day);
            return;
        }

        const pageviews = parseInt(day.pageviews) || 0;
        const visitors = parseInt(day.visitors) || 0;
        const date = day.date;

        if (date) {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
                tempLabels.push(parsedDate);
                tempPageviewsData.push(pageviews);
                tempVisitorsData.push(visitors);
            } else {
                console.warn('无效日期格式:', date);
            }
        }
    });

    if (tempLabels.length === 0) {
        throw new Error('没有有效的数据点');
    }

    // 修改日期排序逻辑
    const sortedIndices = tempLabels.map((_, i) => i).sort((a, b) => tempLabels[a] - tempLabels[b]);
    
    // 根据不同时间范围格式化日期显示
    if (currentRange <= 30) {
        labels = sortedIndices.map(i => {
            const date = tempLabels[i];
            return date.toLocaleDateString('zh-CN', {
                month: 'long',
                day: 'numeric'
            });
        });
    } else {
        // 对于半年和一年视图，保持原始Date对象以供聚合使用
        labels = sortedIndices.map(i => tempLabels[i]);
    }
    
    // 重新排序数据
    pageviewsData = sortedIndices.map(i => tempPageviewsData[i]);
    visitorsData = sortedIndices.map(i => tempVisitorsData[i]);

    // 确保有数据才更新显示
    if (labels.length > 0) {
        // 更新总访问量和访问人数
        const totalPageviews = pageviewsData.reduce((a, b) => a + b, 0);
        const totalVisitors = visitorsData.reduce((a, b) => a + b, 0);
        
        document.getElementById('cf-pageviews').textContent = formatNumber(totalPageviews);
        document.getElementById('cf-visitors').textContent = formatNumber(totalVisitors);

        // 更新图表
        updateChart();
        
        console.log('数据更新完成');
    } else {
        throw new Error('没有可用的数据');
    }
}

// 初始化事件监听
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM加载完成，开始初始化');
    
    try {
        // 初始化日期选择器
        initializeDatePickers();
        
        // 监听快捷范围按钮点击
        document.querySelectorAll('.range-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    const days = parseInt(btn.dataset.days);
                    if (!isNaN(days)) {
                        await setDateRange(days);
                    } else {
                        console.error('无效的天数:', btn.dataset.days);
                    }
                } catch (error) {
                    console.error('按钮点击处理失败:', error);
                }
            });
        });
        
        // 初始加载30天数据
        await setDateRange(30);
        
        console.log('初始化完成');
    } catch (error) {
        console.error('初始化失败:', error);
    }
}); 