(function () {
  if (!document.querySelector('main')) return;

  var banner = document.createElement('div');
  banner.className = 'static-banner';
  banner.setAttribute('role', 'status');
  banner.textContent =
    'Static demo: likes, comments, and new posts need the local server. Run "npm start" to use them.';
  var main = document.querySelector('main');
  main.insertBefore(banner, main.firstChild);

  function showNotice(form) {
    var existing = form.querySelector('.static-notice');
    if (existing) return;
    var notice = document.createElement('p');
    notice.className = 'static-notice';
    notice.setAttribute('role', 'alert');
    notice.textContent = 'Unavailable on GitHub Pages. Run the app locally to use this feature.';
    form.appendChild(notice);
  }

  document.addEventListener(
    'submit',
    function (event) {
      var form = event.target;
      if (!form || !form.getAttribute) return;
      var method = (form.getAttribute('method') || 'get').toLowerCase();
      if (method !== 'post') return;
      event.preventDefault();
      event.stopPropagation();
      showNotice(form);
    },
    true
  );
})();
