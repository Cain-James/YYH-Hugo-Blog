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
            if (window.__busuanzi_data) {
                applyBusuanziData(window.__busuanzi_data);
                window.__busuanzi_loaded = true;
                resolve(window.__busuanzi_data);
                return;
            }

            if (window.__busuanzi_pending) {
                window.__busuanzi_pending.push({ resolve: resolve, reject: reject });
                return;
            }

            window.__busuanzi_pending = [{ resolve: resolve, reject: reject }];

            function rejectAll(error) {
                const pending = window.__busuanzi_pending || [];
                window.__busuanzi_pending = null;
                pending.forEach(function (entry) {
                    entry.reject(error);
                });
            }

            function resolveAll(data) {
                const pending = window.__busuanzi_pending || [];
                window.__busuanzi_pending = null;
                pending.forEach(function (entry) {
                    entry.resolve(data);
                });
            }

            fetch(buildProxyUrl(), {
                method: "GET",
                headers: {
                    Accept: "application/json"
                },
                credentials: "same-origin"
            })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error("Proxy request failed with status " + response.status);
                    }
                    return response.json();
                })
                .then(function (data) {
                    window.__busuanzi_data = normalizeBusuanziData(data);
                    window.__busuanzi_loaded = true;
                    applyBusuanziData(window.__busuanzi_data);
                    resolveAll(window.__busuanzi_data);
                })
                .catch(function (error) {
                    console.warn("Busuanzi proxy failed, falling back to direct loader", error);
                    loadBusuanziDirect()
                        .then(function (data) {
                            window.__busuanzi_data = normalizeBusuanziData(data);
                            window.__busuanzi_loaded = true;
                            applyBusuanziData(window.__busuanzi_data);
                            resolveAll(window.__busuanzi_data);
                        })
                        .catch(function (fallbackError) {
                            rejectAll(fallbackError);
                        });
                });
        });
    }

    function buildProxyUrl() {
        const url = new URL("/api/busuanzi", window.location.origin);
        url.searchParams.set("path", window.location.pathname);
        return url.toString();
    }

    function loadBusuanziDirect() {
        return new Promise(function (resolve, reject) {
            const callbackName = "BusuanziCallback_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
            const script = document.createElement("script");
            const timeout = window.setTimeout(function () {
                cleanup();
                reject(new Error("Timed out waiting for direct busuanzi response"));
            }, 8000);

            function cleanup() {
                window.clearTimeout(timeout);
                delete window[callbackName];
                if (script.parentNode) {
                    script.parentNode.removeChild(script);
                }
            }

            window[callbackName] = function (data) {
                cleanup();
                resolve(data);
            };

            script.src = "https://busuanzi.ibruce.info/busuanzi?jsonpCallback=" + callbackName;
            script.async = true;
            script.referrerPolicy = "no-referrer-when-downgrade";
            script.onerror = function () {
                cleanup();
                reject(new Error("Failed to load direct busuanzi jsonp"));
            };

            document.head.appendChild(script);
        });
    }

    function normalizeBusuanziData(data) {
        return {
            site_pv: getBusuanziValue(data, "site_pv"),
            site_uv: getBusuanziValue(data, "site_uv"),
            page_pv: getBusuanziValue(data, "page_pv")
        };
    }

    function getBusuanziValue(data, key) {
        if (!data || typeof data[key] === "undefined" || data[key] === null) {
            return "";
        }
        return String(data[key]);
    }

    function applyBusuanziData(data) {
        setText("#busuanzi_value_site_pv", data.site_pv);
        setText("#busuanzi_value_site_uv", data.site_uv);
        setText("#busuanzi_value_page_pv", data.page_pv);
    }

    function setText(selector, value) {
        if (!value) {
            return;
        }

        document.querySelectorAll(selector).forEach(function (element) {
            element.textContent = value;
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
