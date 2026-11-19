(function () {
  var STORAGE_KEY = 'bayan-news-state-v1';
  var CATEGORIES = [
    'Community',
    'Politics',
    'Education',
    'Entertainment',
    'Technology',
    'Sports',
    'Others'
  ];

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function readSeedPosts() {
    var node = document.getElementById('seed-posts');
    if (!node) return [];
    try {
      var parsed = JSON.parse(node.textContent);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function loadPosts() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.posts)) return parsed.posts;
      }
    } catch (error) {
      // Corrupt or unavailable storage: fall back to the seeded posts.
    }
    return readSeedPosts();
  }

  function savePosts(posts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ posts: posts }));
    } catch (error) {
      // Private browsing or a full quota: changes just won't persist.
    }
  }

  function createId() {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  function formatDate(value) {
    var date = new Date(value);
    return isNaN(date.getTime()) ? '' : date.toLocaleString();
  }

  function findPost(posts, id) {
    return posts.find(function (post) {
      return String(post.id) === String(id);
    });
  }

  function renderComment(comment) {
    var replies = (comment.replies || [])
      .map(function (reply) {
        return (
          '<div class="reply-box" style="margin-left: 18px; margin-top: 10px;">' +
          '<strong>' + escapeHtml(reply.author) + '</strong>' +
          '<div>' + escapeHtml(reply.text) + '</div>' +
          '</div>'
        );
      })
      .join('');

    return (
      '<div class="comment-box" data-comment-id="' + escapeHtml(comment.id) + '">' +
      '<strong>' + escapeHtml(comment.author) + '</strong>' +
      '<div>' + escapeHtml(comment.text) + '</div>' +
      replies +
      '<form class="delete-comment-form" style="margin-top: 10px; display: flex; align-items: center; gap: 8px;">' +
      '<input type="text" name="author" placeholder="Your name" required style="width: 140px; padding: 8px 10px;" />' +
      '<button class="delete-btn" type="submit">Delete Comment</button>' +
      '</form>' +
      '<form class="reply-form">' +
      '<input type="text" name="author" placeholder="Your name" required />' +
      '<textarea name="text" placeholder="Write a reply..." required></textarea>' +
      '<button class="secondary-btn" type="submit">Reply</button>' +
      '</form>' +
      '</div>'
    );
  }

  function renderPost(post) {
    var comments = (post.comments || []).map(renderComment).join('');

    return (
      '<article class="post-card" data-post-id="' + escapeHtml(post.id) + '"' +
      ' data-title="' + escapeHtml(post.title) + '"' +
      ' data-author="' + escapeHtml(post.author) + '"' +
      ' data-content="' + escapeHtml(post.content) + '"' +
      ' data-category="' + escapeHtml(post.category || 'Others') + '">' +
      '<div class="post-category">' + escapeHtml(post.category || 'Others') + '</div>' +
      '<h3>' + escapeHtml(post.title) + '</h3>' +
      '<div class="meta">By <strong>' + escapeHtml(post.author) + '</strong> · ' + escapeHtml(formatDate(post.createdAt)) + '</div>' +
      '<p>' + escapeHtml(post.content) + '</p>' +
      '<div class="post-actions">' +
      '<button class="like-button" type="button" data-action="like">❤ <span class="like-count">' + Number(post.likes || 0) + '</span></button>' +
      '<form class="delete-post-form" style="display: flex; align-items: center; gap: 8px;">' +
      '<input type="text" name="author" placeholder="Your name" required style="width: 140px; padding: 8px 10px;" />' +
      '<button class="delete-btn" type="submit">Delete Post</button>' +
      '</form>' +
      '</div>' +
      '<div class="comment-list">' +
      comments +
      '<form class="comment-form">' +
      '<input type="text" name="author" placeholder="Your name" required />' +
      '<textarea name="text" placeholder="Write a comment..." required></textarea>' +
      '<button class="secondary-btn" type="submit">Comment</button>' +
      '</form>' +
      '</div>' +
      '</article>'
    );
  }

  function setupHome() {
    var grid = document.getElementById('postGrid');
    if (!grid) return;

    var searchInput = document.getElementById('searchInput');
    var searchForm = document.getElementById('searchForm');
    var clearSearchBtn = document.getElementById('clearSearchBtn');
    var noPostsFound = document.getElementById('noPostsFound');
    var state = { posts: loadPosts() };
    savePosts(state.posts);

    function currentCategory() {
      var value = new URLSearchParams(window.location.search).get('category');
      return CATEGORIES.indexOf(value) === -1 ? 'All' : value;
    }

    function markActiveCategory() {
      var selected = currentCategory();
      document.querySelectorAll('.category-filter').forEach(function (link) {
        var target = new URL(link.href, window.location.href).searchParams.get('category') || 'All';
        link.classList.toggle('active', target === selected);
      });
    }

    function applySearch() {
      var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
      var cards = grid.querySelectorAll('.post-card');
      var visibleCount = 0;

      cards.forEach(function (card) {
        var matches = !query ||
          (card.dataset.title || '').toLowerCase().indexOf(query) !== -1 ||
          (card.dataset.author || '').toLowerCase().indexOf(query) !== -1 ||
          (card.dataset.content || '').toLowerCase().indexOf(query) !== -1;

        card.style.display = matches ? 'block' : 'none';
        if (matches) visibleCount += 1;
      });

      if (noPostsFound) {
        noPostsFound.style.display = cards.length > 0 && visibleCount === 0 ? 'block' : 'none';
      }
    }

    function render() {
      var selected = currentCategory();
      var posts = state.posts
        .filter(function (post) {
          return selected === 'All' || (post.category || 'Others') === selected;
        })
        .slice()
        .sort(function (a, b) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

      grid.innerHTML = posts.length
        ? posts.map(renderPost).join('')
        : '<div class="empty-state">No posts yet. Be the first person to share something.</div>';

      markActiveCategory();
      applySearch();
    }

    function update(mutate) {
      mutate(state.posts);
      savePosts(state.posts);
      render();
    }

    grid.addEventListener('click', function (event) {
      var button = event.target.closest('[data-action="like"]');
      if (!button) return;

      var card = button.closest('.post-card');
      if (!card) return;

      update(function (posts) {
        var post = findPost(posts, card.dataset.postId);
        if (post) post.likes = Number(post.likes || 0) + 1;
      });
    });

    grid.addEventListener('submit', function (event) {
      var form = event.target;
      if (!form || !form.classList) return;

      var card = form.closest('.post-card');
      if (!card) return;

      var postId = card.dataset.postId;
      var authorInput = form.querySelector('[name="author"]');
      var author = authorInput ? authorInput.value.trim() : '';

      if (form.classList.contains('delete-post-form')) {
        event.preventDefault();
        update(function (posts) {
          var post = findPost(posts, postId);
          if (!post) return;
          if (post.author.trim().toLowerCase() !== author.toLowerCase()) {
            window.alert('Only the person who created this post can delete it.');
            return;
          }
          state.posts = posts.filter(function (item) {
            return String(item.id) !== String(postId);
          });
        });
        return;
      }

      if (form.classList.contains('comment-form')) {
        event.preventDefault();
        var commentText = form.querySelector('[name="text"]').value.trim();
        if (!author || !commentText) return;

        update(function (posts) {
          var post = findPost(posts, postId);
          if (!post) return;
          post.comments = post.comments || [];
          post.comments.push({
            id: createId(),
            author: author,
            text: commentText,
            createdAt: new Date().toISOString(),
            replies: []
          });
        });
        return;
      }

      if (form.classList.contains('reply-form')) {
        event.preventDefault();
        var replyText = form.querySelector('[name="text"]').value.trim();
        var commentBox = form.closest('.comment-box');
        if (!author || !replyText || !commentBox) return;

        update(function (posts) {
          var post = findPost(posts, postId);
          if (!post) return;
          var comment = (post.comments || []).find(function (item) {
            return String(item.id) === String(commentBox.dataset.commentId);
          });
          if (!comment) return;
          comment.replies = comment.replies || [];
          comment.replies.push({
            id: createId(),
            author: author,
            text: replyText,
            createdAt: new Date().toISOString()
          });
        });
        return;
      }

      if (form.classList.contains('delete-comment-form')) {
        event.preventDefault();
        var commentBoxToDelete = form.closest('.comment-box');
        if (!commentBoxToDelete) return;

        update(function (posts) {
          var post = findPost(posts, postId);
          if (!post) return;
          var comment = (post.comments || []).find(function (item) {
            return String(item.id) === String(commentBoxToDelete.dataset.commentId);
          });
          if (!comment) return;
          if (comment.author.trim().toLowerCase() !== author.toLowerCase()) {
            window.alert('Only the person who wrote this comment can delete it.');
            return;
          }
          post.comments = post.comments.filter(function (item) {
            return String(item.id) !== String(commentBoxToDelete.dataset.commentId);
          });
        });
      }
    });

    if (searchInput) searchInput.addEventListener('input', applySearch);
    if (searchForm) {
      searchForm.addEventListener('submit', function (event) {
        event.preventDefault();
        applySearch();
      });
    }
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', function () {
        searchInput.value = '';
        applySearch();
      });
    }

    render();
  }

  function setupPostForm() {
    var form = document.querySelector('.form-grid');
    if (!form || document.getElementById('postGrid')) return;

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var title = form.querySelector('[name="title"]').value.trim();
      var author = form.querySelector('[name="author"]').value.trim();
      var content = form.querySelector('[name="content"]').value.trim();
      var category = form.querySelector('[name="category"]').value;

      if (!title || !author || !content) {
        window.alert('Title, name, and content are required.');
        return;
      }

      var posts = loadPosts();
      posts.push({
        id: createId(),
        title: title,
        author: author,
        content: content,
        category: CATEGORIES.indexOf(category) === -1 ? 'Others' : category,
        createdAt: new Date().toISOString(),
        likes: 0,
        comments: []
      });
      savePosts(posts);
      window.location.href = './';
    });
  }

  setupHome();
  setupPostForm();
})();
