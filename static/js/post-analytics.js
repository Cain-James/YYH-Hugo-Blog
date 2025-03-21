// 获取文章浏览量数据
async function fetchPostAnalytics() {
    try {
        const apiUrl = new URL('https://blog-analytics.finderyyh.workers.dev/posts');
        console.log('Fetching analytics data from:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received analytics data:', data);
        return data;
    } catch (error) {
        console.error('获取文章数据失败:', error);
        return null;
    }
}

// 等待不蒜子初始化完成
function waitForBusuanzi() {
    return new Promise((resolve) => {
        if (window.busuanzi) {
            console.log('Busuanzi already initialized');
            resolve();
            return;
        }

        console.log('Waiting for Busuanzi to initialize...');
        const checkBusuanzi = setInterval(() => {
            if (window.busuanzi) {
                console.log('Busuanzi initialized successfully');
                clearInterval(checkBusuanzi);
                resolve();
            }
        }, 100);

        // 设置超时
        setTimeout(() => {
            console.log('Busuanzi initialization timeout');
            clearInterval(checkBusuanzi);
            resolve();
        }, 5000);
    });
}

// 获取文章浏览量
async function getPostViews(url) {
    try {
        // 检查是否是本地开发环境
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // 本地开发环境使用模拟数据
            const mockViews = Math.floor(Math.random() * 1000) + 100;
            console.log('Using mock views for local development:', mockViews);
            return mockViews;
        }

        // 生产环境使用不蒜子
        if (window.busuanzi) {
            // 等待一段时间确保不蒜子数据已加载
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 先触发一次统计
            try {
                window.busuanzi.getPagePV();
                // 等待一段时间让数据更新
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) {
                console.log('Error triggering page view:', e);
            }

            // 尝试获取浏览量
            let views = 0;
            try {
                views = parseInt(window.busuanzi.getPagePV()) || 0;
                console.log('Using Busuanzi views:', views);
            } catch (e) {
                console.log('getPagePV failed:', e);
            }

            return views;
        }

        return 0;
    } catch (error) {
        console.error('Error getting views:', error);
        return 0;
    }
}

// 更新文章浏览量
async function updatePostViews() {
    try {
        // 等待不蒜子初始化完成
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 获取所有浏览量元素
        const viewElements = document.querySelectorAll('.post-views');
        console.log('Found view elements:', viewElements.length);
        
        if (viewElements.length === 0) {
            console.log('No view elements found');
            return;
        }

        // 收集所有文章的浏览量数据
        const articles = [];
        const processedUrls = new Set(); // 用于防止重复处理同一URL

        for (const el of viewElements) {
            const url = el.getAttribute('data-url');
            console.log('Processing URL:', url);
            if (url && !processedUrls.has(url)) {
                processedUrls.add(url);
                const views = await getPostViews(url);
                console.log('Views for URL:', url, views);
                articles.push({
                    url: url,
                    views: views,
                    element: el,
                    title: el.closest('article')?.querySelector('h2')?.textContent || ''
                });
            }
        }

        // 更新浏览量显示
        articles.forEach(article => {
            if (article.element) {
                const formattedViews = formatNumber(article.views);
                const viewsSpan = article.element.querySelector('.views-count');
                if (viewsSpan) {
                    viewsSpan.textContent = formattedViews;
                    console.log('Updated views for:', article.url, formattedViews);
                }
            }
        });

        // 如果有热门文章区域，更新热门文章
        const popularArticlesContainer = document.querySelector('.popular-articles');
        if (popularArticlesContainer) {
            // 按浏览量排序
            articles.sort((a, b) => b.views - a.views);
            
            // 获取前5篇文章
            const topArticles = articles.slice(0, 5);
            
            // 更新热门文章列表
            const popularList = popularArticlesContainer.querySelector('.popular-list');
            if (popularList) {
                popularList.innerHTML = topArticles.map(article => `
                    <li>
                        <a href="${article.url}">
                            <span class="article-title">${article.title}</span>
                            <span class="article-views">${formatNumber(article.views)}</span>
                        </a>
                    </li>
                `).join('');
            }
        }
    } catch (error) {
        console.error('更新浏览量失败:', error);
    }
}

// 格式化数字
function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + 'w';
    }
    return num.toString();
}

// 页面加载完成后更新浏览量
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded, updating views...');
    // 延迟执行以确保不蒜子脚本加载完成
    setTimeout(updatePostViews, 2000);
}); 