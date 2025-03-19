// 性能监控
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fcp: null,
            lcp: null,
            fid: null,
            cls: null,
            dnsTime: null,
            tcpTime: null,
            responseTime: null,
            domLoadTime: null,
            loadTime: null,
            resources: [],
            errors: []
        };

        // 检查是否已加载 GA4
        if (typeof gtag === 'undefined') {
            console.warn('Google Analytics 4 not loaded');
        }

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

        // 计算页面加载性能指标
        this.calculatePageLoadMetrics();

        // 定期更新性能指标
        setInterval(() => this.updateMetrics(), 5000);
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

            // 发送页面加载指标到 GA4
            this.sendToGA4('page_load', {
                dns_time: this.metrics.dnsTime,
                tcp_time: this.metrics.tcpTime,
                response_time: this.metrics.responseTime,
                dom_load_time: this.metrics.domLoadTime,
                total_load_time: this.metrics.loadTime
            });
        }
    }

    observeCoreWebVitals() {
        // FCP (First Contentful Paint)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            if (entries.length > 0) {
                this.metrics.fcp = entries[0].startTime;
                this.sendToGA4('web_vital', {
                    metric_name: 'FCP',
                    value: this.metrics.fcp
                });
            }
        }).observe({ entryTypes: ['paint'] });
        
        // LCP (Largest Contentful Paint)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            if (entries.length > 0) {
                this.metrics.lcp = entries[entries.length - 1].startTime;
                this.sendToGA4('web_vital', {
                    metric_name: 'LCP',
                    value: this.metrics.lcp
                });
            }
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // FID (First Input Delay)
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            if (entries.length > 0) {
                this.metrics.fid = entries[0].processingStart - entries[0].startTime;
                this.sendToGA4('web_vital', {
                    metric_name: 'FID',
                    value: this.metrics.fid
                });
            }
        }).observe({ entryTypes: ['first-input'] });
        
        // CLS (Cumulative Layout Shift)
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            this.metrics.cls = clsValue;
            this.sendToGA4('web_vital', {
                metric_name: 'CLS',
                value: this.metrics.cls
            });
        }).observe({ entryTypes: ['layout-shift'] });
    }

    observeResources() {
        const observer = new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (entry.initiatorType !== 'xmlhttprequest' && entry.initiatorType !== 'fetch') {
                    this.metrics.resources.push({
                        name: entry.name,
                        size: entry.transferSize / 1024, // 转换为 KB
                        loadTime: entry.duration
                    });
                }
            }
        });
        
        observer.observe({ entryTypes: ['resource'] });
    }

    observeErrors() {
        // 监听 JavaScript 错误
        window.addEventListener('error', (event) => {
            const error = {
                type: 'JavaScript Error',
                message: event.message,
                stack: event.stack,
                timestamp: Date.now()
            };
            this.metrics.errors.push(error);
            this.sendToGA4('error', error);
        });

        // 监听 Promise 错误
        window.addEventListener('unhandledrejection', (event) => {
            const error = {
                type: 'Promise Error',
                message: event.reason,
                timestamp: Date.now()
            };
            this.metrics.errors.push(error);
            this.sendToGA4('error', error);
        });
    }

    // 发送数据到 GA4
    sendToGA4(eventName, params) {
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, {
                ...params,
                page_location: window.location.href,
                page_title: document.title,
                timestamp: new Date().toISOString()
            });
        }
    }

    // 更新性能指标显示
    updateMetrics() {
        // 更新页面上的指标显示
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value !== null ? value.toFixed(2) : 'N/A';
            }
        };

        // 更新核心 Web 指标
        updateElement('fcp-value', this.metrics.fcp);
        updateElement('lcp-value', this.metrics.lcp);
        updateElement('fid-value', this.metrics.fid);
        updateElement('cls-value', this.metrics.cls);

        // 更新页面加载性能
        updateElement('dns-time', this.metrics.dnsTime);
        updateElement('tcp-time', this.metrics.tcpTime);
        updateElement('response-time', this.metrics.responseTime);
        updateElement('dom-load-time', this.metrics.domLoadTime);
        updateElement('total-load-time', this.metrics.loadTime);

        // 更新资源加载性能
        const resourcesList = document.getElementById('resources-list');
        if (resourcesList) {
            resourcesList.innerHTML = this.metrics.resources
                .map(resource => `
                    <div class="resource-item">
                        <span class="resource-name">${resource.name}</span>
                        <span class="resource-size">${resource.size.toFixed(2)} KB</span>
                        <span class="resource-time">${resource.loadTime.toFixed(2)} ms</span>
                    </div>
                `)
                .join('');
        }

        // 更新错误日志
        const errorsList = document.getElementById('errors-list');
        if (errorsList) {
            errorsList.innerHTML = this.metrics.errors
                .map(error => `
                    <div class="error-item">
                        <span class="error-type">${error.type}</span>
                        <span class="error-message">${error.message}</span>
                        <span class="error-time">${new Date(error.timestamp).toLocaleString()}</span>
                    </div>
                `)
                .join('');
        }
    }

    calculatePageLoadMetrics() {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
            this.metrics.dnsTime = navigation.domainLookupEnd - navigation.domainLookupStart;
            this.metrics.tcpTime = navigation.connectEnd - navigation.connectStart;
            this.metrics.responseTime = navigation.responseEnd - navigation.responseStart;
            this.metrics.domLoadTime = navigation.domContentLoadedEventEnd - navigation.navigationStart;
            this.metrics.loadTime = navigation.loadEventEnd - navigation.navigationStart;
        }
    }
}

// 初始化性能监控
window.performanceMonitor = new PerformanceMonitor(); 