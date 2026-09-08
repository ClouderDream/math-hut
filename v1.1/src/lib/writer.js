/**
 * 安全写文件：自动建目录、统一 LF 换行（避免 Windows CRLF 坑）
 */
const fs = require('fs');
const path = require('path');

function writeFile(file, content) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, content.replace(/\r\n/g, '\n'), 'utf8');
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

/** 递归拷贝目录 */
function copyDir(src, dest, filter) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (filter && !filter(s, entry)) continue;
    if (entry.isDirectory()) copyDir(s, d, filter);
    else copyFile(s, d);
  }
}

function rmDir(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (e) {
    // 某些环境（沙箱 / 回收站机制）会在删除成功的同时抛错，忽略即可
  }
  // 极端情况下目录仍在：清空一级子项后继续，构建会覆盖同名文件
  if (fs.existsSync(dir)) {
    for (const name of fs.readdirSync(dir)) {
      try { fs.rmSync(path.join(dir, name), { recursive: true, force: true }); } catch (e) {}
    }
  }
}

module.exports = { writeFile, copyFile, copyDir, rmDir };
