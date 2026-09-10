/** 首页 + 分页页 */
const { render } = require('../lib/render');
const { paginate, buildPager } = require('../lib/paginate');

module.exports = async function generateIndex(ctx, posts) {
  const { cfg, write } = ctx;
  const { pages, totalPages } = paginate(posts, cfg.site.postsPerPage);

  for (const p of pages) {
    const n = p.number;
    const outPath = n === 1 ? 'index.html' : `page/${n}/index.html`;
    const canonical = ctx.abs(n === 1 ? '' : `page/${n}/`);
    const html = await render('index.ejs', {
      ...ctx,
      currentPath: ctx.u('/'),
      pageTitle: n === 1 ? `${cfg.site.title} · ${cfg.site.subtitle}` : `${cfg.site.title} · 第 ${n} 页`,
      pageDesc: cfg.site.description,
      canonical,
      posts: p.items,
      pager: totalPages > 1 ? buildPager(n, totalPages, cfg.site.base) : { totalPages: 1 },
    });
    write(outPath, html);
  }
  return { totalPages };
};
