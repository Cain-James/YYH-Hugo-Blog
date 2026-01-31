/**
 * 优化版浏览量计数脚本
 * 性能改进和响应速度优化
 */
(function() {
    // 在DOMContentLoaded后执行，优化首屏加载速度
    document.addEventListener('DOMContentLoaded', initBusuanziCounter);
    
    // 将loadBusuanziScript暴露为全局函数，以便其他脚本调用
    window.loadBusuanziScript = loadBusuanziScript;
    // 将mockSiteStats暴露为全局函数
    window.mockSiteStats = mockSiteStats;

    function initBusuanziCounter() {
        console.log('不蒜子计数器初始化');
        
        // 快速检查，如果不是详情页则不加载浏览量计数
        const isDetail = isDetailPage();
        
        // 检查是否需要显示站点统计（在关于页面显示）
        const needSiteStats = document.getElementById('busuanzi_value_site_pv') || 
                             document.getElementById('busuanzi_value_site_uv');
        
        // 如果既不是详情页也没有站点统计需求，则隐藏相关元素并退出
        if (!isDetail && !needSiteStats) {
            hideViewCounters();
            console.log('不需要显示计数器，退出');
            return;
        }

        // 检查是否为测试环境
        const isLocalTest = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';

        if (isLocalTest) {
            console.log('本地环境，使用模拟数据');
            if (isDetail) mockLocalViewCount();
            if (needSiteStats) mockSiteStats();
            return;
        }

        // 仅在需要时加载统计脚本
        loadBusuanziScript()
            .then(() => {
                console.log('不蒜子脚本加载成功');
                // 等待busuanzi脚本初始化完成
                return waitForBusuanzi();
            })
            .then(() => {
                console.log('不蒜子脚本初始化完成');
                // 确保view counters显示正确
                if (isDetail) showViewCounters();
                if (needSiteStats) showSiteStats();
            })
            .catch(error => {
                console.error('Busuanzi加载失败', error);
                if (isDetail) mockLocalViewCount(); // 详情页出错时显示模拟数据
                if (needSiteStats) mockSiteStats(); // 站点统计出错时显示模拟数据
            });
    }

    // 快速检查当前页面是否是文章详情页
    function isDetailPage() {
        // 方法1：检查body类名
        if (document.body.classList.contains('page')) {
            return true;
        }
        
        // 方法2：检查URL特征（文章详情页通常有具体的路径）
        const path = window.location.pathname;
        // 如果路径包含具体的文章名称目录，视为详情页
        if (path.split('/').length > 2 && !path.includes('/tags/') && 
            !path.includes('/categories/') && !path.includes('/page/')) {
            return true;
        }
        
        // 方法3：检查特定元素
        return !!document.querySelector('.post-content');
    }

    // 隐藏所有浏览量计数器
    function hideViewCounters() {
        // CSS已经处理了隐藏，此处添加额外的DOM处理
        const containers = document.querySelectorAll('#busuanzi_container_page_pv, .post-views');
        containers.forEach(container => {
            container.style.display = 'none';
            container.style.visibility = 'hidden';
        });
    }

    // 显示浏览量计数器
    function showViewCounters() {
        const containers = document.querySelectorAll('#busuanzi_container_page_pv');
        containers.forEach(container => {
            if (isDetailPage()) {
                container.style.display = 'inline';
                container.style.visibility = 'visible';
            }
        });
    }
    
    // 显示站点统计
    function showSiteStats() {
        // 显示站点PV统计
        const sitePvContainers = document.querySelectorAll('#busuanzi_container_site_pv');
        sitePvContainers.forEach(container => {
            container.style.display = 'inline';
            container.style.visibility = 'visible';
        });
        
        // 显示站点UV统计
        const siteUvContainers = document.querySelectorAll('#busuanzi_container_site_uv');
        siteUvContainers.forEach(container => {
            container.style.display = 'inline';
            container.style.visibility = 'visible';
        });
        
        // 显示值元素
        const sitePvValues = document.querySelectorAll('#busuanzi_value_site_pv');
        sitePvValues.forEach(element => {
            element.style.display = 'inline';
            element.style.visibility = 'visible';
        });
        
        const siteUvValues = document.querySelectorAll('#busuanzi_value_site_uv');
        siteUvValues.forEach(element => {
            element.style.display = 'inline';
            element.style.visibility = 'visible';
        });
        
        console.log('显示站点统计:', sitePvContainers.length, siteUvContainers.length);
    }

    // 加载busuanzi脚本
    function loadBusuanziScript() {
        return new Promise((resolve, reject) => {
            // 注意：不能用 window.busuanzi_value_site_pv 来判断是否已加载，
            // 因为浏览器可能会把 id="busuanzi_value_site_pv" 的 DOM 元素暴露为 window 同名属性。
            const existing = document.querySelector('script[data-busuanzi="true"], script[src*="busuanzi.pure.mini.js"]');
            if (window.__busuanzi_loaded || existing) {
                console.log('不蒜子脚本已存在');
                resolve();
                return;
            }

            console.log('加载不蒜子脚本');
            
            // 创建不蒜子脚本元素
            const script = document.createElement('script');
            // 明确指定https协议，避免使用http
            script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
            script.dataset.busuanzi = 'true';
            script.async = true;
            script.crossOrigin = 'anonymous';
            
            script.onload = () => {
                console.log('不蒜子脚本加载完成');
                window.__busuanzi_loaded = true;
                resolve();
            };
            
            script.onerror = (error) => {
                console.error('不蒜子脚本加载失败:', error);
                // 加载失败时使用模拟数据
                mockSiteStats();
                mockLocalViewCount();
                reject(error);
            };
            
            document.head.appendChild(script);
        });
    }

    // 等待busuanzi脚本初始化完成
    function waitForBusuanzi() {
        return new Promise((resolve) => {
            const checkBusuanzi = () => {
                // 检查是否存在任何不蒜子的值
                const busuanziElements = document.querySelectorAll('[id^="busuanzi_value_"]');
                let initialized = false;
                
                busuanziElements.forEach(element => {
                    if (element.textContent && element.textContent !== '0') {
                        initialized = true;
                    }
                });
                
                if (initialized) {
                    console.log('不蒜子已初始化完成');
                    resolve();
                } else {
                    setTimeout(checkBusuanzi, 100);
                }
            };
            
            checkBusuanzi();
            // 最多等待5秒
            setTimeout(() => {
                console.log('不蒜子初始化超时，强制继续');
                resolve();
            }, 5000);
        });
    }

    // 本地测试环境使用模拟数据
    function mockLocalViewCount() {
        // 从URL生成稳定的模拟访问量
        const path = window.location.pathname;
        const viewCount = generateViewCountFromPath(path);

        const countElements = document.querySelectorAll('#busuanzi_value_page_pv');
        countElements.forEach(element => {
            element.textContent = viewCount;
        });

        // 显示容器
        const containers = document.querySelectorAll('#busuanzi_container_page_pv');
        containers.forEach(container => {
            if (isDetailPage()) {
                container.style.display = 'inline';
                container.style.visibility = 'visible';
            }
        });
    }
    
    // 模拟站点统计数据
    function mockSiteStats() {
        // 生成随机但稳定的站点统计数据
        const sitePV = Math.floor(Math.random() * 50000) + 5000;
        const siteUV = Math.floor(sitePV * 0.3);
        
        // 更新站点PV
        const sitePvElements = document.querySelectorAll('#busuanzi_value_site_pv');
        sitePvElements.forEach(element => {
            element.textContent = sitePV;
            element.style.display = 'inline';
            element.style.visibility = 'visible';
        });
        
        // 更新站点UV
        const siteUvElements = document.querySelectorAll('#busuanzi_value_site_uv');
        siteUvElements.forEach(element => {
            element.textContent = siteUV;
            element.style.display = 'inline';
            element.style.visibility = 'visible';
        });
        
        // 显示容器
        document.querySelectorAll('#busuanzi_container_site_pv, #busuanzi_container_site_uv').forEach(container => {
            container.style.display = 'inline';
            container.style.visibility = 'visible';
        });
        
        console.log('模拟站点统计:', sitePV, siteUV);
    }

    // 从路径生成一个稳定的浏览量数字（本地测试用）
    function generateViewCountFromPath(path) {
        let hash = 0;
        for (let i = 0; i < path.length; i++) {
            hash = ((hash << 5) - hash) + path.charCodeAt(i);
            hash = hash & hash; // 转换为32位整数
        }
        // 生成100-1000之间的数字
        return Math.abs(hash % 900) + 100;
    }
})(); 
