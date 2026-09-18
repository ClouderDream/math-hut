/** 标签聚合页 + 每个标签的文章列表页 */
const { render } = require('../lib/render');

module.exports = async function generateTags(ctx, posts) {
  const { cfg, write } = ctx;

  const map = new Map();
  for (const post of posts) {
    for (const t of post.tags || []) {
      if (!map.has(t)) map.set(t, []);
      map.get(t).push(post);
    }
  }
  const tags = [...map.entries()]
    .map(([name, list]) => ({ name, count: list.length, posts: list }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'));

  // 标签总览页
  write(
    'tags/index.html',
    await render('tags.ejs', {
      ...ctx,
      currentPath: ctx.u('tags/'),
      pageTitle: `标签 · ${cfg.site.title}`,
      pageDesc: `${cfg.site.title} 的全部文章标签`,
      canonical: ctx.abs('tags/'),
      tags,
      totalPosts: posts.length,
    })
  );

  // 每个标签一页
  for (const t of tags) {
    write(
      `tags/${t.name}/index.html`,
      await render('tag.ejs', {
        ...ctx,
        currentPath: ctx.u(`tags/${encodeURIComponent(t.name)}/`),
        pageTitle: `#${t.name} · ${cfg.site.title}`,
        pageDesc: `标签「${t.name}」下共 ${t.count} 篇文章`,
        canonical: ctx.abs(`tags/${encodeURIComponent(t.name)}/`),
        tagName: t.name,
        posts: t.posts,
      })
    );
  }
  return tags;
};
