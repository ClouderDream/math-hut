/**
 * 构建入口：把 content/ 下的 Markdown 编译成纯静态站点 dist/
 * 用法：npm run build
 */
const fs = require('fs');
const path = require('path');

const { load, ROOT } = require('./lib/config');
const { parseFile } = require('./lib/frontmatter');
const { renderMarkdown } = require('./lib/markdown');
const { readingTime } = require('./lib/reading-time');
const { url } = require('./lib/url');
const { rmDir, writeFile, copyDir, copyFile } = require('./lib/writer');
const mathPlugin = require('./lib/md-math');

const genIndex = require('./generators/index');
const genPost = require('./generators/post');
const genTag = require('./generators/tag');
const genArchive = require('./generators/archive');
const genPage = require('./generators/page');
const genFeed = require('./generators/feed');
const genSearchIndex = require('./generators/search-index');
const genAdmin = require('./generators/admin');

const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'content');
const POSTS = path.join(CONTENT, 'posts');
const PAGES = path.join(CONTENT, 'pages');

function log(msg) { console.log(msg); }

async function build() {
  const t0 = Date.now();
  const cfg = load();
  const BASE = cfg.site.base;
  const BUILD_ID = Date.now().toString(36);

  log(`\n[build] ${cfg.site.title}  →  dist/   (base = ${BASE})`);

  // ---------- 1. 清理 ----------
  rmDir(DIST);
  fs.mkdirSync(DIST, { recursive: true });

  // ---------- 2. 读文章 ----------
  if (!fs.existsSync(POSTS)) fs.mkdirSync(POSTS, { recursive: true });
  const files = fs.readdirSync(POSTS).filter((f) => f.endsWith('.md')).sort();

  mathPlugin.resetErrors();
  mathPlugin.setOptions({ macros: cfg.math.macros || {} });

  let posts = [];
  for (const f of files) {
    const meta = parseFile(path.join(POSTS, f));
    if (meta.draft) { log(`  · 跳过草稿：${f}`); continue; }
    const { html, toc } = renderMarkdown(meta.body, { macros: cfg.math.macros || {} });
    const rt = readingTime(meta.body, cfg.readingTime);
    posts.push({
      ...meta,
      html,
      toc,
      readingTime: rt.minutes,
      wordCount: rt.wordCount,
      url: url(BASE, `posts/${encodeURI(meta.slug)}/`),
    });
  }

  // 日期倒序
  posts.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title, 'zh'));
  log(`  · 文章 ${posts.length} 篇`);

  // ---------- 3. 公共渲染上下文 ----------
  const ctx = {
    cfg,
    site: cfg.site,
    lang: cfg.site.lang,
    v: BUILD_ID,
    u: (p) => url(BASE, p),
    abs: (p) => (cfg.site.url || '') + url(BASE, p),
    write: (rel, content) => writeFile(path.join(DIST, rel), content),
  };

  // ---------- 3.5 侧边栏共享数据 ----------
  const tagMap = new Map();
  for (const p of posts) for (const t of p.tags || []) {
    if (!tagMap.has(t)) tagMap.set(t, 0);
    tagMap.set(t, tagMap.get(t) + 1);
  }
  const topTags = [...tagMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'))
    .slice(0, 12);

  const yearMap = new Map();
  for (const p of posts) {
    const y = (p.date || '').slice(0, 4) || '未分类';
    if (!yearMap.has(y)) yearMap.set(y, []);
    yearMap.get(y).push(p);
  }
  const archiveMonths = [...yearMap.entries()]
    .map(([year, list]) => ({ year, posts: list.slice(0, 5) }))
    .sort((a, b) => b.year.localeCompare(a.year));

  ctx.sidebar = {
    recentPosts: posts.slice(0, 6),
    topTags,
    archiveMonths,
    totalPosts: posts.length,
  };

  // ---------- 4. 生成页面 ----------
  const { totalPages } = await genIndex(ctx, posts);
  await genPost(ctx, posts);
  const tags = await genTag(ctx, posts);
  await genArchive(ctx, posts);
  await genPage(ctx, PAGES);
  const docs = genSearchIndex(ctx, posts);
  await genFeed(ctx, posts, tags);
  if (cfg.admin.enabled) await genAdmin(ctx);
  log(`  · 分页 ${totalPages} 页 · 标签 ${tags.length} 个 · 搜索索引 ${(JSON.stringify(docs).length / 1024).toFixed(1)} KB`);

  // ---------- 5. 拷贝静态资源 ----------
  const assets = path.join(ROOT, 'src', 'assets');
  if (fs.existsSync(path.join(assets, 'css'))) copyDir(path.join(assets, 'css'), path.join(DIST, 'assets', 'css'));
  if (fs.existsSync(path.join(assets, 'js'))) copyDir(path.join(assets, 'js'), path.join(DIST, 'assets', 'js'));
  if (fs.existsSync(path.join(assets, 'img'))) copyDir(path.join(assets, 'img'), path.join(DIST, 'assets', 'img'));

  // 后台上传的图片放在 content/images/，构建时复制到 dist/images/
  const imagesDir = path.join(ROOT, 'content', 'images');
  if (fs.existsSync(imagesDir)) copyDir(imagesDir, path.join(DIST, 'images'));

  // KaTeX：css 与 fonts 必须同层
  const katexDist = path.join(ROOT, 'node_modules', 'katex', 'dist');
  if (fs.existsSync(katexDist)) {
    copyFile(path.join(katexDist, 'katex.min.css'), path.join(DIST, 'assets', 'css', 'katex.min.css'));
    const fonts = path.join(katexDist, 'fonts');
    if (fs.existsSync(fonts)) {
      copyDir(fonts, path.join(DIST, 'assets', 'css', 'fonts'), (p) => /\.(woff2?|ttf)$/i.test(p));
    }
  }

  // GitHub Pages 需要 .nojekyll
  writeFile(path.join(DIST, '.nojekyll'), '');

  // ---------- 6. 汇总 ----------
  const errs = mathPlugin.getErrors();
  if (errs.length) {
    log(`\n[warn] ${errs.length} 处公式渲染异常（已降级为原文显示，不影响构建）：`);
    errs.slice(0, 10).forEach((e) => log(`  - ${e.where}: ${e.message}  <<${e.src.slice(0, 40)}>>`));
  }
  log(`\n[done] 用时 ${((Date.now() - t0) / 1000).toFixed(2)}s，产物在 dist/\n`);
}

build().catch((e) => { console.error('\n[build failed]\n', e); process.exit(1); });
