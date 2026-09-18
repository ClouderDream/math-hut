/**
 * 配置读取与归一化
 */
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function load() {
  // 允许用户在项目根放 site.config.js 覆盖默认
  let user = {};
  try {
    user = require(path.join(ROOT, 'site.config.js'));
  } catch (e) {
    user = {};
  }
  const cfg = JSON.parse(JSON.stringify(user));

  // 加载后台可编辑的 content/site.json，覆盖 site.config.js 中的默认值
  let editable = {};
  try {
    const jsonPath = path.join(ROOT, 'content', 'site.json');
    if (require('fs').existsSync(jsonPath)) {
      editable = JSON.parse(require('fs').readFileSync(jsonPath, 'utf8'));
    }
  } catch (e) {
    editable = {};
  }
  if (editable.site) cfg.site = Object.assign({}, cfg.site, editable.site);
  if (editable.nav) cfg.nav = editable.nav;
  if (editable.social) cfg.social = editable.social;

  const site = cfg.site || {};
  // base 归一化：保证 '/xxx/' 或 '/'
  let base = site.base || '/';
  base = '/' + String(base).replace(/^\/+|\/+$/g, '');
  base = base === '/' ? '/' : base + '/';
  site.base = base;

  site.postsPerPage = Number(site.postsPerPage) > 0 ? Number(site.postsPerPage) : 5;
  site.url = String(site.url || '').replace(/\/+$/, '');
  cfg.site = site;

  cfg.nav = cfg.nav || [];
  cfg.social = cfg.social || [];
  cfg.readingTime = Object.assign({ wordsPerMinute: 350, enWordWeight: 1.5, codeLineWeight: 12 }, cfg.readingTime);
  cfg.search = Object.assign({ maxBodyChars: 1200, maxResults: 20 }, cfg.search);
  cfg.admin = Object.assign({ enabled: true, path: '/admin/', postsDir: 'content/posts', branch: 'main' }, cfg.admin);
  cfg.feed = Object.assign({ enableRSS: true, enableSitemap: true }, cfg.feed);
  cfg.math = cfg.math || {};

  return cfg;
}

module.exports = { load, ROOT };
