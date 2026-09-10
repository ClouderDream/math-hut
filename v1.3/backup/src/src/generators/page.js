/** 独立页面：关于页（content/pages/*.md）+ 内置搜索页 */
const path = require('path');
const fs = require('fs');
const { render } = require('../lib/render');
const { parseFile } = require('../lib/frontmatter');
const { renderMarkdown } = require('../lib/markdown');
const { slugFromFilename } = require('../lib/slug');

module.exports = async function generatePages(ctx, pagesDir) {
  const { cfg, write } = ctx;

  // ---- 内置搜索页 ----
  write(
    'search/index.html',
    await render('search.ejs', {
      ...ctx,
      currentPath: ctx.u('search/'),
      pageTitle: `搜索 · ${cfg.site.title}`,
      pageDesc: `在 ${cfg.site.title} 中搜索文章`,
      canonical: ctx.abs('search/'),
    })
  );

  // ---- content/pages/*.md ----
  let count = 0;
  if (fs.existsSync(pagesDir)) {
    for (const f of fs.readdirSync(pagesDir).filter((x) => x.endsWith('.md'))) {
      const file = path.join(pagesDir, f);
      const meta = parseFile(file);
      if (meta.draft) continue;
      const { html } = renderMarkdown(meta.body, { macros: cfg.math.macros });
      const slug = meta.slug || slugFromFilename(f);
      write(
        `${slug}/index.html`,
        await render('page.ejs', {
          ...ctx,
          currentPath: ctx.u(`${slug}/`),
          pageTitle: `${meta.title} · ${cfg.site.title}`,
          pageDesc: meta.summary,
          canonical: ctx.abs(`${slug}/`),
          page: { title: meta.title, html, date: meta.date },
        })
      );
      count++;
    }
  }
  return count;
};
