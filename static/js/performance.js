/**
 * 性能监控与优化脚本
 * 收集性能指标并应用页面加载优化
 */
(function() {
    // 性能监控
    function collectPerformanceMetrics() {
        if (performance && performance.timing) {
            // 页面完全加载后收集指标
            window.addEventListener('load', function() {
                // 给浏览器一点时间完成所有计算
                setTimeout(function() {
                    const t = performance.timing;
                    const interactive = t.domInteractive - t.navigationStart;
                    const dcl = t.domContentLoadedEventEnd - t.navigationStart;
                    const complete = t.domComplete - t.navigationStart;
                    
                    // 仅在开发环境或测试模式记录到控制台
                    const isDebug = localStorage.getItem('debug_mode') === 'true' || 
                                  window.location.hostname === 'localhost';
                    
                    if (isDebug) {
                        console.log('性能指标:', {
                            '首次可交互 (ms)': interactive,
                            'DOM内容加载完成 (ms)': dcl,
                            '页面完全加载 (ms)': complete
                        });
                    }

                    // 发送到 Google Analytics 进行监控
                    if (typeof gtag === 'function') {
                        gtag('event', 'performance', {
                            'event_category': 'timing',
                            'event_label': '首次可交互',
                            'value': interactive,
                            'non_interaction': true
                        });
                        
                        gtag('event', 'performance', {
                            'event_category': 'timing',
                            'event_label': '页面完全加载',
                            'value': complete,
                            'non_interaction': true
                        });
                    }
                }, 0);
            });
        }
    }

    // 图片延迟加载
    function setupLazyLoading() {
        if ('loading' in HTMLImageElement.prototype) {
            // 浏览器原生支持延迟加载
            document.querySelectorAll('img[loading="lazy"]').forEach(img => {
                img.classList.add('lazyload');
                img.onload = function() {
                    this.classList.add('lazyloaded');
                };
            });
        } else {
            // 对于不支持原生延迟加载的浏览器，可以添加自定义实现或加载库
            // 这里简化处理，仅添加类
            document.querySelectorAll('img').forEach(img => {
                if (!img.hasAttribute('loading')) {
                    img.setAttribute('loading', 'lazy');
                }
                img.classList.add('lazyload');
                img.onload = function() {
                    this.classList.add('lazyloaded');
                };
            });
        }
    }

    // 优化页面资源加载
    function optimizePageLoad() {
        // 延迟加载非关键JavaScript
        const deferScripts = document.querySelectorAll('script[defer-load]');
        if (deferScripts.length > 0) {
            // 页面交互后延迟加载非关键脚本
            const loadDeferredScripts = function() {
                deferScripts.forEach(script => {
                    const src = script.getAttribute('defer-load');
                    if (src) {
                        const newScript = document.createElement('script');
                        newScript.src = src;
                        document.body.appendChild(newScript);
                    }
                });
                
                // 移除事件监听器
                document.removeEventListener('mousemove', loadDeferredScripts);
                document.removeEventListener('scroll', loadDeferredScripts);
                document.removeEventListener('keydown', loadDeferredScripts);
                document.removeEventListener('click', loadDeferredScripts);
            };
            
            // 用户交互时加载
            document.addEventListener('mousemove', loadDeferredScripts, {once: true});
            document.addEventListener('scroll', loadDeferredScripts, {once: true});
            document.addEventListener('keydown', loadDeferredScripts, {once: true});
            document.addEventListener('click', loadDeferredScripts, {once: true});
            
            // 如果用户没有交互，30秒后也加载
            setTimeout(loadDeferredScripts, 30000);
        }
        
        // 预渲染可能会被访问的页面（仅对首页起作用）
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            window.addEventListener('load', function() {
                setTimeout(function() {
                    const links = Array.from(document.querySelectorAll('.first-entry a[href], .post-entry a[href]'))
                        .slice(0, 3); // 只预处理前3个链接
                    
                    links.forEach(link => {
                        const href = link.getAttribute('href');
                        if (href && href.startsWith('/') && !href.includes('#')) {
                            const prerender = document.createElement('link');
                            prerender.rel = 'prerender';
                            prerender.href = href;
                            document.head.appendChild(prerender);
                        }
                    });
                }, 5000); // 主页加载5秒后预加载
            });
        }
    }
    
    // 优化字体加载
    function optimizeFontLoading() {
        // 检测是否是重复访问
        const fontLoadedBefore = localStorage.getItem('fonts-loaded') === 'true';
        
        if (fontLoadedBefore) {
            // 字体已经缓存，直接使用字体
            document.documentElement.classList.add('fonts-loaded');
        } else {
            // 首次访问，使用系统字体，字体加载完成后再切换
            if ('fonts' in document) {
                Promise.all([
                    document.fonts.load('1em noto_serif'),
                    document.fonts.load('700 1em noto_serif'),
                    document.fonts.load('italic 1em noto_serif'),
                    document.fonts.load('italic 700 1em noto_serif')
                ]).then(function () {
                    document.documentElement.classList.add('fonts-loaded');
                    localStorage.setItem('fonts-loaded', 'true');
                });
            }
        }
    }

    // 初始化
    function init() {
        collectPerformanceMetrics();
        setupLazyLoading();
        optimizePageLoad();
        optimizeFontLoading();
    }

    // 当DOM准备就绪时运行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})(); 