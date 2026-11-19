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

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'posts.json'), 'utf8'));
const posts = [...(data.posts || [])].sort(
  (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
);

const newsPreview = [
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

async function render(templateName, outputName, locals) {
  const template = path.join(root, templateName);
  const html = await ejs.renderFile(template, locals);
  fs.writeFileSync(path.join(output, outputName), html);
}

async function main() {
  await render('index.ejs', 'index.html', {
    posts,
    currentUser: 'Guest',
    pageTitle: 'Home',
    newsPreview,
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
    articles: newsPreview,
    query: '',
    isStaticDeploy: true
  });

  fs.cpSync(path.join(root, 'public'), path.join(output), { recursive: true });

  fs.writeFileSync(path.join(output, '.nojekyll'), '');
  console.log(`Built static site in ${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
