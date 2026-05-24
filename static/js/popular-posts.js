(function () {
    document.addEventListener("DOMContentLoaded", function () {
        var container = document.getElementById("popular-posts");
        if (!container) {
            return;
        }

        var path = container.getAttribute("data-current-path") || "";
        var permalink = container.getAttribute("data-current-permalink") || "";
        var title = container.getAttribute("data-current-title") || "";
        var lang = container.getAttribute("data-current-lang") || "default";
        var trackView = container.getAttribute("data-track-view") !== "false";
        var limit = container.getAttribute("data-limit") || "5";

        if (trackView) {
            sendView(path, permalink, title, lang);
        }
        loadPopularPosts(container, path, lang, limit);
    });

    function sendView(path, permalink, title, lang) {
        if (!path || !title || !shouldCountView(path)) {
            return;
        }

        var body = JSON.stringify({
            path: path,
            permalink: permalink,
            title: title,
            lang: lang
        });

        if (navigator.sendBeacon && typeof Blob !== "undefined") {
            var ok = navigator.sendBeacon(
                "/api/post-view",
                new Blob([body], { type: "application/json" })
            );
            if (ok) {
                markViewSent(path);
                return;
            }
        }

        fetch("/api/post-view", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: body,
            keepalive: true,
            credentials: "same-origin"
        })
            .then(function (response) {
                if (response.ok) {
                    markViewSent(path);
                }
            })
            .catch(function (error) {
                console.warn("Popular posts view tracking failed", error);
            });
    }

    function loadPopularPosts(container, currentPath, lang, limit) {
        var url = new URL("/api/popular-posts", window.location.origin);
        url.searchParams.set("limit", normalizeLimit(limit));
        if (currentPath) {
            url.searchParams.set("exclude", currentPath);
        }
        url.searchParams.set("lang", lang);

        fetch(url.toString(), {
            credentials: "same-origin"
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Popular posts request failed with status " + response.status);
                }
                return response.json();
            })
            .then(function (data) {
                renderPopularPosts(container, data && data.items ? data.items : []);
            })
            .catch(function (error) {
                console.warn("Popular posts loading failed", error);
                container.innerHTML = "<p class=\"popular-posts-empty\">热门文章暂时不可用</p>";
            });
    }

    function renderPopularPosts(container, items) {
        if (!items.length) {
            container.innerHTML = "<p class=\"popular-posts-empty\">热门文章积累中</p>";
            return;
        }

        var html = "<ol class=\"popular-posts-list\">";
        items.forEach(function (item, index) {
            html += [
                "<li class=\"popular-post-item\">",
                "<a class=\"popular-post-link\" href=\"", escapeHtml(item.permalink), "\">",
                "<span class=\"popular-post-rank\">", index + 1, "</span>",
                "<span class=\"popular-post-title\">", escapeHtml(item.title), "</span>",
                "</a>",
                "<span class=\"popular-post-views\">", formatViews(item.views), "</span>",
                "</li>"
            ].join("");
        });
        html += "</ol>";
        container.innerHTML = html;
    }

    function shouldCountView(path) {
        try {
            var key = storageKey(path);
            var raw = window.localStorage.getItem(key);
            if (!raw) {
                return true;
            }

            var last = parseInt(raw, 10);
            if (!isFinite(last)) {
                return true;
            }

            return Date.now() - last > 6 * 60 * 60 * 1000;
        } catch (error) {
            return true;
        }
    }

    function markViewSent(path) {
        try {
            window.localStorage.setItem(storageKey(path), String(Date.now()));
        } catch (error) {
            return;
        }
    }

    function storageKey(path) {
        return "popular-post-view:" + path;
    }

    function formatViews(value) {
        var views = parseInt(value, 10);
        if (!isFinite(views) || views < 0) {
            return "--";
        }
        if (views >= 10000) {
            return (views / 10000).toFixed(1) + "w";
        }
        return String(views);
    }

    function normalizeLimit(value) {
        var limit = parseInt(value, 10);
        if (!isFinite(limit) || limit <= 0) {
            return "5";
        }
        return String(Math.min(limit, 10));
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
})();
