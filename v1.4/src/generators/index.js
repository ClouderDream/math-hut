/** 首页 + 分页页 */
const { render } = require('../lib/render');
const { paginate, buildPager } = require('../lib/paginate');

module.exports = async function generateIndex(ctx, posts) {
  const { cfg, write } = ctx;
  const { pages, totalPages } = paginate(posts, cfg.site.postsPerPage);

  for (const p of pages) {
    const n = p.number;
    const isFirst = n === 1;
    const outPath = isFirst ? 'index.html' : `page/${n}/index.html`;
    const canonical = ctx.abs(isFirst ? '' : `page/${n}/`);

    // 第 1 页：首篇升为「本期精选」，其余进编号列表；其余页全部进编号列表
    const featured = isFirst && p.items.length ? p.items[0] : null;
    const listPosts = isFirst ? p.items.slice(1) : p.items;

    const html = await render('index.ejs', {
      ...ctx,
      currentPath: ctx.u('/'),
      pageTitle: isFirst ? `${cfg.site.title} · ${cfg.site.subtitle}` : `${cfg.site.title} · 第 ${n} 页`,
      pageDesc: cfg.site.description,
      canonical,
      posts: p.items,
      featured,
      listPosts,
      isFirst,
      pager: totalPages > 1 ? buildPager(n, totalPages, cfg.site.base) : { totalPages: 1 },
    });
    write(outPath, html);
  }
  return { totalPages };
};
