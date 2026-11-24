const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const root = __dirname;
const output = path.join(root, '_site');

const categories = [
  'Community',
  'Politics',
  'Education',
  'Entertainment',
  'Technology',
  'Sports',
  'Others'
];

const NEWS_FEED_URL =
  'https://news.google.com/rss/search?q=site:abs-cbn.com&hl=en-PH&gl=PH&ceid=PH:en';
const NEWS_LIMIT = 24;

const newsFallback = [
  {
    title: 'Typhoon response teams continue relief efforts after severe weather',
    summary: 'Government and local volunteers continue to distribute aid while communities recover from recent flooding and damaged roads.',
    source: 'ABS-CBN News',
    url: 'https://www.abs-cbn.com/'
  },
  {
    title: 'Students lead local campaigns for climate awareness and recycling',
    summary: 'Young leaders are pushing for greener initiatives such as waste segregation and tree planting.',
    source: 'ABS-CBN News',
    url: 'https://www.abs-cbn.com/'
  },
  {
    title: 'Small businesses adapt to digital shifts and online selling',
    summary: 'Entrepreneurs are turning to e-commerce and social media platforms to reach more customers.',
    source: 'ABS-CBN News',
    url: 'https://www.abs-cbn.com/'
  }
];

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function decodeXml(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(xml, tag) {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i').exec(xml);
  return match ? match[1] : '';
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = date.getUTCDate();
  const month = MONTHS[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  return `${month} ${day}, ${year}`;
}

async function fetchNewsArticles() {
  try {
    const response = await fetch(NEWS_FEED_URL, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BayanNews/1.0)',
        Accept: 'application/rss+xml, application/xml, text/xml'
      }
    });

    if (!response.ok) {
      throw new Error(`News feed responded with ${response.status}`);
    }

    const xml = await response.text();
    const articles = [];
    const seen = new Set();
    const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
    let itemMatch;

    while ((itemMatch = itemPattern.exec(xml)) !== null && articles.length < NEWS_LIMIT) {
      const item = itemMatch[1];
      const url = decodeXml(extractTag(item, 'link'));
      const source = decodeXml(extractTag(item, 'source')) || 'ABS-CBN News';
      let title = decodeXml(extractTag(item, 'title'));
      const publishedAt = extractTag(item, 'pubDate');

      if (!title || !url || seen.has(url)) continue;

      const suffix = ` - ${source}`;
      if (title.endsWith(suffix)) title = title.slice(0, -suffix.length);
      if (!title) continue;

      seen.add(url);
      const published = formatDate(publishedAt);

      articles.push({
        title,
        summary: published
          ? `Latest ABS-CBN News report, published ${published}.`
          : 'Latest news and updates from ABS-CBN News.',
        source,
        url
      });
    }

    if (articles.length > 0) return articles;
    console.warn('News feed returned no usable items; using fallback stories.');
  } catch (error) {
    console.warn('Could not fetch the live news feed; using fallback stories:', error.message);
  }

  return newsFallback;
}

async function render(templateName, outputName, locals) {
  const template = path.join(root, templateName);
  const html = await ejs.renderFile(template, locals);
  fs.writeFileSync(path.join(output, outputName), html);
}

async function main() {
  fs.rmSync(output, { recursive: true, force: true });
  fs.mkdirSync(output, { recursive: true });

  const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'posts.json'), 'utf8'));
  const posts = [...(data.posts || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const articles = await fetchNewsArticles();

  await render('index.ejs', 'index.html', {
    posts,
    currentUser: 'Guest',
    pageTitle: 'Home',
    newsPreview: articles.slice(0, 3),
    categories,
    selectedCategory: 'All',
    isStaticDeploy: true
  });

  await render('post.ejs', 'post.html', {
    pageTitle: 'Create Post',
    categories,
    posts,
    isStaticDeploy: true
  });

  await render('newsfeed.ejs', 'newsfeed.html', {
    pageTitle: 'News Feed',
    articles,
    query: '',
    isStaticDeploy: true
  });

  fs.cpSync(path.join(root, 'public'), path.join(output), { recursive: true });

  fs.writeFileSync(path.join(output, '.nojekyll'), '');
  console.log(`Built static site in ${output} with ${articles.length} news stories`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
