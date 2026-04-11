(function () {
  function initSmoothAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener("click", function (event) {
        var href = anchor.getAttribute("href");
        if (!href || href.length < 2) return;
        var target = document.querySelector(href);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function buildPageShell() {
    var article = document.querySelector("main .card article, main article.card");
    if (!article) return null;
    if (document.querySelector(".page-shell")) return article;

    var main = article.parentElement;
    if (!main) return null;

    var shell = document.createElement("div");
    shell.className = "page-shell";

    var toc = document.createElement("aside");
    toc.className = "doc-toc";
    toc.innerHTML = "<h2>On This Page</h2><ul></ul>";

    main.insertBefore(shell, article);
    shell.appendChild(toc);
    shell.appendChild(article);

    return article;
  }

  function ensureHeadingIds() {
    document.querySelectorAll("article h2, article h3").forEach(function (heading) {
      if (!heading.id) {
        heading.id = (heading.textContent || "section")
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");
      }
    });
  }

  function addHeadingCopyLinks() {
    document.querySelectorAll("article h2[id], article h3[id]").forEach(function (heading) {
      if (heading.querySelector(".section-anchor")) return;
      var link = document.createElement("a");
      link.className = "section-anchor";
      link.href = "#" + heading.id;
      link.textContent = "#";
      link.title = "Copy section link";
      link.addEventListener("click", function (event) {
        event.preventDefault();
        var url = window.location.origin + window.location.pathname + "#" + heading.id;
        navigator.clipboard.writeText(url).catch(function () {});
        window.location.hash = heading.id;
      });
      heading.appendChild(link);
    });
  }

  function buildToc() {
    var tocList = document.querySelector(".doc-toc ul");
    if (!tocList) return;
    tocList.innerHTML = "";

    var sections = document.querySelectorAll("article h2[id], article h3[id]");
    sections.forEach(function (heading) {
      var li = document.createElement("li");
      if (heading.tagName === "H3") {
        li.style.marginLeft = "0.8rem";
      }
      var a = document.createElement("a");
      a.href = "#" + heading.id;
      a.textContent = heading.textContent.replace("#", "").trim();
      li.appendChild(a);
      tocList.appendChild(li);
    });

    var tocLinks = tocList.querySelectorAll("a");
    if (!tocLinks.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          tocLinks.forEach(function (link) { link.classList.remove("active"); });
          var active = tocList.querySelector('a[href="#' + entry.target.id + '"]');
          if (active) active.classList.add("active");
        });
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0.01 }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  function addBackToTop() {
    if (document.querySelector(".to-top")) return;
    var btn = document.createElement("button");
    btn.className = "to-top";
    btn.type = "button";
    btn.textContent = "↑";
    btn.setAttribute("aria-label", "Back to top");
    btn.hidden = true;
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener("scroll", function () {
      btn.hidden = window.scrollY < 400;
    });
    document.body.appendChild(btn);
  }

  function addPrevNextLinks() {
    if (!window.__MANUAL_INDEX__ || !Array.isArray(window.__MANUAL_INDEX__.pages)) return;
    var pages = window.__MANUAL_INDEX__.pages;
    if (!pages.length) return;

    var currentName = window.location.pathname.split("/").pop();
    var currentIndex = pages.findIndex(function (p) {
      return (p.url || "").split("/").pop() === currentName;
    });
    if (currentIndex < 0) return;

    var article = document.querySelector("main article.card");
    if (!article) return;
    if (article.querySelector(".manual-pagination")) return;

    var prev = currentIndex > 0 ? pages[currentIndex - 1] : null;
    var next = currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null;
    if (!prev && !next) return;

    var nav = document.createElement("nav");
    nav.className = "manual-pagination";
    var html = "";
    if (prev) {
      html += '<a class="page-nav page-nav-prev" href="' + prev.url + '"><span>Previous</span><strong>' + prev.title + '</strong></a>';
    } else {
      html += '<span class="page-nav placeholder"></span>';
    }
    if (next) {
      html += '<a class="page-nav page-nav-next" href="' + next.url + '"><span>Next</span><strong>' + next.title + '</strong></a>';
    }
    nav.innerHTML = html;
    article.appendChild(nav);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSmoothAnchors();

    var hasManualArticle = !!document.querySelector("main article.card");
    if (hasManualArticle) {
      buildPageShell();
      ensureHeadingIds();
      addHeadingCopyLinks();
      buildToc();
      addPrevNextLinks();
      addBackToTop();
    }
  });
})();
