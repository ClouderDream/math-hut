/**
 * 新建文章脚手架
 * 用法：npm run new "从极限到导数"
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const POSTS = path.join(ROOT, 'content', 'posts');

const title = (process.argv[2] || '').trim() || '未命名文章';
const today = new Date().toISOString().slice(0, 10);

// 文件名 slug：中文标题保留（GitHub Pages 支持），非 ASCII 之外的字符清理掉
let slug = title
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/[\\/:*?"<>|#{}[\]().,!?;:'"`~@$%^&+=]/g, '')
  .replace(/-{2,}/g, '-')
  .replace(/^-+|-+$/g, '');
if (!slug) slug = 'untitled';

if (!fs.existsSync(POSTS)) fs.mkdirSync(POSTS, { recursive: true });

const filename = `${today}-${slug}.md`;
const file = path.join(POSTS, filename);

if (fs.existsSync(file)) {
  console.error(`已存在同名文件：content/posts/${filename}`);
  process.exit(1);
}

const content = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${today}
tags: ["待分类"]
summary: "一句话概括这篇文章讲了什么。"
slug: "${slug}"
draft: false
---

## 引言

先写点引子……

行内公式写法：$E = mc^2$。

行间公式写法（另起一行）：

$$
\\int_0^1 x^2 \\, \\d x = \\frac{1}{3}
$$

## 正文小标题

正文段落。

\`\`\`python
# 代码块示例
def f(x):
    return x ** 2

print(f(3))
\`\`\`

## 小结

总结。
`;

fs.writeFileSync(file, content.replace(/\r\n/g, '\n'), 'utf8');
console.log(`\n已创建：content/posts/${filename}`);
console.log(`提示：把 draft 改成 false 之后才会出现在网站上（默认已是 false）。`);
console.log(`本地预览：npm run dev\n`);
