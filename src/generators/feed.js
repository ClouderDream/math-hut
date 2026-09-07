/** sitemap.xml / rss.xml / robots.txt / 404.html */
const { render } = require('../lib/render');

function xmlEscape(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

module.exports = async function generateFeed(ctx, posts, tags) {
  const { cfg, write } = ctx;
  const siteUrl = cfg.site.url || '';

  // ---- sitemap.xml ----
  if (cfg.feed.enableSitemap) {
    const urls = [{ loc: ctx.abs(''), priority: '1.0' }];
    for (const p of posts) urls.push({ loc: ctx.abs(`posts/${encodeURI(p.slug)}/`), lastmod: p.date, priority: '0.8' });
    for (const t of tags) urls.push({ loc: ctx.abs(`tags/${encodeURIComponent(t.name)}/`), priority: '0.4' });
    urls.push({ loc: ctx.abs('tags/'), priority: '0.5' });
    urls.push({ loc: ctx.abs('archive/'), priority: '0.5' });

    const body = urls
      .map((u) => `  <url>\n    <loc>${xmlEscape(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}\n    <priority>${u.priority}</priority>\n  </url>`)
      .join('\n');
    write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
  }

  // ---- rss.xml ----
  if (cfg.feed.enableRSS) {
    const items = posts
      .slice(0, 30)
      .map((p) => `    <item>
      <title>${xmlEscape(p.title)}</title>
      <link>${xmlEscape(ctx.abs(`posts/${encodeURI(p.slug)}/`))}</link>
      <guid isPermaLink="true">${xmlEscape(ctx.abs(`posts/${encodeURI(p.slug)}/`))}</guid>
      <pubDate>${new Date(p.dateISO).toUTCString()}</pubDate>
      <description>${xmlEscape(p.summary)}</description>
${(p.tags || []).map((t) => `      <category>${xmlEscape(t)}</category>`).join('\n')}
    </item>`)
      .join('\n');

    write(
      'rss.xml',
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(cfg.site.title)}</title>
    <link>${xmlEscape(siteUrl + cfg.site.base)}</link>
    <description>${xmlEscape(cfg.site.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${xmlEscape(ctx.abs('rss.xml'))}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`
    );
  }

  // ---- robots.txt ----
  write(
    'robots.txt',
    `User-agent: *
Allow: /
Disallow: /admin/

Sitemap: ${ctx.abs('sitemap.xml')}
`
  );

  // ---- 404.html（必须放在根目录）----
  write(
    '404.html',
    await render('404.ejs', {
      ...ctx,
      currentPath: '',
      pageTitle: `404 · ${cfg.site.title}`,
      pageDesc: '页面不存在',
      canonical: ctx.abs('404.html'),
    })
  );
};
