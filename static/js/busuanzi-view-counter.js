(function () {
    document.addEventListener("DOMContentLoaded", initBusuanziCounter);
    window.loadBusuanziScript = loadBusuanziScript;

    function initBusuanziCounter() {
        const needPagePv = hasPagePvTarget();
        const needSiteStats = hasSiteStatTargets();

        if (!needPagePv && !needSiteStats) {
            return;
        }

        if (isLocalHost()) {
            if (needPagePv) {
                mockLocalViewCount();
            }
            if (needSiteStats) {
                mockSiteStats();
            }
            syncSiteStatMirrors();
            return;
        }

        loadBusuanziScript()
            .then(waitForBusuanzi)
            .then(function () {
                if (needPagePv) {
                    showPagePv();
                }
                if (needSiteStats) {
                    showSiteStats();
                }
                syncSiteStatMirrors();
            })
            .catch(function (error) {
                console.error("Busuanzi load failed", error);
                setStatsUnavailable({
                    needPagePv: needPagePv,
                    needSiteStats: needSiteStats
                });
            });
    }

    function isLocalHost() {
        return window.location.hostname === "localhost" ||
               window.location.hostname === "127.0.0.1";
    }

    function hasPagePvTarget() {
        return !!document.getElementById("busuanzi_value_page_pv");
    }

    function hasSiteStatTargets() {
        return !!document.getElementById("busuanzi_value_site_pv") ||
               !!document.getElementById("busuanzi_value_site_uv") ||
               !!document.querySelector("[data-busuanzi-site-pv]") ||
               !!document.querySelector("[data-busuanzi-site-uv]");
    }

    function loadBusuanziScript() {
        return new Promise(function (resolve, reject) {
            if (window.__busuanzi_loaded || window.bszCaller || window.bszTag) {
                window.__busuanzi_loaded = true;
                resolve();
                return;
            }

            const existing = document.querySelector('script[data-busuanzi="true"], script[src*="busuanzi.pure.mini.js"]');
            if (existing) {
                waitForExistingScript(existing, resolve, reject);
                return;
            }

            const script = document.createElement("script");
            script.src = "https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js";
            script.dataset.busuanzi = "true";
            script.async = true;

            script.onload = function () {
                script.dataset.busuanziLoaded = "true";
                window.__busuanzi_loaded = true;
                resolve();
            };

            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function waitForExistingScript(script, resolve, reject) {
        if (script.dataset.busuanziLoaded === "true" || window.bszCaller || window.bszTag) {
            window.__busuanzi_loaded = true;
            resolve();
            return;
        }

        const onLoad = function () {
            cleanup();
            script.dataset.busuanziLoaded = "true";
            window.__busuanzi_loaded = true;
            resolve();
        };

        const onError = function (error) {
            cleanup();
            reject(error);
        };

        const timeout = window.setTimeout(function () {
            cleanup();
            if (window.bszCaller || window.bszTag) {
                window.__busuanzi_loaded = true;
                resolve();
            } else {
                reject(new Error("Timed out waiting for existing busuanzi script"));
            }
        }, 3000);

        function cleanup() {
            window.clearTimeout(timeout);
            script.removeEventListener("load", onLoad);
            script.removeEventListener("error", onError);
        }

        script.addEventListener("load", onLoad);
        script.addEventListener("error", onError);
    }

    function waitForBusuanzi() {
        return new Promise(function (resolve, reject) {
            let elapsed = 0;
            const interval = 100;
            const timeout = 5000;

            const timer = window.setInterval(function () {
                if (hasResolvedValue()) {
                    window.clearInterval(timer);
                    resolve();
                    return;
                }

                elapsed += interval;
                if (elapsed >= timeout) {
                    window.clearInterval(timer);
                    reject(new Error("Timed out waiting for busuanzi values"));
                }
            }, interval);
        });
    }

    function hasResolvedValue() {
        const selectors = [
            "#busuanzi_value_site_pv",
            "#busuanzi_value_site_uv",
            "#busuanzi_value_page_pv"
        ];

        return selectors.some(function (selector) {
            const node = document.querySelector(selector);
            if (!node) {
                return false;
            }

            const value = (node.textContent || "").trim();
            return value !== "" && value !== "0" && value !== "--";
        });
    }

    function showPagePv() {
        document.querySelectorAll(".post-views").forEach(function (element) {
            element.style.display = "inline-flex";
            element.style.visibility = "visible";
        });

        document.querySelectorAll("#busuanzi_container_page_pv, #busuanzi_value_page_pv").forEach(function (element) {
            element.style.display = "inline";
            element.style.visibility = "visible";
        });
    }

    function showSiteStats() {
        document.querySelectorAll("#busuanzi_container_site_pv, #busuanzi_container_site_uv, #busuanzi_value_site_pv, #busuanzi_value_site_uv").forEach(function (element) {
            element.style.display = "inline";
            element.style.visibility = "visible";
        });
    }

    function syncSiteStatMirrors() {
        syncMirror("[data-busuanzi-site-pv]", "#busuanzi_value_site_pv");
        syncMirror("[data-busuanzi-site-uv]", "#busuanzi_value_site_uv");
    }

    function syncMirror(targetSelector, sourceSelector) {
        const source = document.querySelector(sourceSelector);
        const value = source ? (source.textContent || "").trim() : "";
        if (!value) {
            return;
        }

        document.querySelectorAll(targetSelector).forEach(function (element) {
            element.textContent = value;
        });
    }

    function setStatsUnavailable(options) {
        const unavailable = "--";

        if (options.needPagePv) {
            document.querySelectorAll("#busuanzi_value_page_pv").forEach(function (element) {
                element.textContent = unavailable;
            });
            showPagePv();
        }

        if (options.needSiteStats) {
            document.querySelectorAll("#busuanzi_value_site_pv, #busuanzi_value_site_uv").forEach(function (element) {
                element.textContent = unavailable;
                element.style.display = "inline";
                element.style.visibility = "visible";
            });
            document.querySelectorAll("[data-busuanzi-site-pv], [data-busuanzi-site-uv]").forEach(function (element) {
                element.textContent = unavailable;
            });
            showSiteStats();
        }
    }

    function mockLocalViewCount() {
        const path = window.location.pathname;
        const viewCount = generateViewCountFromPath(path);

        document.querySelectorAll("#busuanzi_value_page_pv").forEach(function (element) {
            element.textContent = String(viewCount);
        });

        showPagePv();
    }

    function mockSiteStats() {
        const host = window.location.host || "local";
        const base = generateViewCountFromPath(host) * 100;
        const sitePV = base + 5000;
        const siteUV = Math.floor(sitePV * 0.3);

        document.querySelectorAll("#busuanzi_value_site_pv").forEach(function (element) {
            element.textContent = String(sitePV);
        });

        document.querySelectorAll("#busuanzi_value_site_uv").forEach(function (element) {
            element.textContent = String(siteUV);
        });

        showSiteStats();
        syncSiteStatMirrors();
    }

    function generateViewCountFromPath(path) {
        let hash = 0;
        for (let i = 0; i < path.length; i += 1) {
            hash = ((hash << 5) - hash) + path.charCodeAt(i);
            hash &= hash;
        }
        return Math.abs(hash % 900) + 100;
    }
})();
