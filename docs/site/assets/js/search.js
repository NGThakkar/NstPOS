(function () {
  function normalize(value) {
    return (value || "").toLowerCase().trim();
  }

  function difficultyClass(value) {
    var v = normalize(value);
    if (v === "beginner") return "beginner";
    if (v === "intermediate") return "intermediate";
    if (v === "advanced") return "advanced";
    return "";
  }

  function createOption(value) {
    var opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    return opt;
  }

  function renderCards(items, grid) {
    grid.innerHTML = "";
    items.forEach(function (item, index) {
      var card = document.createElement("article");
      card.className = "manual-card";
      card.style.animationDelay = (index * 18) + "ms";

      var difficulty = item.difficulty || "N/A";
      var diffClass = difficultyClass(difficulty);

      card.innerHTML =
        '<h3><a href="' + item.url + '">' + item.title + '</a></h3>' +
        '<div class="meta-strip">' +
          '<span class="pill">' + (item.role || "N/A") + '</span>' +
          '<span class="pill ' + diffClass + '">' + difficulty + '</span>' +
          '<span class="pill">' + (item.estimatedTime || "N/A") + '</span>' +
        '</div>' +
        '<p>' + (item.excerpt || "No overview available.") + '</p>';

      grid.appendChild(card);
    });
  }

  function updateCount(node, count) {
    node.textContent = count + (count === 1 ? " manual" : " manuals");
  }

  function initIndexPage() {
    var searchInput = document.getElementById("site-search");
    var roleFilter = document.getElementById("role-filter");
    var difficultyFilter = document.getElementById("difficulty-filter");
    var grid = document.getElementById("manual-grid");
    var counter = document.getElementById("manual-count");
    var indexDate = document.getElementById("index-date");
    var emptyState = document.getElementById("empty-state");

    if (!searchInput || !roleFilter || !difficultyFilter || !grid || !counter || !indexDate || !emptyState) {
      return;
    }

    function consumeData(data) {
        var pages = Array.isArray(data.pages) ? data.pages : [];

        var roles = Array.from(new Set(pages.map(function (p) { return p.role; }).filter(Boolean))).sort();
        var difficulties = Array.from(new Set(pages.map(function (p) { return p.difficulty; }).filter(Boolean))).sort();

        roles.forEach(function (role) { roleFilter.appendChild(createOption(role)); });
        difficulties.forEach(function (level) { difficultyFilter.appendChild(createOption(level)); });

        if (data.generatedOn) {
          var dt = new Date(data.generatedOn);
          indexDate.textContent = "Indexed: " + dt.toLocaleDateString();
        } else {
          indexDate.textContent = "Index ready";
        }

        function applyFilters() {
          var term = normalize(searchInput.value);
          var role = roleFilter.value;
          var level = difficultyFilter.value;

          var filtered = pages.filter(function (item) {
            var matchRole = role === "all" || item.role === role;
            var matchLevel = level === "all" || item.difficulty === level;

            var haystack = [
              item.title,
              item.client,
              item.role,
              item.difficulty,
              item.excerpt,
              (item.keywords || []).join(" ")
            ].join(" ").toLowerCase();

            var matchTerm = !term || haystack.indexOf(term) >= 0;
            return matchRole && matchLevel && matchTerm;
          });

          renderCards(filtered, grid);
          updateCount(counter, filtered.length);
          emptyState.hidden = filtered.length !== 0;
        }

        searchInput.addEventListener("input", applyFilters);
        roleFilter.addEventListener("change", applyFilters);
        difficultyFilter.addEventListener("change", applyFilters);

        renderCards(pages, grid);
        updateCount(counter, pages.length);
    }

    if (window.__MANUAL_INDEX__ && Array.isArray(window.__MANUAL_INDEX__.pages)) {
      consumeData(window.__MANUAL_INDEX__);
      return;
    }

    fetch("search-index.json")
      .then(function (response) { return response.json(); })
      .then(function (data) {
        consumeData(data);
      })
      .catch(function () {
        indexDate.textContent = "Failed to load index";
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initIndexPage();
  });
})();
