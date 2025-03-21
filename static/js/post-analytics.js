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

// 加载不蒜子统计脚本
function loadBusuanzi() {
    return new Promise((resolve) => {
        if (window.busuanzi) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
        script.async = true;
        script.onload = () => {
            // 等待不蒜子脚本完全加载
            setTimeout(() => {
                resolve();
            }, 1000);
        };
        document.head.appendChild(script);
    });
}

// 更新文章浏览量
async function updatePostViews() {
    try {
        // 获取所有浏览量元素
        const viewElements = document.querySelectorAll('.post-views');
        console.log('Found view elements:', viewElements.length);
        
        if (viewElements.length === 0) return;

        // 获取文章数据
        const analyticsData = await fetchPostAnalytics();
        if (!analyticsData) return;

        // 收集所有文章的浏览量数据
        const articles = [];
        const processedUrls = new Set(); // 用于防止重复处理同一URL

        viewElements.forEach((el) => {
            const url = el.getAttribute('data-url');
            console.log('Processing URL:', url);
            if (url && !processedUrls.has(url)) {
                processedUrls.add(url);
                // 从 analyticsData 中获取浏览量
                const views = analyticsData[url]?.views || 0;
                console.log('Views for URL:', url, views);
                articles.push({
                    url: url,
                    views: views,
                    element: el,
                    title: el.closest('article')?.querySelector('h2')?.textContent || ''
                });
            }
        });

        // 更新浏览量显示
        articles.forEach(article => {
            if (article.element) {
                const formattedViews = formatNumber(article.views);
                const viewsSpan = article.element.querySelector('span:last-child');
                if (viewsSpan) {
                    viewsSpan.textContent = ` ${formattedViews}`;
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
    updatePostViews();
});

// 定期刷新数据
setInterval(updatePostViews, 60000); // 每分钟更新一次 