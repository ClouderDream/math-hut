/**
 * dist/ 冒烟测试：用于 GitHub Actions 在部署前发现静态站点回归。
 * 不依赖浏览器，覆盖产物存在性、内部链接、JS 语法、科研栏目隔离和移动菜单关键逻辑。
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { load, ROOT } = require('../src/lib/config');
const { parseFile } = require('../src/lib/frontmatter');
const { isResearchBrief, ensureResearchTags } = require('../src/lib/post-kind');

const cfg = load();
const DIST = path.join(ROOT, 'dist');
const POSTS = path.join(ROOT, 'content', 'posts');
const base = cfg.site.base || '/';
const siteUrl = String(cfg.site.url || '').replace(/\/+$/, '');
const errors = [];
let checkedRefs = 0;

function fail(msg) { errors.push(msg); }
function exists(rel) { return fs.existsSync(path.join(DIST, rel)); }
function read(rel) { return fs.readFileSync(path.join(DIST, rel), 'utf8'); }
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
function safeDecode(s) { try { return decodeURIComponent(s); } catch (_) { return s; } }

// 1) 关键产物
[
  'index.html', '404.html', 'archive/index.html', 'tags/index.html', 'research/index.html',
  'search/index.html', 'search-index.json', 'rss.xml', 'sitemap.xml',
  'admin/index.html', 'admin/admin.js', 'admin/github.js', 'admin/config.js',
  'assets/js/menu.js', 'assets/css/v14.css'
].forEach((f) => { if (!exists(f)) fail('缺少关键产物：' + f); });

// 2) JS 语法（跳过第三方 vendor）
for (const file of walk(DIST).filter((f) => f.endsWith('.js') && !f.includes(path.sep + 'vendor' + path.sep))) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) fail('JS 语法错误：' + path.relative(DIST, file) + '\n' + (r.stderr || r.stdout || '').trim());
}

// 3) HTML 内部 href/src 完整性 + 重复 id + 未编译 EJS
for (const file of walk(DIST).filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8');
  const relHtml = path.relative(DIST, file).replace(/\\/g, '/');
  if (/<%[=-]?/.test(html)) fail('存在未编译 EJS：' + relHtml);

  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((m) => m[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) fail('重复 id：' + relHtml + ' #' + id);
    seen.add(id);
  }

  for (const m of html.matchAll(/\s(?:href|src)=["']([^"']+)["']/g)) {
    let ref = m[1].trim();
    if (!ref || ref[0] === '#' || /^(mailto:|tel:|data:|javascript:)/i.test(ref)) continue;
    ref = ref.split('#')[0].split('?')[0];
    if (!ref) continue;

    if (/^https?:\/\//i.test(ref)) {
      if (!siteUrl || !ref.startsWith(siteUrl + '/')) continue;
      try { ref = new URL(ref).pathname; } catch (_) { continue; }
    }

    let target;
    if (ref.startsWith('/')) {
      if (base !== '/' && !ref.startsWith(base)) {
        fail('站内绝对路径未包含 base：' + relHtml + ' -> ' + ref);
        continue;
      }
      target = base === '/' ? ref.slice(1) : ref.slice(base.length);
    } else {
      target = path.posix.normalize(path.posix.join(path.posix.dirname(relHtml), ref));
    }
    target = safeDecode(target).replace(/^\/+/, '');
    if (!target) target = 'index.html';
    if (target.endsWith('/')) target += 'index.html';
    const abs = path.join(DIST, ...target.split('/'));
    checkedRefs++;
    if (!fs.existsSync(abs)) {
      if (!(fs.existsSync(abs) && fs.statSync(abs).isDirectory() && fs.existsSync(path.join(abs, 'index.html')))) {
        fail('内部引用不存在：' + relHtml + ' -> ' + ref + '（解析为 ' + target + '）');
      }
    }
  }
}

// 4) 科研前沿链路：按“简报类型”识别，避免后台误删 tags 造成栏目整体消失
if (fs.existsSync(POSTS)) {
  const research = fs.readdirSync(POSTS)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ensureResearchTags(parseFile(path.join(POSTS, f))))
    .filter((p) => !p.draft && isResearchBrief(p))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  if (research.length) {
    const latest = research[0];
    const href = base + 'posts/' + encodeURI(latest.slug) + '/';
    const researchHtml = read('research/index.html');
    const homeHtml = read('index.html');
    if (!researchHtml.includes(href)) fail('科研栏目未包含最新简报：' + latest.slug);
    if (homeHtml.includes(href)) fail('科研简报错误进入普通首页：' + latest.slug);
    if (!exists('tags/科研前沿/index.html')) fail('缺少科研前沿标签页');
    if (!exists('tags/每日简报/index.html')) fail('缺少每日简报标签页');
    ['rss.xml', 'sitemap.xml', 'search-index.json'].forEach((f) => {
      if (!read(f).includes(latest.slug)) fail(f + ' 未收录最新科研简报：' + latest.slug);
    });
  }
}

// 5) 手机菜单关键修复必须进入产物
if (exists('assets/css/v14.css') && exists('assets/js/menu.js')) {
  const css = read('assets/css/v14.css');
  const js = read('assets/js/menu.js');
  if (!css.includes('body.mobile-menu-open') || !css.includes('position:fixed')) fail('移动菜单 CSS 防叠加逻辑缺失');
  if (!js.includes('mobile-menu-open') || !js.includes("e.key === 'Escape'")) fail('移动菜单 JS 开合/滚动锁定逻辑缺失');
}

if (errors.length) {
  console.error('\n[smoke failed] ' + errors.length + ' 个问题：');
  errors.forEach((e, i) => console.error((i + 1) + '. ' + e));
  process.exit(1);
}

console.log('[smoke ok] 关键产物完整；内部引用 ' + checkedRefs + ' 个均有效；科研栏目、后台和移动菜单检查通过。');
