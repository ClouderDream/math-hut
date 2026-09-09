/** 归档页（按年份分组） */
const { render } = require('../lib/render');

module.exports = async function generateArchive(ctx, posts) {
  const { cfg, write } = ctx;
  const map = new Map();
  for (const p of posts) {
    const year = (p.date || '').slice(0, 4) || '未分类';
    if (!map.has(year)) map.set(year, []);
    map.get(year).push(p);
  }
  const groups = [...map.entries()]
    .map(([year, list]) => ({ year, posts: list }))
    .sort((a, b) => b.year.localeCompare(a.year));

  write(
    'archive/index.html',
    await render('archive.ejs', {
      ...ctx,
      currentPath: ctx.u('archive/'),
      pageTitle: `归档 · ${cfg.site.title}`,
      pageDesc: `${cfg.site.title} 的全部文章归档`,
      canonical: ctx.abs('archive/'),
      groups,
      total: posts.length,
    })
  );
  return groups;
};
