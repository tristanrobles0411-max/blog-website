
(function () {
  var API_URL = 'https://bayan-news-api.tristanrobles0411.workers.dev/api/news';
  var REFRESH_INTERVAL = 60000;

  var grid = document.getElementById('newsGrid');
  if (!grid) return;

  function createCard(article) {
    var card = document.createElement('article');
    card.className = 'news-card';

    var source = document.createElement('div');
    source.className = 'news-tag';
    source.textContent = article.source || 'News';

    var title = document.createElement('h3');
    title.textContent = article.title || 'Untitled story';

    var summary = document.createElement('p');
    summary.textContent = article.summary || '';

    var link = document.createElement('a');
    link.href = article.url || '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Read more';

    card.appendChild(source);
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
        throw new Error('News API request failed: ' + response.status);
      }

      var data = await response.json();

      if (!data.success || !Array.isArray(data.articles)) {
        throw new Error('Invalid news API response');
      }

      var fragment = document.createDocumentFragment();

      data.articles.forEach(function (article) {
        fragment.appendChild(createCard(article));
      });

      grid.replaceChildren(fragment);

    } catch (error) {
      console.error('Unable to refresh news:', error);
    }
  }

  loadNews();
  setInterval(loadNews, REFRESH_INTERVAL);
})();
