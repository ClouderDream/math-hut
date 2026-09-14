/** 科研前沿独立栏目：聚合带「科研前沿」标签的每日简报。 */
const { render } = require('../lib/render');

module.exports = async function generateResearch(ctx, posts) {
  const { cfg, write } = ctx;
  const researchPosts = posts.filter((p) => (p.tags || []).includes('科研前沿'));
  const featured = researchPosts.length ? researchPosts[0] : null;
  const listPosts = featured ? researchPosts.slice(1) : [];

  write(
    'research/index.html',
    await render('research.ejs', {
      ...ctx,
      currentPath: ctx.u('/research/'),
      pageTitle: `科研前沿 · ${cfg.site.title}`,
      pageDesc: '每日筛选值得继续跟踪的科研与学术前沿，关注研究价值、方法创新与可延伸的问题。',
      canonical: ctx.abs('research/'),
      posts: researchPosts,
      featured,
      listPosts,
    })
  );

  return researchPosts.length;
};
