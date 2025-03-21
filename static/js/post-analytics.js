// 获取文章浏览量数据
async function fetchPostAnalytics() {
    try {
        const apiUrl = new URL('https://blog-analytics.finderyyh.workers.dev/posts');
        
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
        return data;
    } catch (error) {
        console.error('获取文章数据失败:', error);
        return null;
    }
}

// 格式化数字
function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + 'w';
    }
    return num.toString();
}

// 加载不蒜子脚本
function loadBusuanzi() {
    const script = document.createElement('script');
    script.src = '//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
    script.async = true;
    document.head.appendChild(script);

    // 监听脚本加载完成
    script.onload = () => {
        // 显示计数器容器
        document.querySelectorAll('#busuanzi_container_page_pv').forEach(container => {
            container.style.display = '';
        });
    };
}

// 更新文章浏览量
async function updatePostViews() {
    try {
        // 加载不蒜子脚本
        loadBusuanzi();
        
        // 等待一段时间确保不蒜子初始化完成
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 更新热门文章排行
        const popularPosts = document.getElementById('popular-posts');
        if (popularPosts) {
            // 获取所有文章元素
            const articles = Array.from(document.querySelectorAll('article'));
            
            // 收集文章数据
            const postsData = articles.map(article => {
                const titleEl = article.querySelector('h2');
                const viewsEl = article.querySelector('.busuanzi_value_page_pv');
                const linkEl = article.querySelector('a.entry-link');

                if (!titleEl || !viewsEl || !linkEl) return null;

                const views = parseInt(viewsEl.textContent) || 0;
                return {
                    title: titleEl.textContent.trim(),
                    url: linkEl.href,
                    pageviews: views
                };
            }).filter(post => post !== null);

            // 按浏览量排序并取前5篇
            const sortedPosts = postsData
                .filter(post => post.pageviews > 0)
                .sort((a, b) => b.pageviews - a.pageviews)
                .slice(0, 5);

            if (sortedPosts.length > 0) {
                const postsList = document.createElement('ul');
                postsList.className = 'popular-posts-list';
                
                sortedPosts.forEach(post => {
                    const li = document.createElement('li');
                    li.className = 'popular-post-item';
                    
                    const link = document.createElement('a');
                    link.href = post.url;
                    link.className = 'popular-post-link';
                    
                    const title = document.createElement('span');
                    title.className = 'popular-post-title';
                    title.textContent = post.title;
                    
                    const views = document.createElement('span');
                    views.className = 'popular-post-views';
                    views.textContent = `${formatNumber(post.pageviews)}次浏览`;
                    
                    link.appendChild(title);
                    li.appendChild(link);
                    li.appendChild(views);
                    postsList.appendChild(li);
                });

                // 清空并添加新内容
                popularPosts.innerHTML = '';
                popularPosts.appendChild(postsList);
            } else {
                popularPosts.innerHTML = '<p>暂无数据</p>';
            }
        }
    } catch (error) {
        console.error('更新文章数据失败:', error);
    }
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
    // 初始化不蒜子
    loadBusuanzi();
    // 确保不蒜子脚本完全加载后再更新视图
    setTimeout(updatePostViews, 1000);
});

// 定期刷新数据
setInterval(updatePostViews, 60000); // 每分钟更新一次 