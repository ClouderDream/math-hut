/**
 * 生成全站搜索索引 dist/search-index.json
 * 只存纯文本：标题 / 摘要 / 标签 / 正文（截断），不存 HTML，控制体积
 */
const { stripNonProse } = require('../lib/reading-time');

function plainText(md) {
  return stripNonProse(md)
    .replace(/\r/g, '')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

module.exports = function generateSearchIndex(ctx, posts) {
  const { cfg, write } = ctx;
  const max = cfg.search.maxBodyChars || 1200;
  const docs = posts
    .filter((p) => p.search !== false)
    .map((p) => {
      let body = plainText(p.body);
      if (body.length > max) body = body.slice(0, max);
      return {
        title: p.title,
        url: p.url,
        date: p.date,
        tags: p.tags,
        summary: p.summary,
        body,
      };
    });
  write('search-index.json', JSON.stringify(docs));
  return docs;
};
