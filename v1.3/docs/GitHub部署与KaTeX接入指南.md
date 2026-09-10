---
title: "GitHub 部署与 KaTeX 接入指南"
subtitle: "云梦的数理小屋 · 从零到上线"
author: "云梦"
date: "2026-09-07"
---

# GitHub 部署与 KaTeX 接入指南

> 本文所有命令都可以逐条复制执行。路径与文件名均为真实值，不做省略。
> 适用环境：Windows 11 / PowerShell 或 Git Bash / Node.js 22 / Git 2.55。
> 目标地址：<https://ClouderDream.github.io/math-hut/>

---

## 目录

- [0. 前置准备](#0-前置准备)
- [1. 创建仓库与首次推送](#1-创建仓库与首次推送)
- [2. 接入 KaTeX 方式一：CDN](#2-接入-katex-方式一cdn)
- [3. 接入 KaTeX 方式二：npm 依赖 + 构建期预渲染（推荐）](#3-接入-katex-方式二npm-依赖--构建期预渲染推荐)
- [4. 配置 GitHub Pages](#4-配置-github-pages)
- [5. 配置 GitHub Actions 自动部署](#5-配置-github-actions-自动部署)
- [6. 公式书写与转义规范](#6-公式书写与转义规范)
- [7. 本地预览与验证](#7-本地预览与验证)
- [8. 常见问题排查清单](#8-常见问题排查清单)
- [9. 申请后台 Token（Fine-grained PAT）](#9-申请后台-tokenfine-grained-pat)
- [10. 上线验收清单](#10-上线验收清单)
- [11. 把本文导出为 PDF](#11-把本文导出为-pdf)

---

## 0. 前置准备

### 0.1 检查本机环境

打开终端（PowerShell 或 Git Bash），逐条执行：

```bash
node -v
npm -v
git --version
```

期望输出（版本号不低于这些即可）：

```
v22.22.2
10.9.7
git version 2.55.0
```

### 0.2 配置 Git 身份（只需做一次）

```bash
git config --global user.name "ClouderDream"
git config --global user.email "your-email@example.com"
git config --global core.autocrlf false
```

第三条很重要：关闭自动换行符转换，避免 Windows 的 CRLF 把 Markdown 段落之间插入多余空行。

### 0.3 在 GitHub 上创建仓库

1. 浏览器打开 <https://github.com/new>
2. **Repository name** 填：`math-hut`
3. 选 **Public**（私有仓库需要付费才能开 Pages）
4. **不要**勾选 "Add a README file"、"Add .gitignore"、"Choose a license"（我们本地已有文件）
5. 点 **Create repository**

创建后会看到一个空仓库页面，记下它的地址：

```
https://github.com/ClouderDream/math-hut.git
```

---

## 1. 创建仓库与首次推送

### 1.1 初始化本地仓库

```bash
cd "G:/buddywork/9.7云梦数理小屋"
git init
git add -A
git commit -m "初始化：云梦的数理小屋"
git branch -M main
git remote add origin https://github.com/ClouderDream/math-hut.git
git push -u origin main
```

### 1.2 如果 push 时要求输入密码

GitHub 自 2021 年起不再接受账号密码，需要用 **Personal Access Token** 当密码：

1. 打开 <https://github.com/settings/personal-access-tokens>
2. 生成 Token（权限勾 `repo`）
3. 在密码框里粘贴这串 Token（不是你的登录密码）

### 1.3 确认 `.gitignore` 内容正确

文件 `G:/buddywork/9.7云梦数理小屋/.gitignore` 应包含：

```gitignore
# 依赖
node_modules/

# 构建产物
dist/

# 日志
*.log
npm-debug.log*

# 编辑器
.vscode/
.idea/

# 系统文件
.DS_Store
Thumbs.db

# 本地令牌等敏感文件（不要提交）
*.local
.env
.env.*
```

### 1.4 确认 `.gitattributes` 内容正确

```gitattributes
* text=auto eol=lf

*.png binary
*.jpg binary
*.ico binary
*.woff binary
*.woff2 binary
*.ttf binary
```

### 1.5 必须提交 `package-lock.json`

CI 用的是 `npm ci`，它依赖 `package-lock.json`。确认它没有被 `.gitignore` 排除：

```bash
git check-ignore -v package-lock.json || echo "未被忽略，可以提交"
```

---

## 2. 接入 KaTeX 方式一：CDN

**适合**：快速验证、不想装依赖、能接受首屏有轻微重排。

### 2.1 在页面 `<head>` 中加入

```html
<link rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
      integrity="sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+"
      crossorigin="anonymous">
<script defer
        src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"
        integrity="sha384-7zkQWkzuo3B5mTepMUcHkMB5jZaolc2xDwL6VFqjFALcbeS9Ggm/Yr2r3Dy4lfFg"
        crossorigin="anonymous"></script>
<script defer
        src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"
        integrity="sha384-43gviWU0YVjaDtb/GhzOouOXtZMP/7XUzwPTstBeZFe/+rCMvRwr4yROQP43s0Xk"
        crossorigin="anonymous"
        onload="renderMathInElement(document.body);"></script>
```

> 上面 `integrity` 值为示例，实际使用请以 [jsDelivr 页面](https://www.jsdelivr.com/package/npm/katex) 给出的为准。

### 2.2 自定义分隔符（可选）

```html
<script>
  document.addEventListener("DOMContentLoaded", function () {
    renderMathInElement(document.body, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$",  right: "$",  display: false },
        { left: "\\[", right: "\\]", display: true },
        { left: "\\(", right: "\\)", display: false }
      ],
      throwOnError: false
    });
  });
</script>
```

### 2.3 CDN 方式的优缺点

| 优点 | 缺点 |
|---|---|
| 零安装，改一个 HTML 就能用 | 国内访问 jsDelivr 可能不稳定 |
| 不占仓库体积 | 离线打不开 |
| 升级只改版本号 | 首屏有一瞬间公式"撑开"的抖动 |
| | 读者端必须加载 ~280KB JS |

**本项目不采用这种方式**，但保留说明以便对照。

---

## 3. 接入 KaTeX 方式二：npm 依赖 + 构建期预渲染（推荐）

**思路**：构建时（Node 环境）就把 `$...$` 渲染成排好版的 HTML，读者端不需要任何 JS。

### 3.1 安装依赖

```bash
cd "G:/buddywork/9.7云梦数理小屋"
npm install --registry=https://registry.npmmirror.com
```

只装 KaTeX 的话：

```bash
npm install katex@0.16.11 --registry=https://registry.npmmirror.com
```

### 3.2 渲染核心代码

文件位置：`src/lib/md-math.js`（同时兼容 Node 与浏览器）。关键片段：

```js
const katex = require('katex');

function render(src, display) {
  try {
    return katex.renderToString(src, {
      displayMode: display,
      throwOnError: false,     // 出错不中断构建
      errorColor: '#cc0000',
      strict: 'ignore',
      trust: false,
      output: 'htmlAndMathml', // 想省一半体积可改成 'html'
      macros: { '\\R': '\\mathbb{R}', '\\d': '\\mathrm{d}' }
    });
  } catch (e) {
    return '<code class="katex-error">' + src + '</code>';
  }
}
```

注册到 markdown-it（**顺序是关键**，必须早于 `escape`/`emphasis`）：

```js
md.inline.ruler.before('escape', 'math_inline', mathInline);
md.block.ruler.before('paragraph', 'math_block', mathBlock, {
  alt: ['paragraph', 'reference', 'blockquote', 'list'],
});
```

### 3.3 拷贝 KaTeX 字体（最容易漏的一步）

在 `src/build.js` 中：

```js
const katexDist = path.join(ROOT, 'node_modules', 'katex', 'dist');

// CSS
copyFile(
  path.join(katexDist, 'katex.min.css'),
  path.join(DIST, 'assets', 'css', 'katex.min.css')
);

// 字体：必须与 CSS 同层！
copyDir(
  path.join(katexDist, 'fonts'),
  path.join(DIST, 'assets', 'css', 'fonts'),
  (p) => /\.(woff2?|ttf)$/i.test(p)
);
```

最终产物结构必须是：

```
dist/assets/css/katex.min.css
dist/assets/css/fonts/KaTeX_Main-Regular.woff2
dist/assets/css/fonts/KaTeX_Math-Italic.woff2
dist/assets/css/fonts/…
```

### 3.4 确认字体没被 `.gitignore` 排除

`.gitignore` 里**不要**出现 `*.woff2` 之类的规则，否则字体不会进仓库，线上公式全变方块。

### 3.5 为什么这样产物是"零 JS"

公式在构建期已经变成 HTML，读者端只需要 CSS。打开 `dist/posts/*/index.html` 可以看到：

```html
<span class="katex"><span class="katex-mathml">…</span>…</span>
```

没有任何 `<script>` 调用 KaTeX。

---

## 4. 配置 GitHub Pages

### 4.1 打开设置页

浏览器访问：

```
https://github.com/ClouderDream/math-hut/settings/pages
```

### 4.2 选择部署来源

1. 在 **Build and deployment** → **Source** 处
2. 选 **GitHub Actions**（**不要**选 "Deploy from a branch"）
3. 页面会自动保存

### 4.3 关于 `.nojekyll`

GitHub Pages 默认用 Jekyll 处理站点，会**忽略所有以下划线开头的目录**（例如 `_draft-`）。构建脚本会自动生成空文件 `dist/.nojekyll` 来禁用 Jekyll：

```bash
touch dist/.nojekyll
```

在 Windows 的 Git Bash 里同样有效。

### 4.4 自定义域名（可选）

在 `dist/` 放一个 `CNAME` 文件，内容只有一行域名：

```
blog.example.com
```

然后在域名服务商处添加一条 CNAME 记录指向 `ClouderDream.github.io`。

---

## 5. 配置 GitHub Actions 自动部署

### 5.1 工作流文件

创建文件 `G:/buddywork/9.7云梦数理小屋/.github/workflows/deploy.yml`，内容如下（可直接复制）：

```yaml
# 构建并部署到 GitHub Pages
name: Build & Deploy Pages

on:
  push:
    branches: [main]
  workflow_dispatch:      # 允许在 Actions 页面手动触发

concurrency:
  group: pages
  cancel-in-progress: false

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: 拉取代码
        uses: actions/checkout@v4

      - name: 准备 Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: 安装依赖
        run: npm ci

      - name: 构建静态站点
        run: npm run build

      - name: 生成 .nojekyll
        run: touch dist/.nojekyll

      - name: 配置 Pages
        uses: actions/configure-pages@v5

      - name: 上传产物
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: 部署到 GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 5.2 逐项说明

| 配置 | 作用 |
|---|---|
| `on.push.branches: [main]` | 推到 main 就自动构建部署 |
| `workflow_dispatch` | 可以在 Actions 页面手动点 "Run workflow" |
| `concurrency.group: pages` | 多个部署排队，不互相取消 |
| `permissions.pages: write` | 允许写 Pages |
| `permissions.id-token: write` | OIDC 鉴权，部署动作需要 |
| `node-version: '22'` | 与本地版本保持一致，避免行为差异 |
| `cache: 'npm'` | 缓存依赖，第二次起构建更快（需提交 `package-lock.json`） |
| `path: dist` | 上传构建产物目录 |

### 5.3 触发第一次构建

```bash
git add -A
git commit -m "添加 Pages 部署工作流"
git push
```

然后打开 <https://github.com/ClouderDream/math-hut/actions> 看进度。绿灯之后，回到 Settings → Pages 就能看到网址。

### 5.4 后台用 Token 提交会触发构建吗

**会。** 只有用 Actions 内置的 `GITHUB_TOKEN` 提交才不会触发（防止无限循环）；用个人 PAT 提交是正常触发的——这正是后台能"保存即发布"的原因。

---

## 6. 公式书写与转义规范

### 6.1 在本项目里的写法

行内公式（一个 `$`，紧贴内容）：

```markdown
质能方程 $E = mc^2$ 是狭义相对论的核心结论。
```

行间公式（两个 `$$`，**单独成行**）：

```markdown
$$
\int_0^1 x^2 \, \d x = \frac{1}{3}
$$
```

### 6.2 在 GitHub 网页上预览 Markdown 时

GitHub 自带的 Markdown 渲染用的是 **MathJax**（这一点与本站用的 KaTeX 不同，但基础语法一致）。它支持：

| 写法 | 用途 |
|---|---|
| `$ \sqrt{3x-1} $` | 行内公式 |
| `` $`\sqrt{3x-1}`$ `` | 行内公式（内容含 Markdown 特殊字符时用这个） |
| `$$ ... $$`（另起一行） | 行间公式 |
| ` ```math ` 代码块 | 行间公式（不需要 `$$`） |

**重要区别**：GitHub 网页端会自动渲染公式，但 **GitHub Pages 上你自己生成的站点不会**——Pages 只托管文件，渲染由你的站点代码负责。这也是本项目必须自己接 KaTeX 的原因。

### 6.3 转义注意事项

| 场景 | 错误写法 | 正确写法 |
|---|---|---|
| 美元价格 | `$5 和 $100` | `\$5 和 \$100` |
| 公式里的下划线 | 无需处理（本项目已在 Markdown 层拦截） | `$a_1$` 直接写 |
| 行内公式跨行 | `$a =\` 换行 `b$` | 合并成一行，或改用 `$$` |
| `$` 后有空格 | `$ E = mc^2 $` | `$E = mc^2$` |
| 代码块里的公式 | 会被渲染 | 代码块内不解析公式，原样显示（正常） |

### 6.4 Markdown 先于公式解析

这是所有坑的根源：Markdown 解析器先跑，`_`、`*`、`\` 会被它先吃掉。所以必须在 Markdown 层把 `$...$` 整段保护起来（本项目做法见 3.2），而不是指望 KaTeX 事后补救。

---

## 7. 本地预览与验证

### 7.1 启动本地服务

```bash
cd "G:/buddywork/9.7云梦数理小屋"
npm run dev
```

终端会打印：

```
本地预览：http://localhost:5173/math-hut/
后台入口：http://localhost:5173/math-hut/admin/
```

改 Markdown 保存后会自动重建，刷新浏览器即可。

只想看构建结果、不想监听文件：

```bash
npm run preview      # 端口 4173
```

也可以用 Python 起一个最简单的服务：

```bash
cd "G:/buddywork/9.7云梦数理小屋/dist"
python -m http.server 8000
```

然后访问 <http://localhost:8000/>（**注意**：这种方式没有 base 前缀，链接会 404，只适合看单个文件）。

### 7.2 检查清单

| 检查项 | 怎么验 |
|---|---|
| 字体是否 404 | 浏览器 F12 → Network → 过滤 `woff2`，看有没有 404 |
| 禁用 JS 后公式还在 | 浏览器禁用 JavaScript，刷新，公式应正常显示 |
| 暗色模式下公式可见 | 点右上角切换主题，公式颜色应跟随 |
| 移动端不溢出 | F12 切到手机视图，长公式应可横向滑动 |
| 内容类型正确 | `curl -I http://localhost:4173/math-hut/rss.xml` 应为 `application/xml` |

```bash
curl -I http://localhost:4173/math-hut/rss.xml
curl -I http://localhost:4173/math-hut/search-index.json
```

### 7.3 构建日志里的公式报错

构建结束会打印：

```
[warn] 2 处公式渲染异常（已降级为原文显示，不影响构建）：
  - inline: Undefined control sequence: \foo  <<\foo{x}>>
```

按提示的位置去改对应 Markdown 即可。

---

## 8. 常见问题排查清单

| # | 症状 | 原因 | 解决 |
|---|---|---|---|
| 1 | 公式源码原样显示 | `$` 前后有空格 / 行内公式跨行 / 规则未注册 | 紧贴写；不跨行；确认 `md-math.js` 被 `.use()` |
| 2 | 符号显示成方块 | KaTeX 字体没拷或路径不对 | 确认 `katex.min.css` 与 `fonts/` 同层，字体文件已提交 |
| 3 | `$a_1$` 变成 `a1` 斜体 | 数学规则注册在 `emphasis` 之后 | 改成 `.before('escape', ...)` |
| 4 | 构建报 KaTeX ParseError | 公式里有 KaTeX 不支持的命令 | 查日志定位，换等价写法 |
| 5 | Actions 红（失败） | 缺 `package-lock.json` / Node 版本 / 构建报错 | 提交 lock 文件；看 Actions 日志具体行 |
| 6 | Pages 打开 404 | Source 没选 GitHub Actions，或没跑过 workflow | Settings → Pages → Source 选 Actions；手动 Run workflow |
| 7 | 页面能开但 CSS/JS 404 | `base` 配置与实际路径不符 | 项目站点 `base: '/math-hut/'`；用户主页站 `base: '/'` |
| 8 | 改了内容线上不变 | CDN / 浏览器缓存 | 等 1~3 分钟，Ctrl+F5 强制刷新 |
| 9 | `npm ci` 在 CI 上失败 | lock 文件与 package.json 不一致 | 本地 `npm install` 后重新提交 lock 文件 |
| 10 | 中文章名/标签页 404 | URL 编码问题 | 链接用 `encodeURIComponent`；本机预览确认能打开 |
| 11 | 后台保存报 409 | 远端 `sha` 过期（本地 git 推过） | 刷新列表重新载入文章再改 |
| 12 | 后台报 401 / 403 | Token 过期或权限不足 | 重新生成 Token，确认 Contents 是 Read and write |
| 13 | 后台列表为空 | `postsDir` 路径写错 | 确认 `site.config.js` 的 `admin.postsDir: 'content/posts'` |
| 14 | 文章不出现在列表 | `draft: true`，或文件名以 `_draft-` 开头 | 改成 `false` 或改名 |
| 15 | 分页只有一页 | 文章数 ≤ `postsPerPage` | 调小 `site.postsPerPage` |

---

## 9. 申请后台 Token（Fine-grained PAT）

### 9.1 逐步操作

1. 打开 <https://github.com/settings/personal-access-tokens>
2. 点 **Generate new token**
3. 选 **Fine-grained token**（细粒度，推荐）
4. **Token name**：填 `math-hut-admin`
5. **Expiration**：选 **90 days**（到期需重新生成，更安全）
6. **Repository access**：选 **Only select repositories** → 勾 `math-hut`
7. **Permissions** → 展开 **Repository permissions** → 找到 **Contents** → 设为 **Read and write**
   （**Metadata** 会自动变成 Read-only，保持默认）
8. 点 **Generate token**
9. **立刻复制**那串 `github_pat_...`（关闭页面后不再显示）

### 9.2 填入后台

访问 `https://ClouderDream.github.io/math-hut/admin/`，两个输入框：

- 管理口令：你用 `npm run hash-password` 设置的那个
- GitHub Token：刚复制的 `github_pat_...`

### 9.3 本地生成口令哈希

```bash
cd "G:/buddywork/9.7云梦数理小屋"
npm run hash-password 你想用的口令
```

把输出的 `passHash` / `passSalt` 两行填进 `site.config.js` 的 `admin` 段，重新构建部署。

### 9.4 泄露处置

Token 等同于仓库写权限。怀疑泄露时立刻到 <https://github.com/settings/personal-access-tokens> 点 **Revoke**。

> 提醒：后台口令的哈希写在公开的 JS 里，只能防止误操作，**不构成安全边界**。

---

## 10. 上线验收清单

在线上地址 <https://ClouderDream.github.io/math-hut/> 逐项确认：

- [ ] 首页能打开，显示 4 篇文章 + 分页（第 1 页 / 第 2 页）
- [ ] 点进任意文章，标题、日期、阅读时长、标签正常
- [ ] 行内公式与行间公式都正常渲染，无红字、无方块
- [ ] 代码块有语言标签、行号，"复制"按钮可用
- [ ] 右侧目录能点击跳转，滚动时高亮跟随
- [ ] 文章底部的上一篇/下一篇链接正确
- [ ] `/tags/` 显示 10 个标签及数量，点进去能看到对应文章
- [ ] `/archive/` 按年份分组正确
- [ ] `/about/` 正常显示
- [ ] 搜索页输入「特征值」「薛定谔」能出结果
- [ ] 右上角切换明暗主题，刷新后保持选择，无白屏闪烁
- [ ] 手机宽度下：菜单能展开、目录折叠、长公式可横向滑动
- [ ] `/admin/` 能登录，新建一篇文章保存后约 2 分钟线上出现
- [ ] `/rss.xml`、`/sitemap.xml` 能打开
- [ ] 浏览器 F12 控制台无 404

---

## 11. 把本文导出为 PDF

### 11.1 用 pandoc（需要装 LaTeX 发行版）

```bash
cd "G:/buddywork/9.7云梦数理小屋/docs"
pandoc "GitHub部署与KaTeX接入指南.md" ^
  -o "GitHub部署与KaTeX接入指南.pdf" ^
  --pdf-engine=xelatex ^
  -V CJKmainfont="Microsoft YaHei" ^
  -V geometry:margin=2.5cm ^
  -V fontsize=11pt ^
  --toc --toc-depth=2 ^
  -V colorlinks=true
```

Git Bash 里把 `^` 换成 `\`。

### 11.2 用 Typora（最简单）

1. 用 Typora 打开本文
2. 文件 → 导出 → PDF
3. 主题选 GitHub 或自定义学术风

### 11.3 用 VS Code 插件

1. 安装插件 **Markdown Preview Enhanced**
2. 打开本文，`Ctrl+Shift+P` → `Markdown Preview Enhanced: Export to PDF`
3. 首次使用会提示安装 Chromium 依赖，按提示确认

---

> 本文档随项目维护。发现问题或有更好的做法，欢迎在仓库提 Issue。
