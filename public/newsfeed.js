
(function () {
  var API_URL = 'https://bayan-news-api.tristanrobles0411.workers.dev/api/news';
  var REFRESH_INTERVAL = 60000;

  var grid = document.getElementById('newsGrid');
  if (!grid) return;

  var form = document.getElementById('newsSearchForm');
  var input = document.getElementById('newsSearchInput');
  var clearLink = document.getElementById('clearNewsSearch');
  var emptyState = document.getElementById('newsEmptyState');
  var emptyQuery = document.getElementById('newsEmptyQuery');
  var resultCount = document.getElementById('newsResultCount');

  var cards = Array.prototype.slice.call(
    grid.querySelectorAll('.news-card')
  );

  function searchText(card) {
    return [
      card.dataset.title,
      card.dataset.summary,
      card.dataset.source
    ].join(' ').toLowerCase();
  }

  function applySearch(query, updateUrl) {
    var trimmed = (query || '').trim();
    var needle = trimmed.toLowerCase();
    var visible = 0;

    cards.forEach(function (card) {
      var matches = !needle || searchText(card).indexOf(needle) !== -1;
      card.hidden = !matches;
      if (matches) visible++;
    });

    if (emptyState) {
      var showEmpty = needle.length > 0 && visible === 0;
      emptyState.hidden = !showEmpty;
      if (showEmpty && emptyQuery) {
        emptyQuery.textContent = trimmed;
      }
    }

    if (clearLink) {
      clearLink.style.display = trimmed ? '' : 'none';
    }

    if (resultCount) {
      resultCount.textContent = needle
        ? visible + ' of ' + cards.length + ' stories match'
        : cards.length + (cards.length === 1 ? ' story' : ' stories');
    }

    if (updateUrl) {
      var url = new URL(window.location.href);
      if (trimmed) url.searchParams.set('q', trimmed);
      else url.searchParams.delete('q');

      window.history.replaceState(
        {},
        '',
        url.pathname + url.search + url.hash
      );
    }
  }

  function createCard(article) {
    var card = document.createElement('article');
    card.className = 'news-card';

    card.dataset.title = article.title || '';
    card.dataset.summary = article.summary || '';
    card.dataset.source = article.source || 'News';

    var tag = document.createElement('div');
    tag.className = 'news-tag';
    tag.textContent = article.source || 'News';

    var title = document.createElement('h3');
    title.textContent = article.title || 'Untitled story';

    var summary = document.createElement('p');
    summary.textContent = article.summary || '';

    var link = document.createElement('a');
    link.href = article.url || '#';
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    link.textContent = 'Read more';

    card.appendChild(tag);
    card.appendChild(title);
    card.appendChild(summary);
    card.appendChild(link);

    return card;
  }

  async function loadNews() {
    try {
      var response = await fetch(API_URL, {
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('News API request failed');
      }

      var data = await response.json();

      if (!data.success || !Array.isArray(data.articles)) {
        throw new Error('Invalid news data');
      }

      var currentQuery = input ? input.value : '';

      grid.innerHTML = '';
      data.articles.forEach(function (article) {
        grid.appendChild(createCard(article));
      });

      cards = Array.prototype.slice.call(
        grid.querySelectorAll('.news-card')
      );

      applySearch(currentQuery, false);

    } catch (error) {
      console.error('Unable to refresh news:', error);
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

  loadNews();
  setInterval(loadNews, REFRESH_INTERVAL);
})();
