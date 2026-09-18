/** 科研前沿独立栏目：聚合每日简报，并按全站规则分页。 */
const { render } = require('../lib/render');
const { paginate, buildPager } = require('../lib/paginate');
const { isResearchBrief } = require('../lib/post-kind');

module.exports = async function generateResearch(ctx, posts) {
  const { cfg, write } = ctx;
  const researchPosts = posts.filter(isResearchBrief);
  const { pages, totalPages } = paginate(researchPosts, cfg.site.postsPerPage);

  for (const p of pages) {
    const n = p.number;
    const isFirst = n === 1;
    const featured = isFirst && p.items.length ? p.items[0] : null;
    const listPosts = isFirst ? p.items.slice(1) : p.items;
    const outPath = isFirst ? 'research/index.html' : `research/page/${n}/index.html`;
    const canonical = ctx.abs(isFirst ? 'research/' : `research/page/${n}/`);

    write(
      outPath,
      await render('research.ejs', {
        ...ctx,
        currentPath: ctx.u('/research/'),
        pageTitle: isFirst ? `科研前沿 · ${cfg.site.title}` : `科研前沿 · 第 ${n} 页 · ${cfg.site.title}`,
        pageDesc: '每日筛选值得继续跟踪的科研与学术前沿，关注研究价值、方法创新与可延伸的问题。',
        canonical,
        posts: p.items,
        featured,
        listPosts,
        isFirst,
        pager: totalPages > 1 ? buildPager(n, totalPages, ctx.u('research/')) : { totalPages: 1 },
      })
    );
  }

  return researchPosts.length;
};
