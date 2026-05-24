(function () {
    function initMenuScrollMemory() {
        var menu = document.getElementById("menu");
        if (!menu) {
            return;
        }

        menu.scrollLeft = localStorage.getItem("menu-scroll-position");
        menu.onscroll = function () {
            localStorage.setItem("menu-scroll-position", menu.scrollLeft);
        };
    }

    function initSmoothAnchors() {
        document.querySelectorAll("a[href^=\"#\"]").forEach(function (anchor) {
            anchor.addEventListener("click", function (event) {
                var href = this.getAttribute("href");
                if (!href || href === "#") {
                    return;
                }

                var id = href.substr(1);
                var target = document.getElementById(decodeURIComponent(id));
                if (!target) {
                    return;
                }

                event.preventDefault();
                if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                    target.scrollIntoView({ behavior: "smooth" });
                } else {
                    target.scrollIntoView();
                }

                if (id === "top") {
                    history.replaceState(null, null, " ");
                } else {
                    history.pushState(null, null, "#" + id);
                }
            });
        });
    }

    function initScrollToTop() {
        var topLink = document.getElementById("top-link");
        if (!topLink) {
            return;
        }

        window.addEventListener("scroll", function () {
            if (document.body.scrollTop > 800 || document.documentElement.scrollTop > 800) {
                topLink.style.visibility = "visible";
                topLink.style.opacity = "1";
            } else {
                topLink.style.visibility = "hidden";
                topLink.style.opacity = "0";
            }
        });
    }

    function initThemeToggle() {
        var themeToggle = document.getElementById("theme-toggle");
        if (!themeToggle) {
            return;
        }

        themeToggle.addEventListener("click", function () {
            if (document.body.className.includes("dark")) {
                document.body.classList.remove("dark");
                localStorage.setItem("pref-theme", "light");
            } else {
                document.body.classList.add("dark");
                localStorage.setItem("pref-theme", "dark");
            }
        });
    }

    function initCodeCopyButtons() {
        var script = document.currentScript;
        if (!script || script.getAttribute("data-code-copy-enabled") !== "true") {
            return;
        }

        var copyText = script.getAttribute("data-code-copy") || "copy";
        var copiedText = script.getAttribute("data-code-copied") || "copied!";

        document.querySelectorAll("pre > code").forEach(function (codeblock) {
            var container = codeblock.parentNode.parentNode;
            var copybutton = document.createElement("button");
            copybutton.classList.add("copy-code");
            copybutton.innerHTML = copyText;

            function copyingDone() {
                copybutton.innerHTML = copiedText;
                setTimeout(function () {
                    copybutton.innerHTML = copyText;
                }, 2000);
            }

            copybutton.addEventListener("click", function () {
                if ("clipboard" in navigator) {
                    navigator.clipboard.writeText(codeblock.textContent);
                    copyingDone();
                    return;
                }

                var range = document.createRange();
                range.selectNodeContents(codeblock);
                var selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                try {
                    document.execCommand("copy");
                    copyingDone();
                } catch (error) {
                    return;
                }
                selection.removeRange(range);
            });

            if (container.classList.contains("highlight")) {
                container.appendChild(copybutton);
            } else if (container.parentNode.firstChild === container) {
                return;
            } else if (codeblock.parentNode.parentNode.parentNode.parentNode.parentNode.nodeName === "TABLE") {
                codeblock.parentNode.parentNode.parentNode.parentNode.parentNode.appendChild(copybutton);
            } else {
                codeblock.parentNode.appendChild(copybutton);
            }
        });
    }

    initMenuScrollMemory();
    initSmoothAnchors();
    initScrollToTop();
    initThemeToggle();
    initCodeCopyButtons();
})();
