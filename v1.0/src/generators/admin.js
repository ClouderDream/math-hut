/** 后台页面生成：渲染 admin/index.html + 注入配置 + 拷贝 vendor（markdown-it / KaTeX） */
const path = require('path');
const fs = require('fs');
const { render } = require('../lib/render');
const { copyFile, copyDir, writeFile: wf } = require('../lib/writer');

module.exports = async function generateAdmin(ctx) {
  const { cfg, write } = ctx;
  if (!cfg.admin.enabled) return false;

  const distAdmin = 'admin';

  // 1. 页面
  write(
    `${distAdmin}/index.html`,
    await render('admin.ejs', {
      ...ctx,
      currentPath: ctx.u('admin/'),
      pageTitle: `后台管理 · ${cfg.site.title}`,
      pageDesc: '后台管理',
      canonical: ctx.abs('admin/'),
      noindex: true,
    })
  );

  // 2. 注入配置（构建期写入，避免手工填写出错）
  const adminConfig = `window.__HUT__ = ${JSON.stringify(
    {
      base: cfg.site.base,
      owner: cfg.admin.owner,
      repo: cfg.admin.repo,
      branch: cfg.admin.branch,
      postsDir: cfg.admin.postsDir,
      passHash: cfg.admin.passHash,
      passSalt: cfg.admin.passSalt,
      macros: cfg.math.macros || {},
      postsPerPage: cfg.site.postsPerPage,
    },
    null,
    2
  )};
`;
  write(`${distAdmin}/config.js`, adminConfig);

  const root = path.resolve(__dirname, '..', '..');
  const nm = path.join(root, 'node_modules');

  // 3. 后台脚本
  write(`${distAdmin}/github.js`, fs.readFileSync(path.join(root, 'src', 'admin', 'github.js'), 'utf8'));
  write(`${distAdmin}/admin.js`, fs.readFileSync(path.join(root, 'src', 'admin', 'admin.js'), 'utf8'));

  // 4. vendor：markdown-it UMD 版
  const miSrc = path.join(nm, 'markdown-it', 'dist', 'markdown-it.min.js');
  if (fs.existsSync(miSrc)) write(`${distAdmin}/vendor/markdown-it.min.js`, fs.readFileSync(miSrc, 'utf8'));

  // 5. vendor：KaTeX（js + css + fonts，必须同层，否则符号变方块）
  const katexDist = path.join(nm, 'katex', 'dist');
  if (fs.existsSync(katexDist)) {
    write(`${distAdmin}/vendor/katex.min.js`, fs.readFileSync(path.join(katexDist, 'katex.min.js'), 'utf8'));
    write(`${distAdmin}/vendor/katex.min.css`, fs.readFileSync(path.join(katexDist, 'katex.min.css'), 'utf8'));
    const fonts = path.join(katexDist, 'fonts');
    if (fs.existsSync(fonts)) {
      // 只拷 woff2 + woff，省体积
      copyDir(fonts, path.join(root, 'dist', distAdmin, 'vendor', 'fonts'), (p) => /\.(woff2?|ttf)$/i.test(p));
    }
  }

  // 6. 复用同一套数学规则，保证预览 = 线上
  write(`${distAdmin}/vendor/md-math.js`, fs.readFileSync(path.join(root, 'src', 'lib', 'md-math.js'), 'utf8'));

  return true;
};
