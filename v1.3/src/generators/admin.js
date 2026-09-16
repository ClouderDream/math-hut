/** 后台页面生成：渲染 admin/index.html + 注入配置 + 拷贝 vendor（markdown-it / KaTeX） */
const path = require('path');
const fs = require('fs');
const { render } = require('../lib/render');
const { copyFile, copyDir, writeFile: wf } = require('../lib/writer');

module.exports = async function generateAdmin(ctx) {
  const { cfg, write } = ctx;
  if (!cfg.admin.enabled) return false;
  const distAdmin = 'admin';

  write(`${distAdmin}/index.html`, await render('admin.ejs', {
    ...ctx,
    currentPath: ctx.u('admin/'),
    pageTitle: `后台管理 · ${cfg.site.title}`,
    pageDesc: '后台管理',
    canonical: ctx.abs('admin/'),
    noindex: true,
  }));

  const adminConfig = `window.__HUT__ = ${JSON.stringify({
    base: cfg.site.base,
    owner: cfg.admin.owner,
    repo: cfg.admin.repo,
    branch: cfg.admin.branch,
    postsDir: cfg.admin.postsDir,
    pagesDir: cfg.admin.pagesDir,
    imagesDir: cfg.admin.imagesDir,
    siteConfigPath: cfg.admin.siteConfigPath,
    passHash: cfg.admin.passHash,
    passSalt: cfg.admin.passSalt,
    macros: cfg.math.macros || {},
    postsPerPage: cfg.site.postsPerPage,
  }, null, 2)};\n`;
  write(`${distAdmin}/config.js`, adminConfig);

  const root = path.resolve(__dirname, '..', '..');
  const nm = path.join(root, 'node_modules');
  write(`${distAdmin}/github.js`, fs.readFileSync(path.join(root, 'src', 'admin', 'github.js'), 'utf8'));
  const parts = [
    'admin.js',
    'admin-ui-styles.js',
    'admin-ui-enhancements.js',
    'settings-enhancements.js',
    'media-enhancements.js',
    'admin-runtime-fixes.js',
    'admin-briefings.js',
    'admin-responsive-about.js',
    'ocr-workspace.js',
  ].map((name) => fs.readFileSync(path.join(root, 'src', 'admin', name), 'utf8'));
  write(`${distAdmin}/admin.js`, parts.join('\n\n'));

  const miSrc = path.join(nm, 'markdown-it', 'dist', 'markdown-it.min.js');
  if (fs.existsSync(miSrc)) write(`${distAdmin}/vendor/markdown-it.min.js`, fs.readFileSync(miSrc, 'utf8'));

  const katexDist = path.join(nm, 'katex', 'dist');
  if (fs.existsSync(katexDist)) {
    write(`${distAdmin}/vendor/katex.min.js`, fs.readFileSync(path.join(katexDist, 'katex.min.js'), 'utf8'));
    write(`${distAdmin}/vendor/katex.min.css`, fs.readFileSync(path.join(katexDist, 'katex.min.css'), 'utf8'));
    const fonts = path.join(katexDist, 'fonts');
    if (fs.existsSync(fonts)) copyDir(fonts, path.join(root, 'dist', distAdmin, 'vendor', 'fonts'), (p) => /\.(woff2?|ttf)$/i.test(p));
  }

  write(`${distAdmin}/vendor/md-math.js`, fs.readFileSync(path.join(root, 'src', 'lib', 'md-math.js'), 'utf8'));
  return true;
};