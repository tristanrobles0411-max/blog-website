(function () {
  var grid = document.getElementById('newsGrid');
  if (!grid) return;

  var form = document.getElementById('newsSearchForm');
  var input = document.getElementById('newsSearchInput');
  var clearLink = document.getElementById('clearNewsSearch');
  var emptyState = document.getElementById('newsEmptyState');
  var emptyQuery = document.getElementById('newsEmptyQuery');
  var resultCount = document.getElementById('newsResultCount');
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.news-card'));

  function searchText(card) {
    return [card.dataset.title, card.dataset.summary, card.dataset.source]
      .join(' ')
      .toLowerCase();
  }

  function applySearch(query, updateUrl) {
    var trimmed = (query || '').trim();
    var needle = trimmed.toLowerCase();
    var visible = 0;

    cards.forEach(function (card) {
      var matches = !needle || searchText(card).indexOf(needle) !== -1;
      card.hidden = !matches;
      if (matches) visible += 1;
    });

    if (emptyState) {
      var showEmpty = needle.length > 0 && cards.length > 0 && visible === 0;
      emptyState.hidden = !showEmpty;
      if (showEmpty && emptyQuery) emptyQuery.textContent = trimmed;
    }

    if (clearLink) clearLink.style.display = trimmed ? '' : 'none';

    if (resultCount) {
      resultCount.textContent = needle
        ? visible + ' of ' + cards.length + (cards.length === 1 ? ' story' : ' stories') + ' match'
        : cards.length + (cards.length === 1 ? ' story' : ' stories');
    }

    if (updateUrl) {
      var url = new URL(window.location.href);
      if (trimmed) url.searchParams.set('q', trimmed);
      else url.searchParams.delete('q');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  }

  var params = new URLSearchParams(window.location.search);
  var initialQuery = params.get('q') || '';
  if (input) input.value = initialQuery;
  applySearch(initialQuery, false);

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      applySearch(input ? input.value : '', true);
    });
  }

  if (input) {
    input.addEventListener('input', function () {
      applySearch(input.value, false);
    });

    input.addEventListener('search', function () {
      applySearch(input.value, true);
    });
  }

  if (clearLink) {
    clearLink.addEventListener('click', function (event) {
      event.preventDefault();
      if (input) {
        input.value = '';
        input.focus();
      }
      applySearch('', true);
    });
  }

  window.addEventListener('popstate', function () {
    var query = new URLSearchParams(window.location.search).get('q') || '';
    if (input) input.value = query;
    applySearch(query, false);
  });
})();
