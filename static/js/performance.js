/**
 * Performance page metrics collector.
 *
 * This script is intentionally loaded only by the performance page. It exposes
 * window.performanceMonitor for performance-charts.js.
 */
(function () {
    const metrics = {
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

    function sendToGA(eventName, params) {
        if (typeof gtag !== "function") {
            return;
        }

        gtag("event", eventName, Object.assign({
            page_location: window.location.href,
            page_title: document.title
        }, params));
    }

    function updateNavigationMetrics() {
        const navigation = performance.getEntriesByType("navigation")[0];

        if (navigation) {
            metrics.dnsTime = navigation.domainLookupEnd - navigation.domainLookupStart;
            metrics.tcpTime = navigation.connectEnd - navigation.connectStart;
            metrics.responseTime = navigation.responseEnd - navigation.responseStart;
            metrics.domLoadTime = navigation.domContentLoadedEventEnd - navigation.navigationStart;
            metrics.loadTime = navigation.loadEventEnd - navigation.navigationStart;
            return;
        }

        if (performance.timing) {
            const timing = performance.timing;
            metrics.dnsTime = timing.domainLookupEnd - timing.domainLookupStart;
            metrics.tcpTime = timing.connectEnd - timing.connectStart;
            metrics.responseTime = timing.responseEnd - timing.requestStart;
            metrics.domLoadTime = timing.domContentLoadedEventEnd - timing.navigationStart;
            metrics.loadTime = timing.loadEventEnd - timing.navigationStart;
        }
    }

    function observePaintMetrics() {
        if (!("PerformanceObserver" in window)) {
            return;
        }

        try {
            new PerformanceObserver(function (entryList) {
                entryList.getEntries().forEach(function (entry) {
                    if (entry.name === "first-contentful-paint") {
                        metrics.fcp = entry.startTime;
                        sendToGA("web_vital", { metric_name: "FCP", value: metrics.fcp });
                    }
                });
            }).observe({ type: "paint", buffered: true });
        } catch (error) {
            metrics.errors.push(buildError("PerformanceObserver Error", error));
        }

        try {
            new PerformanceObserver(function (entryList) {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                if (lastEntry) {
                    metrics.lcp = lastEntry.startTime;
                    sendToGA("web_vital", { metric_name: "LCP", value: metrics.lcp });
                }
            }).observe({ type: "largest-contentful-paint", buffered: true });
        } catch (error) {
            metrics.errors.push(buildError("PerformanceObserver Error", error));
        }

        try {
            new PerformanceObserver(function (entryList) {
                const firstInput = entryList.getEntries()[0];
                if (firstInput) {
                    metrics.fid = firstInput.processingStart - firstInput.startTime;
                    sendToGA("web_vital", { metric_name: "FID", value: metrics.fid });
                }
            }).observe({ type: "first-input", buffered: true });
        } catch (error) {
            metrics.errors.push(buildError("PerformanceObserver Error", error));
        }

        try {
            let clsValue = 0;
            new PerformanceObserver(function (entryList) {
                entryList.getEntries().forEach(function (entry) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                });
                metrics.cls = clsValue;
                sendToGA("web_vital", { metric_name: "CLS", value: metrics.cls });
            }).observe({ type: "layout-shift", buffered: true });
        } catch (error) {
            metrics.errors.push(buildError("PerformanceObserver Error", error));
        }
    }

    function collectResourceMetrics() {
        metrics.resources = performance.getEntriesByType("resource").map(function (entry) {
            return {
                name: entry.name,
                size: (entry.transferSize || entry.encodedBodySize || 0) / 1024,
                loadTime: entry.duration
            };
        });
    }

    function buildError(type, error) {
        return {
            type: type,
            message: error && error.message ? error.message : String(error),
            timestamp: Date.now()
        };
    }

    function observeErrors() {
        window.addEventListener("error", function (event) {
            metrics.errors.push({
                type: "JavaScript Error",
                message: event.message,
                timestamp: Date.now()
            });
        });

        window.addEventListener("unhandledrejection", function (event) {
            metrics.errors.push({
                type: "Promise Error",
                message: event.reason ? String(event.reason) : "Unhandled rejection",
                timestamp: Date.now()
            });
        });
    }

    function refresh() {
        updateNavigationMetrics();
        collectResourceMetrics();
    }

    window.performanceMonitor = {
        metrics: metrics,
        refresh: refresh
    };

    observeErrors();
    observePaintMetrics();

    if (document.readyState === "complete") {
        refresh();
    } else {
        window.addEventListener("load", refresh);
    }
})();
