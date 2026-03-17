(function () {
    document.addEventListener("DOMContentLoaded", function () {
        var selectors = {
            sitePv: "#busuanzi_value_site_pv",
            siteUv: "#busuanzi_value_site_uv",
            pagePv: "#busuanzi_value_page_pv"
        };
        var mirrors = {
            sitePv: "[data-busuanzi-site-pv]",
            siteUv: "[data-busuanzi-site-uv]"
        };
        var timeoutMs = 8000;
        var pollMs = 250;
        var startedAt = Date.now();

        function textOf(selector) {
            var element = document.querySelector(selector);
            if (!element) {
                return "";
            }
            return (element.textContent || "").trim();
        }

        function setText(selector, value) {
            document.querySelectorAll(selector).forEach(function (element) {
                element.textContent = value;
            });
        }

        function syncMirrors() {
            var sitePv = textOf(selectors.sitePv);
            var siteUv = textOf(selectors.siteUv);

            if (sitePv && sitePv !== "0") {
                setText(mirrors.sitePv, sitePv);
            }
            if (siteUv && siteUv !== "0") {
                setText(mirrors.siteUv, siteUv);
            }
        }

        function markUnavailable() {
            if (document.querySelector(selectors.pagePv) && textOf(selectors.pagePv) === "") {
                setText(selectors.pagePv, "--");
            }

            if (document.querySelector(selectors.sitePv) && textOf(selectors.sitePv) === "0") {
                setText(selectors.sitePv, "--");
            }

            if (document.querySelector(selectors.siteUv) && textOf(selectors.siteUv) === "0") {
                setText(selectors.siteUv, "--");
            }

            if (document.querySelector(mirrors.sitePv) && textOf(mirrors.sitePv) === "--") {
                setText(mirrors.sitePv, textOf(selectors.sitePv) || "--");
            }

            if (document.querySelector(mirrors.siteUv) && textOf(mirrors.siteUv) === "--") {
                setText(mirrors.siteUv, textOf(selectors.siteUv) || "--");
            }
        }

        function tick() {
            syncMirrors();

            var pagePv = textOf(selectors.pagePv);
            var sitePv = textOf(selectors.sitePv);
            var siteUv = textOf(selectors.siteUv);
            var finished = true;

            if (document.querySelector(selectors.pagePv) && (!pagePv || pagePv === "--")) {
                finished = false;
            }
            if (document.querySelector(selectors.sitePv) && (!sitePv || sitePv === "0" || sitePv === "--")) {
                finished = false;
            }
            if (document.querySelector(selectors.siteUv) && (!siteUv || siteUv === "0" || siteUv === "--")) {
                finished = false;
            }

            if (finished) {
                return;
            }

            if (Date.now() - startedAt >= timeoutMs) {
                markUnavailable();
                syncMirrors();
                return;
            }

            window.setTimeout(tick, pollMs);
        }

        tick();
    });
})();
