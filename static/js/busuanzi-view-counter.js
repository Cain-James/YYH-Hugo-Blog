(function () {
    function setText(selector, value) {
        document.querySelectorAll(selector).forEach(function (element) {
            element.textContent = value == null ? "--" : String(value);
        });
    }

    function loadCounters() {
        var path = encodeURIComponent(window.location.pathname);
        return fetch("/api/busuanzi?path=" + path)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Busuanzi proxy returned " + response.status);
                }
                return response.json();
            })
            .then(function (data) {
                setText("#busuanzi_value_site_pv, [data-busuanzi-site-pv]", data.site_pv);
                setText("#busuanzi_value_site_uv, [data-busuanzi-site-uv]", data.site_uv);
                setText("#busuanzi_value_page_pv", data.page_pv);
            })
            .catch(function () {
                setText("#busuanzi_value_site_pv, [data-busuanzi-site-pv]", null);
                setText("#busuanzi_value_site_uv, [data-busuanzi-site-uv]", null);
                setText("#busuanzi_value_page_pv", null);
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", loadCounters, { once: true });
    } else {
        loadCounters();
    }
})();
