/**
 * slug 生成：URL 里用的文章标识
 * 规则：优先用 front-matter 里手写的 slug；否则用文件名去掉日期前缀；
 *      中文会保留（浏览器会自动百分号编码，GitHub Pages 完全支持）
 */
function slugifyText(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[\\/:*?"<>|#{}[\]().,!?;:'"`~@$%^&+=]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** 文件名 -> slug：2026-09-07-limit-and-derivative.md -> limit-and-derivative */
function slugFromFilename(filename) {
  const name = String(filename).replace(/\.md$/i, '');
  return slugifyText(name.replace(/^\d{4}-\d{2}-\d{2}-/, ''));
}

/**
 * 创建带去重的 slugify：同一篇文章内标题重复时自动加 -2 -3
 */
function createSlugger() {
  const seen = new Map();
  return function slugify(text) {
    let base = slugifyText(text);
    if (!base) base = 'section';
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n + 1}`;
  };
}

module.exports = { slugifyText, slugFromFilename, createSlugger };
