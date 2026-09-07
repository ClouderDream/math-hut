/**
 * URL 工具：保证 Windows 下也不会把反斜杠拼进链接
 */
const path = require('path');

/** 把 Windows 路径分隔符 \ 转成 / */
function toPosix(p) {
  return String(p).split(path.sep).join('/');
}

/** 把若干段拼成 /a/b/c 形式（自动去掉两端多余斜杠） */
function joinUrl(...parts) {
  const seg = parts
    .map((s) => String(s == null ? '' : s).replace(/\\/g, '/'))
    .map((s) => s.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean);
  return '/' + seg.join('/');
}

/**
 * 生成站内绝对 URL
 * base 形如 '/math-hut/'（首尾都有斜杠）
 */
function url(base, p) {
  const cleanBase = ('/' + String(base || '').replace(/^\/+|\/+$/g, '') + '/').replace(/\/+/g, '/');
  let rel = toPosix(p || '').replace(/^\/+/, '');
  return cleanBase + rel;
}

/** 保证 URL 以 / 结尾（目录型 URL） */
function dirUrl(u) {
  return u.endsWith('/') ? u : u + '/';
}

module.exports = { toPosix, joinUrl, url, dirUrl };
