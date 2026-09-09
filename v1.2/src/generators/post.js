/** 文章详情页（含上一篇 / 下一篇） */
const { render } = require('../lib/render');

module.exports = async function generatePosts(ctx, posts) {
  const { cfg, write } = ctx;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    // posts 已按日期倒序：更新的在前面
    const prev = i > 0 ? posts[i - 1] : null;           // 上一篇（较新）
    const next = i < posts.length - 1 ? posts[i + 1] : null; // 下一篇（较旧）

    const html = await render('post.ejs', {
      ...ctx,
      currentPath: post.url,
      pageTitle: `${post.title} · ${cfg.site.title}`,
      pageDesc: post.summary,
      canonical: ctx.abs(`posts/${encodeURI(post.slug)}/`),
      post,
      prev,
      next,
    });
    write(`posts/${post.slug}/index.html`, html);
  }
  return posts.length;
};
