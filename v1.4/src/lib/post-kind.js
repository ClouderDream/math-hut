/** 文章类型识别：科研前沿每日简报不能只依赖可被后台误删的 tags。 */
function isResearchBrief(post) {
  if (!post) return false;
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const slug = String(post.slug || '');
  const fileName = String(post.fileName || '');
  return tags.includes('科研前沿')
    || tags.includes('每日简报')
    || /^research-frontier-daily-\d{4}-\d{2}-\d{2}$/.test(slug)
    || /research-frontier-daily/.test(fileName);
}

function ensureResearchTags(post) {
  if (!isResearchBrief(post)) return post;
  const tags = Array.isArray(post.tags) ? post.tags.slice() : [];
  if (!tags.includes('科研前沿')) tags.push('科研前沿');
  if (!tags.includes('每日简报')) tags.push('每日简报');
  post.tags = tags;
  return post;
}

module.exports = { isResearchBrief, ensureResearchTags };
