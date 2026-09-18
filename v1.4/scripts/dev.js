/**
 * 本地开发服务器（零依赖）+ 文件监听自动重建
 * 用法：npm run dev        （默认 http://localhost:5173）
 *      npm run preview    （不监听，端口 4173）
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const args = process.argv.slice(2);
const noWatch = args.includes('--no-watch');
const portArg = args.indexOf('--port');
const PORT = portArg >= 0 ? Number(args[portArg + 1]) : noWatch ? 4173 : 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function runBuild(cb) {
  const t0 = Date.now();
  const child = spawn(process.execPath, [path.join(ROOT, 'src', 'build.js')], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  child.stdout.on('data', (d) => { out += d.toString(); });
  child.stderr.on('data', (d) => { out += d.toString(); });
  child.on('close', (code) => {
    if (code === 0) {
      console.log(`[rebuild] 完成 ${((Date.now() - t0) / 1000).toFixed(2)}s`);
    } else {
      console.error(out || `[rebuild] 失败，退出码 ${code}`);
    }
    if (cb) cb();
  });
}

let building = false;
let pending = false;
function rebuild() {
  if (building) { pending = true; return; }
  building = true;
  runBuild(() => {
    building = false;
    if (pending) { pending = false; rebuild(); }
  });
}

let timer = null;
function scheduleRebuild() {
  clearTimeout(timer);
  timer = setTimeout(rebuild, 200); // 防抖：一次保存可能触发多次 change
}

// 站点 base（子路径部署时 URL 会带 /math-hut/ 前缀，但磁盘上没有这层目录）
let BASE = '/';
try {
  const cfg = require(path.join(ROOT, 'site.config.js'));
  BASE = (cfg.site && cfg.site.base) || '/';
} catch (e) {}
if (BASE !== '/' && !BASE.endsWith('/')) BASE += '/';

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);

  // 剥离 base 前缀
  if (BASE !== '/' && urlPath.startsWith(BASE)) urlPath = '/' + urlPath.slice(BASE.length);
  if (urlPath.endsWith('/')) urlPath += 'index.html';

  let file = path.join(DIST, urlPath);
  // 防止路径穿越
  if (!file.startsWith(DIST)) { res.writeHead(403).end('403'); return; }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      const notFound = path.join(DIST, '404.html');
      if (fs.existsSync(notFound)) {
        res.writeHead(404, { 'Content-Type': MIME['.html'] });
        res.end(fs.readFileSync(notFound));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found：' + urlPath);
      }
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  });
});

// 首次先构建一次
runBuild(() => {
  server.listen(PORT, () => {
    console.log(`\n  本地预览：http://localhost:${PORT}${BASE}`);
    console.log(`  后台入口：http://localhost:${PORT}${BASE}admin/`);
    console.log(`  （Ctrl+C 停止）\n`);

    if (!noWatch) {
      const watchTargets = [
        path.join(ROOT, 'content'),
        path.join(ROOT, 'src'),
        path.join(ROOT, 'site.config.js'),
      ].filter((p) => fs.existsSync(p));

      for (const t of watchTargets) {
        try {
          fs.watch(t, { recursive: true }, (event, filename) => {
            if (filename && /node_modules|dist/.test(filename)) return;
            console.log(`[watch] ${filename || t} 变化，重建中…`);
            scheduleRebuild();
          });
        } catch (e) {
          console.warn(`[watch] 无法监听 ${t}：${e.message}`);
        }
      }
    }
  });
});
