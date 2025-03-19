// 性能监控
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fcp: null,
            lcp: null,
            fid: null,
            cls: 0,
            dnsTime: null,
            tcpTime: null,
            responseTime: null,
            domLoadTime: null,
            loadTime: null,
            resources: [],
            errors: []
        };

        this.init();
    }

    init() {
        // 监听页面加载性能
        this.observePageLoad();
        
        // 监听核心 Web 指标
        this.observeCoreWebVitals();
        
        // 监听资源加载
        this.observeResources();
        
        // 监听错误
        this.observeErrors();
    }

    observePageLoad() {
        if (window.performance) {
            const timing = window.performance.timing;
            
            // DNS 解析时间
            this.metrics.dnsTime = timing.domainLookupEnd - timing.domainLookupStart;
            
            // TCP 连接时间
            this.metrics.tcpTime = timing.connectEnd - timing.connectStart;
            
            // 服务器响应时间
            this.metrics.responseTime = timing.responseEnd - timing.requestStart;
            
            // DOM 加载时间
            this.metrics.domLoadTime = timing.domComplete - timing.domLoading;
            
            // 页面完全加载时间
            this.metrics.loadTime = timing.loadEventEnd - timing.navigationStart;
        }
    }

    observeCoreWebVitals() {
        // 首次内容绘制 (FCP)
        if ('PerformanceObserver' in window) {
            const fcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                if (entries.length > 0) {
                    this.metrics.fcp = entries[0].startTime / 1000; // 转换为秒
                }
            });
            fcpObserver.observe({ entryTypes: ['paint'] });
        }

        // 最大内容绘制 (LCP)
        if ('PerformanceObserver' in window) {
            const lcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                if (entries.length > 0) {
                    this.metrics.lcp = entries[entries.length - 1].startTime / 1000; // 转换为秒
                }
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        }

        // 首次输入延迟 (FID)
        if ('PerformanceObserver' in window) {
            const fidObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                if (entries.length > 0) {
                    this.metrics.fid = entries[0].processingStart - entries[0].startTime;
                }
            });
            fidObserver.observe({ entryTypes: ['first-input'] });
        }

        // 累积布局偏移 (CLS)
        if ('PerformanceObserver' in window) {
            let clsValue = 0;
            let clsEntries = [];
            let sessionValue = 0;
            let sessionEntries = [];

            const clsObserver = new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (!entry.hadRecentInput) {
                        const currentValue = entry.value;
                        const delta = entry.value - (entry.hadRecentInput ? 0 : entry.value);

                        if (delta > 0) {
                            clsEntries.push(entry);
                            sessionEntries.push(entry);
                            clsValue += delta;
                            sessionValue += delta;
                        }
                    }
                }
                this.metrics.cls = clsValue;
            });

            clsObserver.observe({ entryTypes: ['layout-shift'] });
        }
    }

    observeResources() {
        if ('PerformanceObserver' in window) {
            const resourceObserver = new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    if (entry.initiatorType === 'img') {
                        this.metrics.resources.push({
                            name: entry.name,
                            size: entry.transferSize / 1024, // 转换为 KB
                            loadTime: entry.duration
                        });
                    }
                }
            });

            resourceObserver.observe({ entryTypes: ['resource'] });
        }
    }

    observeErrors() {
        // 监听 JavaScript 错误
        window.addEventListener('error', (event) => {
            this.metrics.errors.push({
                type: 'JavaScript Error',
                message: event.message,
                stack: event.stack,
                timestamp: new Date().toISOString()
            });
        });

        // 监听 Promise 错误
        window.addEventListener('unhandledrejection', (event) => {
            this.metrics.errors.push({
                type: 'Promise Error',
                message: event.reason,
                timestamp: new Date().toISOString()
            });
        });
    }

    // 发送性能数据到服务器
    sendMetrics() {
        // 这里可以添加发送数据到服务器的代码
        // 例如使用 fetch 或 XMLHttpRequest
        console.log('Performance metrics:', this.metrics);
    }
}

// 初始化性能监控
window.performanceMonitor = new PerformanceMonitor(); 