const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dataFilePath = path.join(__dirname, 'data', 'posts.json');
const POST_CATEGORIES = [
  'Community',
  'Politics',
  'Education',
  'Entertainment',
  'Technology',
  'Sports',
  'Others'
];

function normalizeCategory(category) {
  return POST_CATEGORIES.includes(category) ? category : 'Others';
}

function readData() {
  const raw = fs.readFileSync(dataFilePath, 'utf8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

const FALLBACK_NEWS = [
  {
    title: 'Typhoon response teams continue relief efforts after severe weather',
    summary: 'Government and local volunteers continue to distribute aid while communities recover from recent flooding and damaged roads.',
    source: 'ABS-CBN News',
    url: 'https://www.abs-cbn.com/'
  },
  {
    title: 'Students lead local campaigns for climate awareness and recycling',
    summary: 'Young leaders in different communities are pushing for greener initiatives such as waste segregation and tree planting.',
    source: 'ABS-CBN News',
    url: 'https://www.abs-cbn.com/'
  },
  {
    title: 'Small businesses adapt to digital shifts and online selling',
    summary: 'Entrepreneurs are turning to e-commerce and social media platforms to reach more customers and maintain operations.',
    source: 'ABS-CBN News',
    url: 'https://www.abs-cbn.com/'
  },
  {
    title: 'Education groups promote safe and inclusive classrooms',
    summary: 'Schools are focusing on programs that support mental wellness, student participation, and better learning environments.',
    source: 'ABS-CBN News',
    url: 'https://www.abs-cbn.com/'
  },
  {
    title: 'Health workers urge stronger community support for wellness programs',
    summary: 'Local leaders call for continued investment in preventive healthcare, vaccination campaigns, and public information drives.',
    source: 'ABS-CBN News',
    url: 'https://www.abs-cbn.com/'
  }
];

function decodeHtml(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

function stripHtml(value = '') {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

let newsCache = { articles: null, fetchedAt: 0 };

async function fetchAbsCbnNews() {
  const CACHE_DURATION_MS = 5 * 60 * 1000;
  if (newsCache.articles && Date.now() - newsCache.fetchedAt < CACHE_DURATION_MS) {
    return newsCache.articles;
  }

  const sources = [
    'https://www.abs-cbn.com/news/rss',
    'https://www.abs-cbn.com/',
    'https://news.abs-cbn.com/'
  ];

  for (const source of sources) {
    try {
      const response = await fetch(source, {
        headers: {
          'User-Agent': 'Mozilla/5.0 Bayan News/1.0',
          'Accept': 'text/html,application/xhtml+xml'
        }
      });

      if (!response.ok) continue;

      const text = await response.text();
      const articles = [];
      const seenUrls = new Set();
      const linkRegex = /<a[^>]+href="(\/(?:news|entertainment|sports|lifestyle|business)\/[^"?#]*\/\d{4}\/\d{2}\/\d{2}\/[^"?#]*)"[^>]*>/gi;
      let linkMatch;

      while ((linkMatch = linkRegex.exec(text)) !== null && articles.length < 12) {
        const relativeUrl = linkMatch[1];
        if (seenUrls.has(relativeUrl)) continue;

        const surroundingHtml = text.slice(linkMatch.index, linkMatch.index + 5000);
        const headingMatch = /<(?:h1|h2|h3|h4)[^>]*>([\s\S]*?)<\/(?:h1|h2|h3|h4)>/i.exec(surroundingHtml);
        const title = stripHtml(headingMatch ? headingMatch[1] : '');

        if (!title) continue;

        seenUrls.add(relativeUrl);
        const imageAltMatch = /<img[^>]+alt="([^"]+)"/i.exec(surroundingHtml);
        const summary = imageAltMatch
          ? decodeHtml(imageAltMatch[1]).slice(0, 180)
          : 'Read the latest news and updates from ABS-CBN News.';

        articles.push({
          title,
          summary,
          source: 'ABS-CBN News',
          url: `https://www.abs-cbn.com${relativeUrl}`
        });
      }

      if (articles.length > 0) {
        newsCache = { articles, fetchedAt: Date.now() };
        return articles;
      }
    } catch (error) {
      console.log('ABS-CBN live news fetch failed for source:', source, error.message);
    }
  }

  newsCache = { articles: FALLBACK_NEWS, fetchedAt: Date.now() };
  return FALLBACK_NEWS;
}

app.get('/', async (req, res) => {
  const data = readData();
  const selectedCategory = req.query.category || 'All';
  let posts = data.posts || [];

  if (selectedCategory !== 'All') {
    posts = posts.filter((post) => normalizeCategory(post.category) === normalizeCategory(selectedCategory));
  }

  const sortedPosts = [...posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const newsPreview = (await fetchAbsCbnNews()).slice(0, 3);
  const currentUser = 'Guest';

  res.render('home', {
    posts: sortedPosts,
    currentUser,
    pageTitle: 'Home',
    newsPreview,
    categories: POST_CATEGORIES,
    selectedCategory
  });
});

app.get('/post', (req, res) => {
  res.render('post', { pageTitle: 'Create Post', categories: POST_CATEGORIES });
});

app.post('/post', (req, res) => {
  const { title, author, content, category } = req.body;

  if (!title || !author || !content) {
    return res.status(400).send('Title, name, and content are required.');
  }

  const validCategory = normalizeCategory(category);
  const data = readData();
  const newPost = {
    id: Date.now(),
    title: title.trim(),
    author: author.trim(),
    content: content.trim(),
    category: validCategory,
    createdAt: new Date().toISOString(),
    likes: 0,
    comments: []
  };

  data.posts.push(newPost);
  writeData(data);

  res.redirect('/');
});

app.post('/posts/:id/like', (req, res) => {
  const postId = Number(req.params.id);
  const data = readData();

  const post = data.posts.find((item) => item.id === postId);
  if (!post) {
    return res.status(404).json({ message: 'Post not found' });
  }

  post.likes += 1;
  writeData(data);

  res.json({ likes: post.likes });
});

app.post('/posts/:id/comments', (req, res) => {
  const postId = Number(req.params.id);
  const { author, text } = req.body;

  if (!author || !text) {
    return res.status(400).json({ message: 'Name and comment are required.' });
  }

  const data = readData();
  const post = data.posts.find((item) => item.id === postId);
  if (!post) {
    return res.status(404).json({ message: 'Post not found' });
  }

  const newComment = {
    id: Date.now(),
    author: author.trim(),
    text: text.trim(),
    createdAt: new Date().toISOString(),
    replies: []
  };

  post.comments.push(newComment);
  writeData(data);

  res.redirect('/');
});

app.post('/posts/:postId/comments/:commentId/replies', (req, res) => {
  const postId = Number(req.params.postId);
  const commentId = Number(req.params.commentId);
  const { author, text } = req.body;

  if (!author || !text) {
    return res.status(400).json({ message: 'Name and reply are required.' });
  }

  const data = readData();
  const post = data.posts.find((item) => item.id === postId);
  if (!post) {
    return res.status(404).json({ message: 'Post not found' });
  }

  const comment = post.comments.find((item) => item.id === commentId);
  if (!comment) {
    return res.status(404).json({ message: 'Comment not found' });
  }

  comment.replies.push({
    id: Date.now(),
    author: author.trim(),
    text: text.trim(),
    createdAt: new Date().toISOString()
  });

  writeData(data);
  res.redirect('/');
});

app.post('/posts/:id/delete', (req, res) => {
  const postId = Number(req.params.id);
  const { author } = req.body;
  const data = readData();
  const post = data.posts.find((item) => item.id === postId);

  if (!post) {
    return res.status(404).send('Post not found.');
  }

  if (!author || post.author.trim().toLowerCase() !== author.trim().toLowerCase()) {
    return res.status(403).send('Only the person who created this post can delete it.');
  }

  data.posts = data.posts.filter((item) => item.id !== postId);
  writeData(data);
  res.redirect('/');
});

app.post('/posts/:postId/comments/:commentId/delete', (req, res) => {
  const postId = Number(req.params.postId);
  const commentId = Number(req.params.commentId);
  const { author } = req.body;
  const data = readData();

  const post = data.posts.find((item) => item.id === postId);
  if (!post) {
    return res.status(404).json({ message: 'Post not found' });
  }

  const comment = post.comments.find((item) => item.id === commentId);
  if (!comment) {
    return res.status(404).json({ message: 'Comment not found' });
  }

  if (!author || comment.author.trim().toLowerCase() !== author.trim().toLowerCase()) {
    return res.status(403).send('Only the person who wrote this comment can delete it.');
  }

  post.comments = post.comments.filter((item) => item.id !== commentId);
  writeData(data);
  res.redirect('/');
});

app.get('/newsfeed', async (req, res) => {
  const allArticles = await fetchAbsCbnNews();
  const query = (req.query.q || '').trim().toLowerCase();
  const articles = query
    ? allArticles.filter((article) =>
        `${article.title} ${article.summary} ${article.source}`.toLowerCase().includes(query)
      )
    : allArticles;

  res.render('newsfeed', {
    pageTitle: 'News Feed',
    articles,
    query
  });
});

app.listen(PORT, () => {
  console.log(`Bayan News is running at http://localhost:${PORT}`);
});
